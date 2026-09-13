import "dotenv/config";

export const config = {
  demo: process.env.DEMO === "true",
  cc3Rpc: process.env.CC3_TESTNET_RPC || "https://rpc.cc3-testnet.creditcoin.network",
  proverEndpoint:
    process.env.PROVER_ENDPOINT || "https://prover.cc3-testnet.creditcoin.network",
  sepoliaRpc:
    process.env.SEPOLIA_RPC || "https://sepolia.infura.io/v3/<your-key>",
  chainKey: Number(process.env.CHAIN_KEY || 1),
  privateKey: process.env.PRIVATE_KEY || "",
  counterflyAscAddress: process.env.COUNTERFLY_ASC_ADDRESS || "",
  rwaActionAddress: process.env.RWA_ACTION_ADDRESS || "",
};
