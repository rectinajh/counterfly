import { config } from "./config";
import { verifySepoliaEvent } from "./attest";
import type { Counterfactual } from "./scenario";
import { runPipeline } from "./pipeline";
import { commitDecision } from "./commit";
import { ensureScenarioOnAsc } from "./ascSubmit";

async function main() {
  const args = process.argv.slice(2);
  const isDemo = args.includes("--demo") || config.demo;
  const txArg = args.find((a) => a.startsWith("0x") && a.length === 66);
  const nonceArg = args.find((a) => a.startsWith("--nonce="));
  const nonce = nonceArg ? BigInt(nonceArg.split("=")[1]) : 0n;
  const scenarioType =
    args.find((a) => a.startsWith("--scenario="))?.split("=")[1] ?? "BASE_REPLAY";
  const magnitudeArg = args.find((a) => a.startsWith("--magnitude="));
  const magnitude = magnitudeArg
    ? parseFloat(magnitudeArg.split("=")[1])
    : scenarioType === "RATE_SHOCK"
      ? 0.2
      : 0;
  const graphArg =
    args.find((a) => a.startsWith("--graph="))?.split("=")[1] ??
    (isDemo ? "demo" : "full");

  const counterfactual: Counterfactual = {
    type: scenarioType as Counterfactual["type"],
    magnitude,
    horizon: 12,
  };

  if (!isDemo && txArg) {
    await verifySepoliaEvent(txArg);
    console.log(`Attestcoin verified source tx ${txArg}`);
  }

  const result = await runPipeline({
    graph: graphArg as "demo" | "full",
    counterfactual,
    seed: 0,
    attest: !isDemo || graphArg === "full",
  });

  console.log(JSON.stringify({ assetId: result.assetId, scenario: result.scenario, output: result.output, attestation: result.attestation }, null, 2));

  if (isDemo) {
    console.log("Demo mode: skipping on-chain commit.");
  } else {
    await ensureScenarioOnAsc(result.scenario);
    const txHash = await commitDecision(result.scenario, result.output, nonce);
    if (txHash) {
      console.log(`Decision committed: ${txHash}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
