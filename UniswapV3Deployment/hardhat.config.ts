/**
 * @type import('hardhat/config').HardhatUserConfig
 */

import "@nomiclabs/hardhat-ethers";
import { task } from "hardhat/config";
import { alphaVaultDeposit, alphaVaultRebalanceAmount, baseThreshold, defaultSqrtPriceX96, delay, durationTWAP, ethDefaultProvider, feeTier, g, limitThreshold, maxGasLimit, maxTotalSupply, maxTWAPDeviation, MAX_TICK, minTickMove, MIN_TICK, periodAlphaVault, poolABI, protocolFee, r, swapRouterABI, swapRouterMaximumIn, token0Decimals, token1Decimals, tokenDefaultBalance, w } from "./scripts/config/config";
import Table from "cli-table3";
import { UniswapV3Deployer } from "./scripts/util/UniswapV3Deployer";
import { client } from "./scripts/config/db";
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
    let WETHToken = await WETHTokenFactory.connect(keyA).deploy(0, token0Decimals);
    await WETHToken.deployed();

    const DAITokenFactory = await ethers.getContractFactory("DAIToken");
    let DAIToken = await DAITokenFactory.connect(keyA).deploy(0, token1Decimals);
    await DAIToken.deployed();

    while (!BigNumber.from(WETHToken.address).lt(BigNumber.from(DAIToken.address))) {
      WETHToken = await WETHTokenFactory.connect(keyA).deploy(0, token0Decimals);
      await WETHToken.deployed();

      DAIToken = await DAITokenFactory.connect(keyA).deploy(0, token1Decimals);
      await DAIToken.deployed();
    }

    console.log("Address lower: " + BigNumber.from(WETHToken.address).lt(BigNumber.from(DAIToken.address)))

    await WETHToken.connect(keyA).mint(keyA.address, tokenDefaultBalance);
    await DAIToken.connect(keyA).mint(keyA.address, tokenDefaultBalance);

    await WETHToken.connect(keyA).approve(uniswapContracts["positionManager"].address, tokenDefaultBalance.mul(1000));
    await DAIToken.connect(keyA).approve(uniswapContracts["positionManager"].address, tokenDefaultBalance.mul(1000));

    await WETHToken.connect(keyB).approve(uniswapContracts["router"].address, tokenDefaultBalance.mul(1000));
    await DAIToken.connect(keyB).approve(uniswapContracts["router"].address, tokenDefaultBalance.mul(1000));

    await WETHToken.connect(keyA).approve(uniswapContracts["router"].address, tokenDefaultBalance.mul(1000));
    await DAIToken.connect(keyA).approve(uniswapContracts["router"].address, tokenDefaultBalance.mul(1000));

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
    const uniswapV3Pool = new ethers.Contract(UniswapV3PoolAddress, poolABI, defaultProvider);
    await uniswapV3Pool.connect(keyA).increaseObservationCardinalityNext(150);

    const AlphaVaultFactory = await ethers.getContractFactory("AlphaVault");
    const AlphaVault0 = await AlphaVaultFactory.connect(keyA).deploy(
      UniswapV3PoolAddress,
      protocolFee,
      maxTotalSupply,
    );
    await AlphaVault0.deployed();

    const AlphaVault1 = await AlphaVaultFactory.connect(keyA).deploy(
      UniswapV3PoolAddress,
      protocolFee,
      maxTotalSupply,
    );
    await AlphaVault1.deployed();

    await WETHToken.connect(keyA).approve(AlphaVault0.address, tokenDefaultBalance);
    await DAIToken.connect(keyA).approve(AlphaVault0.address, tokenDefaultBalance);

    await WETHToken.connect(keyA).approve(AlphaVault1.address, tokenDefaultBalance);
    await DAIToken.connect(keyA).approve(AlphaVault1.address, tokenDefaultBalance);

    const AVStrategyFactory = await ethers.getContractFactory("PassiveStrategy");
    const AVStrategy = await AVStrategyFactory.connect(keyA).deploy(
      AlphaVault0.address,
      baseThreshold,
      limitThreshold,
      periodAlphaVault,
      minTickMove,
      maxTWAPDeviation,
      durationTWAP,
      keyA.address
    );
    await AVStrategy.deployed();
    await AlphaVault0.connect(keyA).setStrategy(AVStrategy.address);
    await AlphaVault1.connect(keyA).setStrategy(AVStrategy.address);

    const table = new Table({
      head: ["Contract", "Address"],
      style: { border: [] },
    });

    await AlphaVault1.connect(keyA).deposit(
      alphaVaultDeposit,
      alphaVaultDeposit,
      0,
      0,
      keyA.address,
      { gasLimit: maxGasLimit }
    )

    const rebalanceResult = await AlphaVault1.rebalance(
      0,
      0,
      MIN_TICK,
      MAX_TICK,
      MIN_TICK + 60,
      -60,
      180,
      360,
      { gasLimit: maxGasLimit }
    )

    await defaultProvider.waitForTransaction(rebalanceResult.hash);

    // const blockTimestamp = (await defaultProvider.getBlock(await defaultProvider.getBlockNumber())).timestamp;
    // const swapRouter = new ethers.Contract(uniswapContracts["router"].address, swapRouterABI, defaultProvider);
    // const swapResult = await swapRouter.connect(keyA).exactOutputSingle({
    //   tokenIn: DAIToken.address,
    //   tokenOut: WETHToken.address,
    //   fee: 3000,
    //   recipient: keyA.address,
    //   deadline: blockTimestamp + 1800,
    //   amountOut: alphaVaultRebalanceAmount,
    //   amountInMaximum: swapRouterMaximumIn,
    //   sqrtPriceLimitX96: 0, // No limit
    // },
    //   { gasLimit: maxGasLimit }
    // );

    // await defaultProvider.waitForTransaction(swapResult.hash);

    table.push(["AlphaVault0", AlphaVault0.address])
    table.push(["AlphaVault1", AlphaVault1.address])
    table.push(["AlphaVault-PassiveStrategy", AVStrategy.address])
    table.push(["WETH Token", WETHToken.address])
    table.push(["DAI Token", DAIToken.address])
    for (const item of Object.keys(uniswapContracts))
      table.push([item, uniswapContracts[item].address]);

    console.info(table.toString());

    await client.connect()
    var format = require('pg-format');

    var values = [
      ['nonfungiblePositionManagerAddress', uniswapContracts["positionManager"].address],
      ['uniswapV3FactoryAddress', uniswapContracts["factory"].address],
      ['swapRouterAddress', uniswapContracts["router"].address],
      ['defaultPoolAddress', UniswapV3PoolAddress],
      ['uniswapKeyAddress', UniswapKey.address],
      ['alphaVaultAddress0', AlphaVault0.address],
      ['alphaVaultAddress1', AlphaVault1.address],
      ['alphaVaultPassiveStrategyAddress', AVStrategy.address],
      ['WETH', WETHToken.address],
      ['DAI', DAIToken.address],
    ];

    await client.query(format(`
      INSERT INTO contracts (contract, address)
        VALUES %L
        ON CONFLICT (contract) DO UPDATE
          SET contract = excluded.contract,
              address = excluded.address;
      `, values))

    await client.end();
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



    // console.log(g + `export const contractAddresses: Map<string, string> = new Map([
    //     ["WETH", "${WETHToken.address}"],
    //     ["DAI", "${DAIToken.address}"],
    // ]);
    // `);
    // console.log(`export const nonfungiblePositionManagerAddress = "${uniswapContracts["positionManager"].address}";`)
    // console.log(`export const uniswapV3FactoryAddress = "${uniswapContracts["factory"].address}";`)
    // console.log(`export const swapRouterAddress = "${uniswapContracts["router"].address}";`)
    // console.log(`export const defaultPoolAddress = "${UniswapV3PoolAddress}";`)
    // console.log(`export const uniswapKeyAddress = "${UniswapKey.address}";`)
    // console.log(`export const alphaVaultAddress = "${AlphaVault.address}";`)
    // console.log(`export const alphaVaultPassiveStrategyAddress = "${AVStrategy.address}";` + w)