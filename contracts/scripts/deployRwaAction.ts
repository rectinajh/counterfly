import { ethers } from "hardhat";

async function main() {
  const relayer = process.env.RELAYER_ADDRESS;
  if (!relayer) {
    throw new Error("RELAYER_ADDRESS is required (set it in .env)");
  }

  const factory = await ethers.getContractFactory("RwaAction");
  const contract = await factory.deploy(relayer);
  await contract.waitForDeployment();

  console.log("RwaAction deployed to", await contract.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
