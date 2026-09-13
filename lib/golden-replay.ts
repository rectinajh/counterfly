/** Deterministic demo-brain replay hashes (seed=0, graph=demo). */
export const DEMO_GOLDEN_REPLAY: Record<
  string,
  { replayHash: string; action: number; motorAxis: number }
> = {
  "BASE_REPLAY:0": {
    replayHash: "4e4e2a622692c63345a82bdee34758555364fe614360fc8828bf094d1bc3bd3b",
    action: 0,
    motorAxis: 0.700197,
  },
  "RATE_SHOCK:0.2": {
    replayHash: "1345c0c3b1d70967c2432953d11f66ef6717b8cb326e08063806f04136413e92",
    action: 1,
    motorAxis: 0.643832,
  },
  "MISSED_PAYMENT:0.5": {
    replayHash: "494b848768318949abf7b1be8ef06855f07305601b545d9ce8446ceeac4001f2",
    action: 1,
    motorAxis: 0.558027,
  },
  "HAZARD:0.8": {
    replayHash: "d80465a29abf9c8c49d178760d86767e75fa6fab58e3987de6854d99dc5dfa70",
    action: 0,
    motorAxis: 0.72491,
  },
};

export function goldenKey(scenario: string, magnitude: number): string {
  return `${scenario}:${magnitude}`;
}
