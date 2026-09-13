import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  assetIdFromSourceEvent,
  buildScenario,
  type Counterfactual,
} from "./scenario";
import { runFly } from "./flyRunner";
import { WRITABILITY_STATUS } from "./writability";

const PORT = Number(process.env.PORT || 8787);

interface RunRequest {
  graph?: "demo" | "full";
  scenario?: string;
  magnitude?: number;
}

const DEMO_EVENT = {
  txHash: `0x${"a".repeat(64)}`,
  blockNumber: 12345678,
  chainKey: 1,
  eventType: "PAYMENT" as const,
};

const REAL_EVENT = {
  txHash: "0xfcb1d4277b56b03ed2e0fb536f5ec32f26abcc6e149a00f9bb3c729750b1afba",
  blockNumber: 11695624,
  chainKey: 1,
  eventType: "PAYMENT" as const,
};

let latest: unknown = null;

function graphInfo(graph: "demo" | "full") {
  if (graph === "demo") {
    return { neuronCount: 512, edgeCount: 2048 };
  }

  try {
    const metaPath = path.resolve(__dirname, "../fly/data/malecns_v1.meta.json");
    const meta = JSON.parse(readFileSync(metaPath, "utf8"));
    return {
      neuronCount: Number(meta.neuron_count),
      edgeCount: Number(meta.edge_count),
    };
  } catch {
    return { neuronCount: 0, edgeCount: 0 };
  }
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
  const event = graph === "full" ? REAL_EVENT : DEMO_EVENT;
  const assetId = assetIdFromSourceEvent(event);
  const counterfactual: Counterfactual = {
    type: scenarioType as Counterfactual["type"],
    magnitude,
    horizon: 12,
  };

  const scenario = buildScenario({ assetId, sourceEvent: event, counterfactual });
  const output = await runFly(scenario, 0, graph);
  scenario.scenarioHash = output.scenarioHash;

  const info = graphInfo(graph);

  latest = {
    mode: graph,
    scenarioType,
    magnitude,
    assetId,
    sourceEvent: scenario.sourceEvent,
    graphHash: output.graphHash,
    neuronCount: info.neuronCount,
    edgeCount: info.edgeCount,
    motorAxis: output.motorAxis,
    action: output.action,
    replayHash: output.replayHash,
    scenarioHash: output.scenarioHash,
    writability: WRITABILITY_STATUS,
    timestamp: new Date().toISOString(),
  };

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
    if (req.method === "GET" && url.pathname === "/api/state") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(latest));
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

    res.writeHead(404);
    res.end("not found");
  } catch (error) {
    const message = error instanceof Error ? error.message : "server error";
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: message }));
  }
});

server.listen(PORT, () => {
  console.log(`Counterfly dashboard API listening on http://localhost:${PORT}`);
});
