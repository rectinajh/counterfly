import { Contract, JsonRpcProvider, Wallet, ethers } from "ethers";
import { config } from "./config";
import type { ScenarioInput } from "./scenario";

const ASC_ABI = [
  "function registerVerifiedSource(bytes32 assetId, bytes32 verifiedSourceTx) external",
  "function submitScenario((bytes32 assetId,bytes32 historyMerkleRoot,bytes32 scenarioHash,uint256 timestamp,bytes32 verifiedSourceTx) s) external",
  "function scenarios(bytes32) view returns ((bytes32 assetId,bytes32 historyMerkleRoot,bytes32 scenarioHash,uint256 timestamp,bytes32 verifiedSourceTx))",
] as const;

function toBytes32(value: string): string {
  return value.startsWith("0x") ? value : `0x${value}`;
}

function sourceTxBytes32(txHash: string): string {
  return toBytes32(txHash);
}

export async function ensureScenarioOnAsc(scenario: ScenarioInput): Promise<void> {
  if (!config.privateKey || !config.counterflyAscAddress) {
    return;
  }

  const provider = new JsonRpcProvider(config.cc3Rpc);
  const wallet = new Wallet(config.privateKey, provider);
  const asc = new Contract(config.counterflyAscAddress, ASC_ABI, wallet);

  const existing = await asc.scenarios(scenario.assetId);
  const existingHash = String(existing.scenarioHash);
  if (existingHash !== ethers.ZeroHash) {
    return;
  }

  const verifiedSourceTx = sourceTxBytes32(scenario.sourceEvent.txHash);

  const registered = String(existing.verifiedSourceTx);
  if (registered === ethers.ZeroHash) {
    const reg = await asc.registerVerifiedSource(scenario.assetId, verifiedSourceTx);
    await reg.wait();
  }

  const payload = {
    assetId: toBytes32(scenario.assetId),
    historyMerkleRoot: toBytes32(scenario.historyMerkleRoot),
    scenarioHash: toBytes32(scenario.scenarioHash),
    timestamp: BigInt(Math.floor(Date.now() / 1000)),
    verifiedSourceTx,
  };

  const tx = await asc.submitScenario(payload);
  await tx.wait();
}
