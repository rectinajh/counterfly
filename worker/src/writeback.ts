import { Contract, JsonRpcProvider, Wallet, ethers } from "ethers";
import { config } from "./config";

const ASC_ABI = [
  "function commitDecision((bytes32 assetId,bytes32 replayHash,uint8 action,uint256 newLtvBps,uint256 nonce) d, bytes signature) external",
  "function latestDecision(bytes32) view returns ((bytes32 assetId,bytes32 replayHash,uint8 action,uint256 newLtvBps,uint256 nonce))",
] as const;

const RWA_ABI = [
  "function adjustLtv(bytes32,uint256)",
  "function requestLiquidation(bytes32)",
  "function ltvBps(bytes32) view returns (uint256)",
  "function liquidated(bytes32) view returns (bool)",
] as const;

export interface AscDecision {
  replayHash: string;
  action: number;
  newLtvBps: string;
  nonce: string;
}

export interface WritebackStatus {
  assetId: string | null;
  configured: boolean;
  committed: boolean;
  commitTx?: string;
  relayTx?: string;
  ascDecision?: AscDecision;
  rwaLtvBps?: string;
  rwaLiquidated?: boolean;
  error?: string;
}

function toBytes32(value: string): string {
  return value.startsWith("0x") ? value : `0x${value}`;
}

function actionToLtvBps(action: number): bigint {
  if (action === 2) {
    return 0n; // LIQUIDATE
  }
  if (action === 1) {
    return 6000n; // ADJUST_LTV
  }
  return 7500n; // HOLD
}

function hasWriteConfig(): boolean {
  return Boolean(
    config.privateKey &&
      config.workerAddress &&
      config.relayerAddress &&
      config.counterflyAscAddress &&
      config.rwaActionAddress,
  );
}

function requireWriteConfig() {
  if (!hasWriteConfig()) {
    throw new Error(
      "Write-back is not configured. Set PRIVATE_KEY, WORKER_ADDRESS, RELAYER_ADDRESS, COUNTERFLY_ASC_ADDRESS, and RWA_ACTION_ADDRESS in .env.",
    );
  }
}

export async function readWritebackStatus(
  assetId: string | null,
): Promise<WritebackStatus> {
  const status: WritebackStatus = {
    assetId,
    configured: hasWriteConfig(),
    committed: false,
  };

  if (!assetId) {
    return status;
  }

  if (!config.counterflyAscAddress || !config.rwaActionAddress) {
    status.error = "ASC or RwaAction contract address is not configured.";
    return status;
  }

  try {
    const cc3 = new JsonRpcProvider(config.cc3Rpc);
    const asc = new Contract(config.counterflyAscAddress, ASC_ABI, cc3);
    const decision = await asc.latestDecision(assetId);
    const replayHash = String(decision.replayHash);

    if (replayHash !== ethers.ZeroHash) {
      status.committed = true;
      status.ascDecision = {
        replayHash,
        action: Number(decision.action),
        newLtvBps: decision.newLtvBps.toString(),
        nonce: decision.nonce.toString(),
      };
    }

    const sepolia = new JsonRpcProvider(config.sepoliaRpc);
    const rwa = new Contract(config.rwaActionAddress, RWA_ABI, sepolia);
    status.rwaLtvBps = (await rwa.ltvBps(assetId)).toString();
    status.rwaLiquidated = Boolean(await rwa.liquidated(assetId));
  } catch (error) {
    status.error = error instanceof Error ? error.message : "write-back read failed";
  }

  return status;
}

export async function commitDecisionOnChain(input: {
  assetId: string;
  replayHash: string;
  action: number;
}): Promise<{ txHash: string; newLtvBps: string }> {
  requireWriteConfig();

  const provider = new JsonRpcProvider(config.cc3Rpc);
  const wallet = new Wallet(config.privateKey, provider);

  if (
    config.workerAddress &&
    wallet.address.toLowerCase() !== config.workerAddress.toLowerCase()
  ) {
    throw new Error(
      `PRIVATE_KEY derives ${wallet.address}, but WORKER_ADDRESS is ${config.workerAddress}.`,
    );
  }

  const contract = new Contract(config.counterflyAscAddress, ASC_ABI, wallet);
  const value = {
    assetId: toBytes32(input.assetId),
    replayHash: toBytes32(input.replayHash),
    action: input.action,
    newLtvBps: actionToLtvBps(input.action),
    nonce: BigInt(Date.now()),
  };

  const domain = {
    name: "CounterflyASC",
    version: "1",
    chainId: Number((await provider.getNetwork()).chainId),
    verifyingContract: config.counterflyAscAddress,
  };

  const types = {
    Decision: [
      { name: "assetId", type: "bytes32" },
      { name: "replayHash", type: "bytes32" },
      { name: "action", type: "uint8" },
      { name: "newLtvBps", type: "uint256" },
      { name: "nonce", type: "uint256" },
    ],
  };

  const signature = await wallet.signTypedData(domain, types, value);
  const tx = await contract.commitDecision(value, signature);
  const receipt = await tx.wait();

  return { txHash: receipt.hash, newLtvBps: value.newLtvBps.toString() };
}

export async function relayDecisionOnChain(assetId: string): Promise<{
  txHash?: string;
  action: number;
  newLtvBps: string;
}> {
  requireWriteConfig();

  const cc3 = new JsonRpcProvider(config.cc3Rpc);
  const asc = new Contract(config.counterflyAscAddress, ASC_ABI, cc3);
  const decision = await asc.latestDecision(assetId);
  const replayHash = String(decision.replayHash);

  if (replayHash === ethers.ZeroHash) {
    throw new Error("No decision has been committed to the ASC for this asset.");
  }

  const action = Number(decision.action);
  const newLtvBps = decision.newLtvBps.toString();

  if (action === 0) {
    return { action, newLtvBps };
  }

  const sepolia = new JsonRpcProvider(config.sepoliaRpc);
  const wallet = new Wallet(config.privateKey, sepolia);

  if (
    config.relayerAddress &&
    wallet.address.toLowerCase() !== config.relayerAddress.toLowerCase()
  ) {
    throw new Error(
      `PRIVATE_KEY derives ${wallet.address}, but RELAYER_ADDRESS is ${config.relayerAddress}.`,
    );
  }

  const rwa = new Contract(config.rwaActionAddress, RWA_ABI, wallet);

  let tx;
  if (action === 2) {
    tx = await rwa.requestLiquidation(assetId);
  } else if (action === 1) {
    tx = await rwa.adjustLtv(assetId, decision.newLtvBps);
  } else if (action === 3) {
    throw new Error("PAY_OUT is not implemented in the RwaAction demo.");
  } else {
    throw new Error(`Unsupported action: ${action}`);
  }

  const receipt = await tx.wait();
  return { txHash: receipt.hash, action, newLtvBps };
}
