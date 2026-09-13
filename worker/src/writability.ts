export interface WritabilityStatus {
  available: boolean;
  mode: "native-outbox" | "relayer-bridge";
  destination: string;
  note: string;
}

/**
 * Attestcoin Protocol Writability lets a Creditcoin contract publish a signed
 * message to any destination chain through four steps:
 *
 *  1. Message publishing -> outbox
 *  2. Attestor quorum signing (2/3 + 1)
 *  3. Relayer delivery -> destination inbox
 *  4. Inbox validation -> destination contract
 *
 * The feature is currently undergoing third-party testing and audits and has
 * not been released on the CC3 testnet. Counterfly therefore uses an explicit
 * relayer bridge today: the ASC decision is stored on CC3, a signed relayer
 * reads it, and calls the Sepolia `RwaAction` contract directly. When native
 * writability ships, the relayer can be replaced by the outbox/inbox path
 * without changing the decision semantics.
 */
export const WRITABILITY_STATUS: WritabilityStatus = {
  available: false,
  mode: "relayer-bridge",
  destination: "Ethereum Sepolia RwaAction",
  note: "Native writability is pending third-party testing and audit; not yet released on CC3 testnet.",
};
