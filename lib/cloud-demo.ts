import { createHash } from "node:crypto";
import { DEMO_GOLDEN_REPLAY, goldenKey } from "./golden-replay";

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

const RWA_COPY: Record<
  CloudScenario,
  { vertical: string; title: string; description: string }
> = {
  BASE_REPLAY: {
    vertical: "invoice",
    title: "Invoice / receivables financing",
    description: "Steady attested payment history with no counterfactual shock.",
  },
  RATE_SHOCK: {
    vertical: "solar",
    title: "Solar lease cash-flow",
    description: "Revenue-backed LTV; a rate shock reduces effective coverage.",
  },
  MISSED_PAYMENT: {
    vertical: "invoice",
    title: "Invoice / receivables financing",
    description: "Late receivable stream with a missed-installment counterfactual.",
  },
  HAZARD: {
    vertical: "parametric",
    title: "Parametric insurance",
    description: "Attested hazard history with a strong shock scenario.",
  },
};

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

/** keccak256(utf8("1:" + demoTx)) — matches worker assetIdFromSourceEvent. */
const DEMO_ASSET_ID =
  "0x2c6ae26f6815fec41e08a51d8a8ad5c1bebfccc43bcfc04222671fac083d9512";

export function cloudDemoRun(body: CloudRunRequest) {
  const graph: "demo" | "full" = body.graph === "full" ? "full" : "demo";

  if (graph === "full") {
    const error = new Error(
      "Full MaleCNS replay requires the Python worker. Use the hosted worker API or run locally.",
    );
    (error as Error & { status?: number }).status = 501;
    throw error;
  }

  const scenarioType = (body.scenario || "BASE_REPLAY") as CloudScenario;
  const magnitude = scenarioMagnitude(scenarioType, body.magnitude);
  const golden = DEMO_GOLDEN_REPLAY[goldenKey(scenarioType, magnitude)];

  if (!golden) {
    const error = new Error(
      `No golden replay for ${scenarioType} magnitude=${magnitude}. Run the worker for custom parameters.`,
    );
    (error as Error & { status?: number }).status = 400;
    throw error;
  }

  const copy = RWA_COPY[scenarioType];
  const scenarioHash = sha256(
    JSON.stringify({ scenarioType, magnitude, horizon: 12 }),
  );

  return {
    mode: graph,
    scenarioType,
    magnitude,
    assetId: DEMO_ASSET_ID,
    sourceEvent: DEMO_SOURCE_EVENT,
    attestation: {
      verified: false,
      skipped: true,
      error: "Cloud fallback uses synthetic demo tx; connect worker for live Attestcoin verify.",
    },
    rwaVertical: copy.vertical,
    rwaTitle: copy.title,
    rwaDescription: copy.description,
    graphHash: GRAPH_HASH,
    neuronCount: 512,
    edgeCount: 2048,
    motorAxis: golden.motorAxis,
    action: golden.action,
    replayHash: golden.replayHash,
    scenarioHash,
    writability: {
      available: false,
      mode: "relayer-bridge",
      destination: "Ethereum Sepolia RwaAction",
      note: "Cloud fallback is read-only; commit/relay require the worker backend.",
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
      "On-chain write-back requires the full worker (set COUNTERFLY_API_ORIGIN or run locally).",
  };
}

export function cloudCapabilities() {
  return {
    source: "cloud-fallback" as const,
    pipeline: "replay-only" as const,
    features: {
      liveAttest: false,
      malecnsFull: false,
      onChainCommit: false,
      onChainRelay: false,
    },
    message:
      "Cloud fallback: deterministic demo replay only. Point Vercel COUNTERFLY_API_ORIGIN at your worker :8786 for the full Attest → Commit → Relay path.",
  };
}

export function cloudAttestStatus() {
  return {
    event: DEMO_SOURCE_EVENT,
    verified: false,
    skipped: true,
    error: "Use worker /api/attest for live BlockProver verification.",
  };
}
