import type { VerifiedEvent } from "./attest";

/** Synthetic event for offline demos when Attestcoin RPC is unavailable. */
export const DEMO_SOURCE_EVENT: VerifiedEvent = {
  txHash: `0x${"a".repeat(64)}`,
  blockNumber: 12345678,
  chainKey: 1,
  eventType: "PAYMENT",
};

/**
 * Canonical Sepolia payment tx used for MaleCNS / judge demos.
 * Verified on CC3 via ProofBuilder + BlockProver when attest is enabled.
 */
export const VERIFIED_SEPOLIA_PAYMENT: VerifiedEvent = {
  txHash: "0xfcb1d4277b56b03ed2e0fb536f5ec32f26abcc6e149a00f9bb3c729750b1afba",
  blockNumber: 11695624,
  chainKey: 1,
  eventType: "PAYMENT",
};

export function sourceEventForGraph(graph: "demo" | "full"): VerifiedEvent {
  if (graph === "full" || process.env.ATTEST_CANONICAL_TX === "true") {
    return VERIFIED_SEPOLIA_PAYMENT;
  }
  return DEMO_SOURCE_EVENT;
}
