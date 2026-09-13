import { ethers } from "hardhat";

async function main() {
  const assetId = ethers.id(process.env.RWA_ASSET_ID || "counterfly-invoice-demo");
  const factory = await ethers.getContractFactory("RwaReceivable");
  const contract = await factory.deploy(assetId);
  await contract.waitForDeployment();
  console.log("RwaReceivable deployed to:", await contract.getAddress());
  console.log("assetId:", assetId);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
