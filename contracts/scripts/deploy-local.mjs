import fs from "node:fs";
import path from "node:path";
import { JsonRpcProvider, Wallet, ContractFactory } from "ethers";

const rpc = "http://127.0.0.1:8545";
const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const artifactPath = path.resolve("./artifacts/src/redpack.sol/RedPacket.json");
const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

const provider = new JsonRpcProvider(rpc);
const wallet = new Wallet(privateKey, provider);

const factory = new ContractFactory(artifact.abi, artifact.bytecode, wallet);
const contract = await factory.deploy();
await contract.waitForDeployment();

console.log("RedPacket deployed to:", await contract.getAddress());
