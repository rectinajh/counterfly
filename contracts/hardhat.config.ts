import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    hardhat: {},
    cc3Testnet: {
      url: process.env.CC3_TESTNET_RPC || "https://rpc.cc3-testnet.creditcoin.network",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 102031,
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC || "https://sepolia.infura.io/v3/<your-key>",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111,
    },
  },
};

export default config;
