import assert from "node:assert/strict";
import test from "node:test";

import type { VerifiedEvent } from "./attest";
import {
  assetIdFromSourceEvent,
  buildScenario,
  type Counterfactual,
} from "./scenario";

const event: VerifiedEvent = {
  txHash: "0x" + "ab".repeat(32),
  blockNumber: 13370001,
  chainKey: 1,
  eventType: "PAYMENT",
};

const counterfactual: Counterfactual = {
  type: "RATE_SHOCK",
  magnitude: 0.35,
  horizon: 4,
};

test("asset id is deterministic for the same source event", () => {
  assert.equal(assetIdFromSourceEvent(event), assetIdFromSourceEvent(event));
  assert.match(assetIdFromSourceEvent(event), /^0x[0-9a-f]{64}$/);
});

test("history merkle root is stable and independent of object key order", () => {
  const historyA = [
    { amount: 100, daysLate: 0 },
    { amount: 100, daysLate: 1 },
  ];
  const historyB = [
    { daysLate: 0, amount: 100 },
    { daysLate: 1, amount: 100 },
  ];

  const a = buildScenario({
    assetId: assetIdFromSourceEvent(event),
    sourceEvent: event,
    counterfactual,
    history: historyA,
  });
  const b = buildScenario({
    assetId: assetIdFromSourceEvent(event),
    sourceEvent: event,
    counterfactual,
    history: historyB,
  });

  assert.equal(a.historyMerkleRoot, b.historyMerkleRoot);
  assert.match(a.historyMerkleRoot, /^0x[0-9a-f]{64}$/);
});

test("the same inputs produce an identical scenario payload", () => {
  const opts = {
    assetId: assetIdFromSourceEvent(event),
    sourceEvent: event,
    counterfactual,
  };

  const first = buildScenario(opts);
  const second = buildScenario(opts);

  assert.deepEqual(first, second);
});
