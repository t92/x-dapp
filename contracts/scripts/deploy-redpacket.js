import { network } from "hardhat";

async function main() {
  const { ethers } = await network.connect();
  const RedPacket = await ethers.getContractFactory("RedPacket");
  const contract = await RedPacket.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`RedPacket deployed to: ${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
