export type ActionCode = 0 | 1 | 2 | 3;
export type GraphMode = "demo" | "full";
export type ScenarioType =
  | "BASE_REPLAY"
  | "RATE_SHOCK"
  | "MISSED_PAYMENT"
  | "HAZARD";

export interface SourceEvent {
  txHash: string;
  blockNumber: number;
  eventType: string;
}

export interface ReplayState {
  mode: GraphMode;
  scenarioType: ScenarioType;
  magnitude: number;
  assetId: string;
  sourceEvent: SourceEvent;
  graphHash: string;
  neuronCount: number;
  edgeCount: number;
  motorAxis: number;
  action: ActionCode;
  replayHash: string;
  scenarioHash: string;
  writability?: {
    available: boolean;
    mode: "native-outbox" | "relayer-bridge";
    destination: string;
    note: string;
  };
  timestamp: string;
}

export interface WritebackStatus {
  assetId: string | null;
  configured: boolean;
  committed: boolean;
  commitTx?: string;
  relayTx?: string;
  ascDecision?: {
    replayHash: string;
    action: number;
    newLtvBps: string;
    nonce: string;
  };
  rwaLtvBps?: string;
  rwaLiquidated?: boolean;
  error?: string;
}

export type TimelineType = "replay" | "commit" | "relay";

export interface TimelineEvent {
  id: string;
  type: TimelineType;
  timestamp: string;
  assetId: string;
  action: ActionCode;
  graph: GraphMode;
  txHash?: string;
  chain?: "cc3" | "sepolia";
  detail: string;
}

export const ACTION_LABELS: Record<ActionCode, string> = {
  0: "HOLD",
  1: "ADJUST LTV",
  2: "LIQUIDATE",
  3: "PAY OUT",
};

export const SCENARIO_LABELS: Record<ScenarioType, string> = {
  BASE_REPLAY: "Base replay",
  RATE_SHOCK: "Rate shock",
  MISSED_PAYMENT: "Missed payment",
  HAZARD: "Hazard",
};
