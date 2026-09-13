import type { CounterfactualType, HistoryEntry } from "./scenario";

export type RwaVertical = "invoice" | "solar" | "parametric";

export interface RwaPreset {
  vertical: RwaVertical;
  title: string;
  description: string;
  history: HistoryEntry[];
}

const INVOICE_BASE: HistoryEntry[] = [
  { amount: 100, daysLate: 0 },
  { amount: 100, daysLate: 0 },
  { amount: 100, daysLate: 0 },
  { amount: 100, daysLate: 0 },
  { amount: 100, daysLate: 0 },
  { amount: 100, daysLate: 0 },
  { amount: 100, daysLate: 0 },
  { amount: 100, daysLate: 0 },
  { amount: 100, daysLate: 0 },
  { amount: 100, daysLate: 0 },
  { amount: 100, daysLate: 0 },
  { amount: 100, daysLate: 0 },
  { amount: 100, daysLate: 0 },
];

const SOLAR_BASE: HistoryEntry[] = [
  { amount: 92, daysLate: 0 },
  { amount: 95, daysLate: 0 },
  { amount: 88, daysLate: 0 },
  { amount: 90, daysLate: 0 },
  { amount: 94, daysLate: 0 },
  { amount: 91, daysLate: 0 },
  { amount: 89, daysLate: 0 },
  { amount: 93, daysLate: 0 },
  { amount: 87, daysLate: 0 },
  { amount: 96, daysLate: 0 },
  { amount: 90, daysLate: 0 },
  { amount: 92, daysLate: 0 },
  { amount: 88, daysLate: 0 },
];

const PARAMETRIC_BASE: HistoryEntry[] = [
  { amount: 50, daysLate: 0 },
  { amount: 50, daysLate: 0 },
  { amount: 50, daysLate: 0 },
  { amount: 50, daysLate: 0 },
  { amount: 50, daysLate: 0 },
  { amount: 50, daysLate: 0 },
  { amount: 50, daysLate: 0 },
  { amount: 50, daysLate: 0 },
  { amount: 50, daysLate: 0 },
  { amount: 50, daysLate: 0 },
  { amount: 50, daysLate: 0 },
  { amount: 50, daysLate: 0 },
  { amount: 50, daysLate: 0 },
];

function clone(entries: HistoryEntry[]): HistoryEntry[] {
  return entries.map((entry) => ({ ...entry }));
}

export function presetForScenario(type: CounterfactualType): RwaPreset {
  switch (type) {
    case "MISSED_PAYMENT":
      return {
        vertical: "invoice",
        title: "Invoice / receivables financing",
        description:
          "Verified payment stream with a late receivable; counterfactual replays a missed installment.",
        history: clone(INVOICE_BASE).map((entry, index) =>
          index >= INVOICE_BASE.length - 3
            ? { ...entry, daysLate: 45 }
            : entry,
        ),
      };
    case "HAZARD":
      return {
        vertical: "parametric",
        title: "Parametric insurance",
        description:
          "Attested hazard history; a strong shock triggers PAY_OUT instead of collateral liquidation.",
        history: clone(PARAMETRIC_BASE).map((entry, index) =>
          index >= PARAMETRIC_BASE.length - 4 ? { ...entry, amount: 10 } : entry,
        ),
      };
    case "RATE_SHOCK":
      return {
        vertical: "solar",
        title: "Solar lease cash-flow",
        description:
          "Revenue-backed LTV with generation volatility; a rate shock reduces effective coverage.",
        history: clone(SOLAR_BASE).map((entry) => ({
          ...entry,
          amount: Math.max(70, Math.round(entry.amount * 0.88)),
        })),
      };
    case "BASE_REPLAY":
    default:
      return {
        vertical: "invoice",
        title: "Invoice / receivables financing",
        description: "Steady attested payment history with no counterfactual shock.",
        history: clone(INVOICE_BASE),
      };
  }
}
