export type ActionCode = 0 | 1 | 2 | 3;

export interface FlyState {
  assetId: string;
  scenarioType: "BASE_REPLAY" | "RATE_SHOCK";
  graphHash: string;
  scenarioHash: string;
  replayHash: string;
  motorAxis: number;
  action: ActionCode;
  verifiedTx: string;
}

export const ACTION_LABELS: Record<ActionCode, string> = {
  0: "HOLD",
  1: "ADJUST LTV",
  2: "LIQUIDATE",
  3: "PAY OUT",
};
