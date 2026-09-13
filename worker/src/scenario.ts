import { ethers } from "ethers";
import type { VerifiedEvent } from "./attest";
import { presetForScenario } from "./rwaPresets";

export type CounterfactualType =
  | "BASE_REPLAY"
  | "RATE_SHOCK"
  | "MISSED_PAYMENT"
  | "HAZARD";

export interface Counterfactual {
  type: CounterfactualType;
  magnitude: number;
  horizon: number;
}

export interface HistoryEntry {
  amount: number;
  daysLate: number;
}

export interface ScenarioInput {
  assetId: string;
  historyMerkleRoot: string;
  scenarioHash: string;
  counterfactual: Counterfactual;
  history: HistoryEntry[];
  sourceEvent: {
    txHash: string;
    blockNumber: number;
    eventType: string;
  };
}

function canonical(value: unknown): string {
  return JSON.stringify(value, Object.keys(value as object).sort());
}

function leafHash(entry: HistoryEntry): string {
  return ethers.keccak256(ethers.toUtf8Bytes(canonical(entry)));
}

function merkleRoot(entries: HistoryEntry[]): string {
  if (entries.length === 0) {
    return ethers.ZeroHash;
  }

  let layer = entries.map(leafHash);
  while (layer.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      const left = layer[i];
      const right = i + 1 < layer.length ? layer[i + 1] : left;
      next.push(ethers.keccak256(ethers.concat([left, right])));
    }
    layer = next;
  }
  return layer[0];
}

export function assetIdFromSourceEvent(event: VerifiedEvent): string {
  return ethers.keccak256(ethers.toUtf8Bytes(`${event.chainKey}:${event.txHash}`));
}

export function buildScenario(opts: {
  assetId: string;
  sourceEvent: VerifiedEvent;
  counterfactual: Counterfactual;
  history?: HistoryEntry[];
}): ScenarioInput {
  const history =
    opts.history ?? presetForScenario(opts.counterfactual.type).history;
  const historyMerkleRoot = merkleRoot(history);

  const base: Omit<ScenarioInput, "scenarioHash" | "historyMerkleRoot"> = {
    assetId: opts.assetId,
    counterfactual: opts.counterfactual,
    history,
    sourceEvent: {
      txHash: opts.sourceEvent.txHash,
      blockNumber: opts.sourceEvent.blockNumber,
      eventType: opts.sourceEvent.eventType,
    },
  };

  // scenarioHash is produced by the deterministic replay engine so that the
  // worker and the Python engine agree on a single canonical hash.
  return { ...base, historyMerkleRoot, scenarioHash: "" };
}
