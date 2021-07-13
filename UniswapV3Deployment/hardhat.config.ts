/**
 * @type import('hardhat/config').HardhatUserConfig
 */

import "@nomiclabs/hardhat-ethers";
import { task } from "hardhat/config";
import { baseThreshold, defaultSqrtPriceX96, durationTWAP, ethDefaultProvider, feeTier, g, limitThreshold, maxGasLimit, maxTotalSupply, maxTWAPDeviation, minTickMove, periodAlphaVault, poolABI, protocolFee, r, token0Decimals, token1Decimals, tokenDefaultBalance, w } from "./scripts/config/config";
import Table from "cli-table3";
import { UniswapV3Deployer } from "./scripts/util/UniswapV3Deployer";
import { BigNumber } from '@ethersproject/bignumber';

task("deploy-local", "UniswapV3 local deployment")
  //.addPositionalParam("hash", "test")
  .setAction(async (args, { ethers }) => {
    const defaultProvider = ethers.getDefaultProvider(ethDefaultProvider);
    const [keyA, keyB] = await ethers.getSigners();
    const uniswapContracts = await UniswapV3Deployer.deploy(keyA);

    const UniswapKeyFactory = await ethers.getContractFactory("UniswapKey");
    const UniswapKey = await UniswapKeyFactory.connect(keyA).deploy();
    await UniswapKey.deployed();

    const WETHTokenFactory = await ethers.getContractFactory("WETHToken");
    const WETHToken = await WETHTokenFactory.connect(keyA).deploy(0, token0Decimals);
    await WETHToken.deployed();

    const DAITokenFactory = await ethers.getContractFactory("DAIToken");
    const DAIToken = await DAITokenFactory.connect(keyA).deploy(0, token1Decimals);
    await DAIToken.deployed();

    await WETHToken.connect(keyA).mint(keyA.address, tokenDefaultBalance * 2);
    await DAIToken.connect(keyA).mint(keyA.address, tokenDefaultBalance * 2);

    await WETHToken.connect(keyA).transfer(keyB.address, tokenDefaultBalance / 10);
    await DAIToken.connect(keyA).transfer(keyB.address, tokenDefaultBalance / 10);

    await WETHToken.connect(keyA).approve(uniswapContracts["positionManager"].address, tokenDefaultBalance);
    await DAIToken.connect(keyA).approve(uniswapContracts["positionManager"].address, tokenDefaultBalance);

    await WETHToken.connect(keyB).approve(uniswapContracts["router"].address, tokenDefaultBalance);
    await DAIToken.connect(keyB).approve(uniswapContracts["router"].address, tokenDefaultBalance);

    await WETHToken.connect(keyA).approve(uniswapContracts["router"].address, tokenDefaultBalance);
    await DAIToken.connect(keyA).approve(uniswapContracts["router"].address, tokenDefaultBalance);

    // const token0 = WETHToken.address > DAIToken.address ? DAIToken.address : WETHToken.address;
    // const token1 = WETHToken.address > DAIToken.address ? WETHToken.address : DAIToken.address;

    const token0 = WETHToken.address;
    const token1 = DAIToken.address;

    const result = await uniswapContracts["positionManager"].connect(keyA).createAndInitializePoolIfNecessary(
      token0,
      token1,
      feeTier,
      defaultSqrtPriceX96,
      { gasLimit: maxGasLimit }
    )
    await defaultProvider.waitForTransaction(result.hash);

    const UniswapV3PoolAddress = await uniswapContracts["factory"].getPool(WETHToken.address, DAIToken.address, feeTier);
    const uniswapV3Contract = new ethers.Contract(UniswapV3PoolAddress, poolABI, defaultProvider);
    await uniswapV3Contract.connect(keyA).increaseObservationCardinalityNext(150);

    const AlphaVaultFactory = await ethers.getContractFactory("AlphaVault");
    const AlphaVault = await AlphaVaultFactory.connect(keyA).deploy(
      UniswapV3PoolAddress,
      protocolFee,
      BigNumber.from(maxTotalSupply),
    );
    await AlphaVault.deployed();

    await WETHToken.connect(keyA).approve(AlphaVault.address, tokenDefaultBalance);
    await DAIToken.connect(keyA).approve(AlphaVault.address, tokenDefaultBalance);

    const AVStrategyFactory = await ethers.getContractFactory("PassiveStrategy");
    const AVStrategy = await AVStrategyFactory.connect(keyA).deploy(
      AlphaVault.address,
      baseThreshold,
      limitThreshold,
      periodAlphaVault,
      minTickMove,
      maxTWAPDeviation,
      durationTWAP,
      keyA.address
    );
    await AVStrategy.deployed();
    await AlphaVault.connect(keyA).setStrategy(AVStrategy.address);

    const table = new Table({
      head: ["Contract", "Address"],
      style: { border: [] },
    });

    table.push(["AlphaVault", AlphaVault.address])
    table.push(["AlphaVault-PassiveStrategy", AVStrategy.address])
    table.push(["WETH Token", WETHToken.address])
    table.push(["DAI Token", DAIToken.address])
    for (const item of Object.keys(uniswapContracts))
      table.push([item, uniswapContracts[item].address]);

    console.info(table.toString());

    console.log(g + `export const contractAddresses: Map<string, string> = new Map([
        ["WETH", "${WETHToken.address}"],
        ["DAI", "${DAIToken.address}"],
    ]);
    `);
    console.log(`export const nonfungiblePositionManagerAddress = "${uniswapContracts["positionManager"].address}";`)
    console.log(`export const uniswapV3FactoryAddress = "${uniswapContracts["factory"].address}";`)
    console.log(`export const swapRouterAddress = "${uniswapContracts["router"].address}";`)
    console.log(`export const defaultPoolAddress = "${UniswapV3PoolAddress}";`)
    console.log(`export const uniswapKeyAddress = "${UniswapKey.address}";`)
    console.log(`export const alphaVaultAddress = "${AlphaVault.address}";`)
    console.log(`export const alphaVaultPassiveStrategyAddress = "${AVStrategy.address}";` + w)
  });

module.exports = {
  solidity: {
    compilers:
      [
        {
          version: "0.6.0",
          settings: {
            optimizer: {
              enabled: true,
              runs: 200
            }
          },
        },
        {
          version: "0.7.0",
          settings: {
            optimizer: {
              enabled: true,
              runs: 200
            }
          },
        },

        {
          version: "0.7.3",
          settings: {
            optimizer: {
              enabled: true,
              runs: 200
            }
          },
        },
      ],
  },
  networks: {
    local: {
      url: 'http://127.0.0.1:8545'
    },
  }
};
