import fs from "node:fs";
import path from "node:path";
import { JsonRpcProvider, Wallet, NonceManager, ContractFactory, parseUnits } from "ethers";

const rpc = "http://127.0.0.1:8545";
const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const provider = new JsonRpcProvider(rpc);
const wallet = new Wallet(privateKey, provider);
const signer = new NonceManager(wallet);

function loadArtifact(file) {
  const artifactPath = path.resolve(file);
  return JSON.parse(fs.readFileSync(artifactPath, "utf8"));
}

const redPacketArtifact = loadArtifact("./artifacts/src/redpack.sol/RedPacket.json");
const mockUsdcArtifact = loadArtifact("./artifacts/src/MockUSDC.sol/MockUSDC.json");

const redPacketFactory = new ContractFactory(
  redPacketArtifact.abi,
  redPacketArtifact.bytecode,
  signer,
);
const redPacket = await redPacketFactory.deploy();
await redPacket.waitForDeployment();
const redPacketAddress = await redPacket.getAddress();

const mockUsdcFactory = new ContractFactory(
  mockUsdcArtifact.abi,
  mockUsdcArtifact.bytecode,
  signer,
);
const mockUsdc = await mockUsdcFactory.deploy();
await mockUsdc.waitForDeployment();
const mockUsdcAddress = await mockUsdc.getAddress();

const mintAmount = parseUnits("1000000", 6); // 1,000,000 USDC
const deployerAddress = await signer.getAddress();

const mintTx = await mockUsdc.mint(deployerAddress, mintAmount);
await mintTx.wait();

const secondAccount = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
const mintTx2 = await mockUsdc.mint(secondAccount, mintAmount);
await mintTx2.wait();

const frontendAddressPath = path.resolve("../frontend/src/contractAddress.ts");
const tsContent = `// Local addresses for Hardhat (chainId 31337)
export const USDC = "${mockUsdcAddress}";
export const RED_PACKET = "${redPacketAddress}";
`;
fs.writeFileSync(frontendAddressPath, tsContent, "utf8");

console.log("Deployment finished:");
console.log("RED_PACKET:", redPacketAddress);
console.log("USDC:", mockUsdcAddress);
console.log("Minted 1,000,000 USDC to:", deployerAddress);
console.log("Minted 1,000,000 USDC to:", secondAccount);
console.log("Updated frontend/src/contractAddress.ts");
