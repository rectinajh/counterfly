import { ethers } from "hardhat";

async function main() {
  const worker = process.env.WORKER_ADDRESS;
  if (!worker) {
    throw new Error("WORKER_ADDRESS is required (set it in .env)");
  }

  const factory = await ethers.getContractFactory("CounterflyASC");
  const contract = await factory.deploy(worker);
  await contract.waitForDeployment();

  console.log("CounterflyASC deployed to", await contract.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
