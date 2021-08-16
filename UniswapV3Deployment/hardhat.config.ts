/**
 * @type import('hardhat/config').HardhatUserConfig
 */

import { task } from "hardhat/config";
import { Deployer } from "./scripts/deployment/DeployLocal";
import "@tenderly/hardhat-tenderly"
import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";
import "@nomiclabs/hardhat-ethers";

task("deploy-local", "UniswapV3 local deployment")
  .setAction(async (args, { ethers }) => {
    await Deployer.deployContractsLocal(ethers);
  });

task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

module.exports = {
  solidity: {
    compilers:
      [
        {
          version: "0.7.6",
          settings: {
            optimizer: {
              enabled: true,
              runs: 100
            }
          },
        },
        {
          version: "0.8.0",
          settings: {
            optimizer: {
              enabled: true,
              runs: 100
            }
          },
        },
      ],
    overrides: {
      "@uniswap/v3-core/contracts/libraries/FullMath.sol": {
        version: "0.7.6",
        settings: {}
      },
      "@uniswap/v3-core/contracts/libraries/TickMath.sol": {
        version: "0.7.6",
        settings: {}
      },
      "@uniswap/v3-periphery/contracts/libraries/PoolAddress.sol": {
        version: "0.7.6",
        settings: {}
      }
    }
  },
  networks: {
    local: {
      url: 'http://127.0.0.1:8545',
      chainId: 31337,
      live: false,
      saveDeployments: true,
      tags: ["local"],
    },
  },
  tenderly: {
    project: "UniswapBooster",
    username: "midmatch",
  },
  namedAccounts: {
    keyA: {
      default: 0,
    },
    keyB: {
      default: 0,
    }
  },
  external: {
    contracts: [
      {
        artifacts: "node_modules/@uniswap/v3-core/artifacts/contracts",
      },
      {
        artifacts: "node_modules/@uniswap/v3-periphery/artifacts",
      },
      {
        artifacts: "./scripts/util",
      }
    ],
  }
};