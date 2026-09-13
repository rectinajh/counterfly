import { Wallet } from "ethers";
import { config } from "./config";

const privateKey = config.privateKey;

if (!privateKey) {
  console.error("PRIVATE_KEY is not set in .env");
  process.exit(1);
}

const wallet = new Wallet(privateKey);

console.log(`Address: ${wallet.address}`);
console.log(`Set WORKER_ADDRESS=${wallet.address} in .env`);
console.log(`Set RELAYER_ADDRESS=${wallet.address} in .env (same key works for the demo relayer)`);
