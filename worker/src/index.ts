import { config } from "./config";
import { verifySepoliaEvent, type VerifiedEvent } from "./attest";
import { assetIdFromSourceEvent, buildScenario, type Counterfactual } from "./scenario";
import { runFly } from "./flyRunner";
import { commitDecision } from "./commit";

const DEMO_EVENT: VerifiedEvent = {
  txHash: `0x${"a".repeat(64)}`,
  blockNumber: 12345678,
  chainKey: 1,
  eventType: "PAYMENT",
};

async function main() {
  const args = process.argv.slice(2);
  const isDemo = args.includes("--demo") || config.demo;
  const txArg = args.find((a) => a.startsWith("0x"));
  const nonceArg = args.find((a) => a.startsWith("--nonce="));
  const nonce = nonceArg ? BigInt(nonceArg.split("=")[1]) : 0n;
  const scenarioType =
    args.find((a) => a.startsWith("--scenario="))?.split("=")[1] ?? "BASE_REPLAY";
  const graphArg =
    args.find((a) => a.startsWith("--graph="))?.split("=")[1] ??
    (isDemo ? "demo" : "full");

  const counterfactual: Counterfactual =
    scenarioType === "RATE_SHOCK"
      ? { type: "RATE_SHOCK", magnitude: 0.2, horizon: 12 }
      : { type: "BASE_REPLAY", magnitude: 0, horizon: 12 };

  let verified: VerifiedEvent;
  if (isDemo) {
    verified = DEMO_EVENT;
    console.log("Demo mode: using a synthetic Sepolia payment event.");
  } else {
    if (!txArg) {
      throw new Error(
        "Usage: npm run run -- 0x<sepolia-tx-hash> [--scenario=BASE_REPLAY|RATE_SHOCK]",
      );
    }
    verified = await verifySepoliaEvent(txArg);
  }

  const assetId = assetIdFromSourceEvent(verified);
  const scenario = buildScenario({ assetId, sourceEvent: verified, counterfactual });
  const output = await runFly(scenario, 0, graphArg);
  scenario.scenarioHash = output.scenarioHash;

  console.log(JSON.stringify({ assetId, scenario, output }, null, 2));

  if (isDemo) {
    console.log("Demo mode: skipping on-chain commit.");
  } else {
    const txHash = await commitDecision(scenario, output, nonce);
    if (txHash) {
      console.log(`Decision committed: ${txHash}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
