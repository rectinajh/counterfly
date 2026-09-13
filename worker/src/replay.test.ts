import assert from "node:assert/strict";
import test from "node:test";

import { runPipeline } from "./pipeline";

process.env.SKIP_ATTEST = "true";

const GOLDEN = {
  BASE_REPLAY: {
    replayHash: "4e4e2a622692c63345a82bdee34758555364fe614360fc8828bf094d1bc3bd3b",
    action: 0,
  },
  RATE_SHOCK: {
    replayHash: "1345c0c3b1d70967c2432953d11f66ef6717b8cb326e08063806f04136413e92",
    action: 1,
  },
} as const;

test("demo replay is deterministic across runs", async () => {
  const counterfactual = {
    type: "BASE_REPLAY" as const,
    magnitude: 0,
    horizon: 12,
  };

  const first = await runPipeline({
    graph: "demo",
    counterfactual,
    seed: 0,
    attest: false,
  });
  const second = await runPipeline({
    graph: "demo",
    counterfactual,
    seed: 0,
    attest: false,
  });

  assert.equal(first.replayHash, second.replayHash);
  assert.equal(first.action, second.action);
});

test("demo golden fixture matches BASE_REPLAY", async () => {
  const result = await runPipeline({
    graph: "demo",
    counterfactual: { type: "BASE_REPLAY", magnitude: 0, horizon: 12 },
    seed: 0,
    attest: false,
  });

  assert.equal(result.replayHash, GOLDEN.BASE_REPLAY.replayHash);
  assert.equal(result.action, GOLDEN.BASE_REPLAY.action);
});

test("demo golden fixture matches RATE_SHOCK", async () => {
  const result = await runPipeline({
    graph: "demo",
    counterfactual: { type: "RATE_SHOCK", magnitude: 0.2, horizon: 12 },
    seed: 0,
    attest: false,
  });

  assert.equal(result.replayHash, GOLDEN.RATE_SHOCK.replayHash);
  assert.equal(result.action, GOLDEN.RATE_SHOCK.action);
});
