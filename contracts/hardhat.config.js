import { defineConfig } from "hardhat/config";
import hardhatToolboxMochaEthers from "@nomicfoundation/hardhat-toolbox-mocha-ethers";

/** @type {import("hardhat/config").HardhatUserConfig} */
const config = defineConfig({
  plugins: [hardhatToolboxMochaEthers],
  solidity: {
    version: "0.8.20",
    path: new URL(
      "./node_modules/.pnpm/solc@0.8.20/node_modules/solc/soljson.js",
      import.meta.url,
    ).pathname,
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  paths: {
    sources: "./src",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
});

export default config;
