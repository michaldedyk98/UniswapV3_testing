import keyBy from "lodash.keyby";
import { Client } from "pg";
import { dbConfig } from "../config/db";
import hre from "hardhat";

async function main() {
    const dbClient: Client = new Client(dbConfig);

    try {
        await dbClient.connect()

        const result = await dbClient.query('SELECT * FROM contracts')
        const addressMap = keyBy(result.rows, 'contract');

        await hre.tenderly.persistArtifacts(
            {
                name: "WETHToken",
                address: addressMap["WETH"].address,
            },
            {
                name: "DAIToken",
                address: addressMap["DAI"].address,
            },
            {
                name: "INonfungiblePositionManager",
                address: addressMap["nonfungiblePositionManagerAddress"].address,
            },
            {
                name: "ISwapRouter",
                address: addressMap["swapRouterAddress"].address,
            },
            {
                name: "UniswapBooster",
                address: addressMap["uniswapBooster"].address,
            },
            {
                name: "IUniswapBooster",
                address: addressMap["uniswapBooster"].address,
            },
            {
                name: "UniswapV3Pool",
                address: addressMap["defaultPoolAddress"].address,
            },
            {
                name: "IUniswapV3Pool",
                address: addressMap["defaultPoolAddress"].address,
            },
            {
                name: "PassiveStrategy",
                address: addressMap["alphaVaultPassiveStrategyAddress1"].address,
            },
            {
                name: "IVault",
                address: addressMap["alphaVaultAddress1"].address,
            }
        );

    } finally {
        await dbClient.end()
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });