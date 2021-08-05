import { alphaVaultDeposit, alphaVaultRebalanceAmount, baseThreshold, defaultSqrtPriceX96, delay, durationTWAP, ethDefaultProvider, feeTier, g, limitThreshold, maxGasLimit, maxTotalSupply, maxTWAPDeviation, MAX_TICK, minTickMove, MIN_TICK, periodAlphaVault, poolABI, protocolFee, r, swapRouterABI, swapRouterMaximumIn, token0Decimals, token1Decimals, tokenDefaultBalance, w } from "../config/config";
import Table from "cli-table3";
import { UniswapV3Deployer } from "../util/UniswapV3Deployer";
import { client } from "../config/db";
import { BigNumber } from '@ethersproject/bignumber';

export class Deployer {
    static async deployContractsLocal(ethers: any) {
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

        const UniswapBoosterFactory = await ethers.getContractFactory("UniswapBooster");
        let UniswapBooster = await UniswapBoosterFactory.connect(keyA).deploy(
            uniswapContracts["positionManager"].address,
            uniswapContracts["router"].address,
            UniswapV3PoolAddress,
            3000,
            10
        );
        await UniswapBooster.deployed();

        await WETHToken.connect(keyA).approve(UniswapBooster.address, tokenDefaultBalance.mul(1000));
        await DAIToken.connect(keyA).approve(UniswapBooster.address, tokenDefaultBalance.mul(1000));

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
        const AVStrategy0 = await AVStrategyFactory.connect(keyA).deploy(
            AlphaVault0.address,
            baseThreshold,
            limitThreshold,
            periodAlphaVault,
            minTickMove,
            maxTWAPDeviation,
            durationTWAP,
            keyA.address
        );
        await AVStrategy0.deployed();

        const AVStrategy1 = await AVStrategyFactory.connect(keyA).deploy(
            AlphaVault1.address,
            baseThreshold,
            limitThreshold,
            periodAlphaVault,
            minTickMove,
            maxTWAPDeviation,
            durationTWAP,
            keyA.address
        );
        await AVStrategy1.deployed();

        await AlphaVault0.connect(keyA).setStrategy(AVStrategy0.address);
        await AlphaVault1.connect(keyA).setStrategy(AVStrategy1.address);

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
            -6000,
            6000,
            -180,
            -60,
            180,
            360,
            { gasLimit: maxGasLimit }
        )

        await defaultProvider.waitForTransaction(rebalanceResult.hash);

        table.push(["AlphaVault0", AlphaVault0.address])
        table.push(["AlphaVault1", AlphaVault1.address])
        table.push(["AlphaVault0-PassiveStrategy", AVStrategy0.address])
        table.push(["AlphaVault1-PassiveStrategy", AVStrategy1.address])
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
            ['alphaVaultPassiveStrategyAddress0', AVStrategy0.address],
            ['alphaVaultPassiveStrategyAddress1', AVStrategy1.address],
            ['uniswapBooster', UniswapBooster.address],
            ['WETH', WETHToken.address],
            ['DAI', DAIToken.address],
        ];

        await client.query(`DELETE FROM contracts;`)

        await client.query(format(`
      INSERT INTO contracts (contract, address)
        VALUES %L
        ON CONFLICT (contract) DO UPDATE
          SET contract = excluded.contract,
              address = excluded.address;
      `, values))

        await client.end();
    }
}