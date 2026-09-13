import { readFileSync } from "node:fs";
import path from "node:path";
import { attestSepoliaEvent, type AttestationResult } from "./attest";
import { runFly } from "./flyRunner";
import {
  assetIdFromSourceEvent,
  buildScenario,
  type Counterfactual,
  type ScenarioInput,
} from "./scenario";
import { presetForScenario } from "./rwaPresets";
import { sourceEventForGraph } from "./sourceEvent";
import { WRITABILITY_STATUS } from "./writability";
import type { FlyOutput } from "./flyRunner";

export interface RunPipelineInput {
  graph: "demo" | "full";
  counterfactual: Counterfactual;
  seed?: number;
  /** When true, always run Attestcoin verify for non-synthetic txs. */
  attest?: boolean;
}

export interface RunPipelineResult {
  mode: "demo" | "full";
  scenarioType: Counterfactual["type"];
  magnitude: number;
  assetId: string;
  sourceEvent: ScenarioInput["sourceEvent"];
  attestation: AttestationResult;
  rwaVertical: string;
  rwaTitle: string;
  rwaDescription: string;
  graphHash: string;
  neuronCount: number;
  edgeCount: number;
  motorAxis: number;
  action: number;
  replayHash: string;
  scenarioHash: string;
  scenario: ScenarioInput;
  output: FlyOutput;
  writability: typeof WRITABILITY_STATUS;
  timestamp: string;
}

export function graphCounts(graph: "demo" | "full"): {
  neuronCount: number;
  edgeCount: number;
} {
  if (graph === "demo") {
    return { neuronCount: 512, edgeCount: 2048 };
  }
  try {
    const metaPath = path.resolve(__dirname, "../fly/data/malecns_v1.meta.json");
    const meta = JSON.parse(readFileSync(metaPath, "utf8")) as {
      neuron_count: number;
      edge_count: number;
    };
    return {
      neuronCount: Number(meta.neuron_count),
      edgeCount: Number(meta.edge_count),
    };
  } catch {
    return { neuronCount: 166700, edgeCount: 25582938 };
  }
}

export async function runPipeline(input: RunPipelineInput): Promise<RunPipelineResult> {
  const graph = input.graph === "full" ? "full" : "demo";
  const seed = input.seed ?? 0;
  const template = sourceEventForGraph(graph);
  const attest = input.attest !== false;

  let attestation: AttestationResult;
  if (attest) {
    attestation = await attestSepoliaEvent(template.txHash);
    if (!attestation.verified && !attestation.skipped) {
      throw new Error(attestation.error ?? "Attestcoin verification failed");
    }
  } else {
    attestation = {
      event: template,
      verified: false,
      skipped: true,
    };
  }

  const verifiedEvent = attestation.event;
  const preset = presetForScenario(input.counterfactual.type);
  const assetId = assetIdFromSourceEvent(verifiedEvent);
  const scenario = buildScenario({
    assetId,
    sourceEvent: verifiedEvent,
    counterfactual: input.counterfactual,
    history: preset.history,
  });

  const output = await runFly(scenario, seed, graph);
  scenario.scenarioHash = output.scenarioHash;

  const counts = graphCounts(graph);

  return {
    mode: graph,
    scenarioType: input.counterfactual.type,
    magnitude: input.counterfactual.magnitude,
    assetId,
    sourceEvent: scenario.sourceEvent,
    attestation,
    rwaVertical: preset.vertical,
    rwaTitle: preset.title,
    rwaDescription: preset.description,
    graphHash: output.graphHash,
    neuronCount: counts.neuronCount,
    edgeCount: counts.edgeCount,
    motorAxis: output.motorAxis,
    action: output.action,
    replayHash: output.replayHash,
    scenarioHash: output.scenarioHash,
    scenario,
    output,
    writability: WRITABILITY_STATUS,
    timestamp: new Date().toISOString(),
  };
}
