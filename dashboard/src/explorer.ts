export type ExplorerChain = "cc3" | "sepolia";

const CC3_EXPLORER = "https://creditcoin-testnet.blockscout.com";
const SEPOLIA_EXPLORER = "https://sepolia.etherscan.io";

export function txExplorerUrl(
  chain: ExplorerChain,
  txHash: string,
): string {
  const base = chain === "cc3" ? CC3_EXPLORER : SEPOLIA_EXPLORER;
  return `${base}/tx/${txHash}`;
}
