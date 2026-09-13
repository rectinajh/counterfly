import type { FlyState } from "./types";

export function runMockReplay(scenarioType: "BASE_REPLAY" | "RATE_SHOCK"): FlyState {
  const axis = scenarioType === "BASE_REPLAY" ? 0.71 : 0.41;
  const action = scenarioType === "BASE_REPLAY" ? 0 : 1;

  return {
    assetId: "0x7f2a...9c1e",
    scenarioType,
    graphHash: "demo-pruned:512:2048",
    scenarioHash: `sha256:${scenarioType.toLowerCase()}`,
    replayHash: `sha256:${scenarioType.toLowerCase()}:${axis.toFixed(3)}:${action}`,
    motorAxis: axis,
    action,
    verifiedTx: "0xaaaa...aaaa",
  };
}
