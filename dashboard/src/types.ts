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

export interface AttestationStatus {
  verified: boolean;
  skipped?: boolean;
  headerNumber?: number;
  error?: string;
}

export interface ReplayState {
  mode: GraphMode;
  scenarioType: ScenarioType;
  magnitude: number;
  assetId: string;
  sourceEvent: SourceEvent;
  attestation?: AttestationStatus;
  rwaVertical?: string;
  rwaTitle?: string;
  rwaDescription?: string;
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

export type TimelineType = "attest" | "replay" | "commit" | "relay";

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
  BASE_REPLAY: "Base replay · invoice",
  RATE_SHOCK: "Rate shock · solar",
  MISSED_PAYMENT: "Missed payment · invoice",
  HAZARD: "Hazard · parametric",
};

export type PipelineMode = "full" | "partial" | "replay-only";

export interface PipelineCapabilities {
  source: "worker" | "cloud-fallback";
  pipeline: PipelineMode;
  features: {
    liveAttest: boolean;
    malecnsFull: boolean;
    onChainCommit: boolean;
    onChainRelay: boolean;
  };
  message?: string;
}

export const SCENARIO_RWA_HINT: Record<ScenarioType, string> = {
  BASE_REPLAY: "Receivables financing with steady attested payments.",
  RATE_SHOCK: "Solar lease revenue stress under a funding-rate shock.",
  MISSED_PAYMENT: "Late invoice stream with a missed-installment counterfactual.",
  HAZARD: "Parametric cover triggered from attested hazard history.",
};
