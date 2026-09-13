import { createServer } from "node:http";
import { runPipeline } from "./pipeline";
import {
  commitDecisionOnChain,
  readWritebackStatus,
  relayDecisionOnChain,
} from "./writeback";
import type { Counterfactual } from "./scenario";
import { attestSepoliaEvent } from "./attest";
import { VERIFIED_SEPOLIA_PAYMENT } from "./sourceEvent";
import { getPipelineCapabilities } from "./capabilities";

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || "0.0.0.0";

interface RunRequest {
  graph?: "demo" | "full";
  scenario?: string;
  magnitude?: number;
}

let latest: unknown = null;

type TimelineType = "attest" | "replay" | "commit" | "relay";

interface TimelineEvent {
  id: string;
  type: TimelineType;
  timestamp: string;
  assetId: string;
  action: number;
  graph: "demo" | "full";
  txHash?: string;
  chain?: "cc3" | "sepolia";
  detail: string;
}

const timeline: TimelineEvent[] = [];

function pushTimeline(event: Omit<TimelineEvent, "id" | "timestamp">) {
  timeline.push({
    ...event,
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp: new Date().toISOString(),
  });
}

function latestDecision() {
  if (!latest || typeof latest !== "object") {
    return null;
  }

  const candidate = latest as {
    assetId?: unknown;
    replayHash?: unknown;
    action?: unknown;
    scenario?: unknown;
  };

  if (
    typeof candidate.assetId !== "string" ||
    typeof candidate.replayHash !== "string" ||
    typeof candidate.action !== "number"
  ) {
    return null;
  }

  return {
    assetId: candidate.assetId,
    replayHash: candidate.replayHash,
    action: candidate.action,
    scenario: candidate.scenario,
  };
}

function currentGraph(): "demo" | "full" {
  if (latest && typeof latest === "object") {
    const mode = (latest as { mode?: unknown }).mode;
    if (mode === "full") {
      return "full";
    }
  }
  return "demo";
}

async function handleRun(body: RunRequest) {
  const graph: "demo" | "full" = body.graph === "full" ? "full" : "demo";
  const scenarioType = body.scenario || "BASE_REPLAY";
  const magnitude =
    typeof body.magnitude === "number"
      ? body.magnitude
      : scenarioType === "RATE_SHOCK"
        ? 0.2
        : 0;

  const counterfactual: Counterfactual = {
    type: scenarioType as Counterfactual["type"],
    magnitude,
    horizon: 12,
  };

  const result = await runPipeline({ graph, counterfactual, seed: 0, attest: true });

  if (result.attestation.verified) {
    pushTimeline({
      type: "attest",
      assetId: result.assetId,
      action: result.action,
      graph,
      detail: `BlockProver verified Sepolia tx @ block ${result.sourceEvent.blockNumber}`,
    });
  }

  latest = {
    mode: result.mode,
    scenarioType: result.scenarioType,
    magnitude: result.magnitude,
    assetId: result.assetId,
    sourceEvent: result.sourceEvent,
    attestation: {
      verified: result.attestation.verified,
      skipped: result.attestation.skipped,
      headerNumber: result.attestation.headerNumber,
      error: result.attestation.error,
    },
    rwaVertical: result.rwaVertical,
    rwaTitle: result.rwaTitle,
    rwaDescription: result.rwaDescription,
    graphHash: result.graphHash,
    neuronCount: result.neuronCount,
    edgeCount: result.edgeCount,
    motorAxis: result.motorAxis,
    action: result.action,
    replayHash: result.replayHash,
    scenarioHash: result.scenarioHash,
    scenario: result.scenario,
    writability: result.writability,
    timestamp: result.timestamp,
  };

  pushTimeline({
    type: "replay",
    assetId: result.assetId,
    action: result.action,
    graph,
    detail: `${scenarioType} magnitude=${magnitude} · ${result.rwaTitle}`,
  });

  return latest;
}

const server = createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || "/", "http://localhost");

  try {
    if (req.method === "GET" && url.pathname === "/api/capabilities") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(getPipelineCapabilities()));
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/state") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(latest));
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/timeline") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ events: timeline }));
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/attest") {
      const tx =
        url.searchParams.get("txHash") ?? VERIFIED_SEPOLIA_PAYMENT.txHash;
      const attestation = await attestSepoliaEvent(tx);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(attestation));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/run") {
      let raw = "";
      for await (const chunk of req) {
        raw += chunk;
      }
      const body = JSON.parse(raw || "{}") as RunRequest;
      const result = await handleRun(body);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/writeback") {
      const decision = latestDecision();
      const assetId = url.searchParams.get("assetId") ?? decision?.assetId ?? null;
      const status = await readWritebackStatus(assetId);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(status));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/commit") {
      const decision = latestDecision();
      if (!decision) {
        res.writeHead(409, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Run a replay before committing." }));
        return;
      }

      let raw = "";
      for await (const chunk of req) {
        raw += chunk;
      }
      const body = JSON.parse(raw || "{}") as {
        assetId?: string;
        replayHash?: string;
        action?: number;
      };

      const result = await commitDecisionOnChain({
        assetId: body.assetId ?? decision.assetId,
        replayHash: body.replayHash ?? decision.replayHash,
        action: typeof body.action === "number" ? body.action : decision.action,
        scenario:
          decision.scenario && typeof decision.scenario === "object"
            ? (decision.scenario as import("./scenario").ScenarioInput)
            : undefined,
      });

      pushTimeline({
        type: "commit",
        assetId: body.assetId ?? decision.assetId,
        action: typeof body.action === "number" ? body.action : decision.action,
        graph: currentGraph(),
        txHash: result.txHash,
        chain: "cc3",
        detail: `newLtvBps=${result.newLtvBps}`,
      });

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/relay") {
      const decision = latestDecision();
      if (!decision) {
        res.writeHead(409, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Run a replay before relaying." }));
        return;
      }

      let raw = "";
      for await (const chunk of req) {
        raw += chunk;
      }
      const body = JSON.parse(raw || "{}") as { assetId?: string };

      const result = await relayDecisionOnChain(body.assetId ?? decision.assetId);

      pushTimeline({
        type: "relay",
        assetId: body.assetId ?? decision.assetId,
        action: result.action,
        graph: currentGraph(),
        txHash: result.txHash,
        chain: result.txHash ? "sepolia" : undefined,
        detail: result.txHash
          ? `newLtvBps=${result.newLtvBps}`
          : "HOLD, no cross-chain action",
      });

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
      return;
    }

    res.writeHead(404);
    res.end("not found");
  } catch (error) {
    const message = error instanceof Error ? error.message : "server error";
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: message }));
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Counterfly dashboard API listening on http://${HOST}:${PORT}`);
});
