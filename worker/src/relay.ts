import { Contract, JsonRpcProvider, Wallet } from "ethers";
import { config } from "./config";

const ASC_ABI = [
  "function latestDecision(bytes32) view returns ((bytes32 assetId,bytes32 replayHash,uint8 action,uint256 newLtvBps,uint256 nonce))",
] as const;

const RWA_ABI = [
  "function adjustLtv(bytes32,uint256)",
  "function requestLiquidation(bytes32)",
  "function liquidated(bytes32) view returns (bool)",
] as const;

async function main() {
  const assetArg = process.argv.find((a) => a.startsWith("--asset="));
  if (!assetArg) {
    throw new Error("usage: npm run relay -w @counterfly/worker -- --asset=0x...");
  }

  const assetId = assetArg.split("=")[1];
  if (!config.privateKey || !config.counterflyAscAddress || !config.rwaActionAddress) {
    throw new Error("missing PRIVATE_KEY or contract addresses in .env");
  }

  const cc3 = new JsonRpcProvider(config.cc3Rpc);
  const sepolia = new JsonRpcProvider(config.sepoliaRpc);
  const asc = new Contract(config.counterflyAscAddress, ASC_ABI, cc3);

  const decision = await asc.latestDecision(assetId);
  const action = Number(decision.action);
  const newLtvBps = decision.newLtvBps.toString();

  console.log(
    `Decision: action=${action} newLtvBps=${newLtvBps} replayHash=${decision.replayHash}`,
  );

  if (action === 0) {
    console.log("HOLD: no cross-chain action required.");
    return;
  }

  const wallet = new Wallet(config.privateKey, sepolia);
  const rwaAction = new Contract(config.rwaActionAddress, RWA_ABI, wallet);

  if (action === 2) {
    const tx = await rwaAction.requestLiquidation(assetId);
    const receipt = await tx.wait();
    console.log(`LIQUIDATE requested on Sepolia: ${receipt?.hash}`);
  } else if (action === 1) {
    const tx = await rwaAction.adjustLtv(assetId, decision.newLtvBps);
    const receipt = await tx.wait();
    console.log(`ADJUST_LTV ${newLtvBps} on Sepolia: ${receipt?.hash}`);
  } else if (action === 3) {
    console.log("PAY_OUT: payout release is not implemented in the RwaAction demo.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
