import { Contract, JsonRpcProvider, Wallet } from "ethers";
import { config } from "./config";
import type { ScenarioInput } from "./scenario";
import type { FlyOutput } from "./flyRunner";

const COUNTERFLY_ABI = [
  "function commitDecision((bytes32 assetId,bytes32 replayHash,uint8 action,uint256 newLtvBps,uint256 nonce) d, bytes signature) external",
  "event DecisionCommitted(bytes32 indexed assetId, bytes32 replayHash, uint8 action)",
] as const;

export interface DecisionValue {
  assetId: string;
  replayHash: string;
  action: number;
  newLtvBps: bigint;
  nonce: bigint;
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

export async function commitDecision(
  scenario: ScenarioInput,
  output: FlyOutput,
  nonce: bigint,
): Promise<string | null> {
  if (!config.privateKey || !config.counterflyAscAddress) {
    console.warn(
      "Skipping on-chain commit: PRIVATE_KEY or COUNTERFLY_ASC_ADDRESS is missing.",
    );
    return null;
  }

  const provider = new JsonRpcProvider(config.cc3Rpc);
  const wallet = new Wallet(config.privateKey, provider);
  const contract = new Contract(config.counterflyAscAddress, COUNTERFLY_ABI, wallet);

  const value: DecisionValue = {
    assetId: scenario.assetId,
    replayHash: output.replayHash,
    action: output.action,
    newLtvBps: actionToLtvBps(output.action),
    nonce,
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

  return receipt?.hash ?? null;
}
