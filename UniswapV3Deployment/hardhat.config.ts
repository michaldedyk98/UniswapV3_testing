/**
 * @type import('hardhat/config').HardhatUserConfig
 */

import "@nomiclabs/hardhat-ethers";
import { task } from "hardhat/config";
import { defaultSqrtPriceX96, feeTier, g, r, token0Decimals, token1Decimals, tokenDefaultBalance, w } from "./scripts/config/config";
import Table from "cli-table3";
import { UniswapV3Deployer } from "./scripts/UniswapV3Deployer";

const ALCHEMY_API_KEY_ROPSTEN = "dpxW2p8ycguVyDHFIzXPVIlfTv_CnoLw";

task("deploy-local", "UniswapV3 local deployment")
  //.addPositionalParam("hash", "test")
  .setAction(async (args, { ethers }) => {
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

    await WETHToken.connect(keyA).approve(uniswapContracts["positionManager"].address, tokenDefaultBalance);
    await DAIToken.connect(keyA).approve(uniswapContracts["positionManager"].address, tokenDefaultBalance);
    await WETHToken.connect(keyA).transfer(keyB.address, tokenDefaultBalance / 10);
    await DAIToken.connect(keyA).transfer(keyB.address, tokenDefaultBalance / 10);

    await WETHToken.connect(keyB).approve(uniswapContracts["router"].address, tokenDefaultBalance);
    await DAIToken.connect(keyB).approve(uniswapContracts["router"].address, tokenDefaultBalance);

    await uniswapContracts["positionManager"].connect(keyA).createAndInitializePoolIfNecessary(
      WETHToken.address,
      DAIToken.address,
      feeTier,
      defaultSqrtPriceX96
    )

    const uniswapV3Pool = await uniswapContracts["factory"].getPool(WETHToken.address, DAIToken.address, feeTier);

    const table = new Table({
      head: ["Contract", "Address"],
      style: { border: [] },
    });

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
    console.log(`export const defaultPoolAddress = "${uniswapV3Pool}";` + w)
    console.log(`export const uniswapKeyAddress = "${UniswapKey.address}";` + w)
  });

module.exports = {
  compilers: [
    {
      version: "0.6.0"
    },
    {
      version: "0.7.0"
    },
    {
      version: "0.8.1",
      settings: {
        optimizer: {
          enabled: true,
          runs: 100
        }
      },
    }
  ],
  networks: {
    local: {
      url: 'http://127.0.0.1:8545'
    },
    ropsten: {
      url: `https://eth-ropsten.alchemyapi.io/v2/${ALCHEMY_API_KEY_ROPSTEN}`,
      accounts: [
        "0xcafff5a97a1d36f43eacb521d050e9995dce9e75d1f8fabcc7f699d251e9d1c8",
      ]
    }
  }
};
