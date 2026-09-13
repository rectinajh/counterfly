export type FlowStepId = "attest" | "replay" | "commit" | "writeback";

export interface FlowStepDef {
  id: FlowStepId;
  label: string;
  hint: string;
  sectionId: string;
}

export const FLOW_STEPS: FlowStepDef[] = [
  {
    id: "attest",
    label: "Attest",
    hint: "Attestcoin ProofBuilder + BlockProver verify a Sepolia RWA payment on CC3.",
    sectionId: "section-pipeline",
  },
  {
    id: "replay",
    label: "Replay",
    hint: "Counterfactual scenario replays through the connectome; motor readout → risk action.",
    sectionId: "section-pipeline",
  },
  {
    id: "commit",
    label: "Commit",
    hint: "EIP-712 signed decision lands on Counterfly ASC (Creditcoin CC3 testnet).",
    sectionId: "section-writeback",
  },
  {
    id: "writeback",
    label: "Write-back",
    hint: "Relayer calls adjustLtv / requestLiquidation on Sepolia RwaAction.",
    sectionId: "section-timeline",
  },
];

export const QUICK_TIPS = [
  "Use Guided demo for the full Attest → Replay → Commit → Relay path in order.",
  "Demo brain is fast; MaleCNS v1.0 needs the Python worker and prepared graph data.",
  "Every replay is hash-pinned — see Reproduce footer to audit offline.",
];
