import { createHash } from "node:crypto";

export type CloudScenario =
  | "BASE_REPLAY"
  | "RATE_SHOCK"
  | "MISSED_PAYMENT"
  | "HAZARD";

export interface CloudRunRequest {
  graph?: "demo" | "full";
  scenario?: string;
  magnitude?: number;
}

const DEMO_SOURCE_EVENT = {
  txHash: `0x${"a".repeat(64)}`,
  blockNumber: 12345678,
  eventType: "PAYMENT",
};

const GRAPH_HASH = createHash("sha256")
  .update("counterfly-demo-pruned:512:2048")
  .digest("hex");

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function scenarioMagnitude(
  scenario: CloudScenario,
  magnitude: number | undefined,
): number {
  if (typeof magnitude === "number") {
    return Math.max(-1, Math.min(1, magnitude));
  }

  if (scenario === "RATE_SHOCK") {
    return 0.2;
  }
  if (scenario === "MISSED_PAYMENT") {
    return 0.5;
  }
  if (scenario === "HAZARD") {
    return 0.8;
  }
  return 0;
}

function motorAxis(scenario: CloudScenario, magnitude: number): number {
  const base: Record<CloudScenario, number> = {
    BASE_REPLAY: 0.7,
    RATE_SHOCK: 0.7,
    MISSED_PAYMENT: 0.58,
    HAZARD: 0.46,
  };

  const sensitivity: Record<CloudScenario, number> = {
    BASE_REPLAY: 0,
    RATE_SHOCK: 0.42,
    MISSED_PAYMENT: 0.28,
    HAZARD: 0.18,
  };

  const axis = base[scenario] - sensitivity[scenario] * magnitude;
  return Number(Math.max(0, Math.min(1, axis)).toFixed(6));
}

function actionFor(scenario: CloudScenario, axis: number): number {
  if (scenario === "HAZARD" && axis < 0.4) {
    return 3; // PAY_OUT
  }
  if (axis >= 0.65) {
    return 0; // HOLD
  }
  if (axis >= 0.4) {
    return 1; // ADJUST_LTV
  }
  return 2; // LIQUIDATE
}

export function cloudDemoRun(body: CloudRunRequest) {
  const graph: "demo" | "full" = body.graph === "full" ? "full" : "demo";

  if (graph === "full") {
    const error = new Error(
      "Full MaleCNS replay is not available in the Vercel cloud preview. Run the worker locally or deploy it to a Python-capable host.",
    );
    (error as Error & { status?: number }).status = 501;
    throw error;
  }

  const scenarioType = (body.scenario || "BASE_REPLAY") as CloudScenario;
  const magnitude = scenarioMagnitude(scenarioType, body.magnitude);
  const axis = motorAxis(scenarioType, magnitude);
  const action = actionFor(scenarioType, axis);

  const assetId = sha256(
    `${DEMO_SOURCE_EVENT.blockNumber}:${DEMO_SOURCE_EVENT.txHash}`,
  );
  const scenarioHash = sha256(
    JSON.stringify({ scenarioType, magnitude, horizon: 12 }),
  );
  const replayHash = sha256(
    `${GRAPH_HASH}:${scenarioHash}:${axis.toFixed(6)}:${action}`,
  );

  return {
    mode: graph,
    scenarioType,
    magnitude,
    assetId: `0x${assetId}`,
    sourceEvent: DEMO_SOURCE_EVENT,
    graphHash: GRAPH_HASH,
    neuronCount: 512,
    edgeCount: 2048,
    motorAxis: axis,
    action,
    replayHash,
    scenarioHash,
    writability: {
      available: false,
      mode: "relayer-bridge",
      destination: "Ethereum Sepolia RwaAction",
      note: "Cloud preview runs the deterministic demo engine only; write-back is disabled.",
    },
    timestamp: new Date().toISOString(),
  };
}

export function cloudWritebackStatus(assetId: string | null) {
  return {
    assetId,
    configured: false,
    committed: false,
    rwaLtvBps: "0",
    rwaLiquidated: false,
    error:
      "On-chain write-back is not available in the Vercel cloud preview.",
  };
}
