import { ethers } from "hardhat";
import { BigNumber, BigNumberish } from '@ethersproject/bignumber';
import { defaultPoolAddress, r, g, w, contractAddresses, ethDefaultProvider, nonfungiblePositionManagerAddress, token1Decimals, token0Decimals, swapRouterAddress, uniswapKeyAddress, swapRouterABI, nonfungiblePositionManagerABI, poolABI, uniswapKeyABI, alphaVaultAddress, alphaVaultPassiveStrategyAddress, passiveStrategyABI, alphaVaultABI, maxGasLimit, delay } from "./config/config";
import { TickData } from "./models/TickData";
import { SwapResult } from "./models/SwapResult";
import { RebalanceResult } from "./models/RebalanceResult";
import { DepositResult } from "./models/DepositResult";

export class Scenario {
    static async SwapExactInput(amountIn: BigNumberish = 100, amountOutMinimum: BigNumberish = 50) {
        let [keyA, keyB] = await ethers.getSigners();
        const defaultProvider = ethers.getDefaultProvider(ethDefaultProvider);
        defaultProvider.pollingInterval = 1;

        try {
            const blockTimestamp = (await defaultProvider.getBlock(await defaultProvider.getBlockNumber())).timestamp;
            const swapRouter = new ethers.Contract(swapRouterAddress, swapRouterABI, defaultProvider);
            const uniswapV3Pool = new ethers.Contract(defaultPoolAddress, poolABI, defaultProvider);

            const result = await swapRouter.connect(keyA).exactInputSingle({
                tokenIn: contractAddresses.get("WETH"),
                tokenOut: contractAddresses.get("DAI"),
                fee: 3000,
                recipient: keyA.address,
                deadline: blockTimestamp + 1800,
                amountIn: amountIn, // ETH
                amountOutMinimum: amountOutMinimum, // DAI
                sqrtPriceLimitX96: 0, // No limit
            },
                { gasLimit: maxGasLimit }
            );

            const swapPromise = new Promise((resolve, reject) => {
                uniswapV3Pool.on("Swap", (sender, recipient, amount0, amount1, sqrtPriceX96, liquidity, tick, event) => {
                    if (result != null && event.transactionHash == result.hash) {
                        event.removeListener()

                        resolve({
                            tickSwap: tick,
                            amount0: amount0.toString(),
                            amount1: amount1.toString(),
                            sqrtPriceX96: sqrtPriceX96.toString(),
                            liquidity: liquidity.toString()
                        });
                    }
                });

                setTimeout(() => {
                    reject(new Error('Timeout while waiting for event'));
                }, 1000);
            });

            return (await swapPromise) as SwapResult;
        } catch (err) {
            console.log(err);

            throw err;
        }
    }

    static async SwapExactOutput(amountOut: BigNumberish = 100, amountInMinimum: BigNumberish = 50) {
        let [keyA, keyB] = await ethers.getSigners();
        const defaultProvider = ethers.getDefaultProvider(ethDefaultProvider);
        defaultProvider.pollingInterval = 1;

        try {
            const blockTimestamp = (await defaultProvider.getBlock(await defaultProvider.getBlockNumber())).timestamp;
            const swapRouter = new ethers.Contract(swapRouterAddress, swapRouterABI, defaultProvider);
            const uniswapV3Pool = new ethers.Contract(defaultPoolAddress, poolABI, defaultProvider);

            await delay(1);

            const result = await swapRouter.connect(keyA).exactOutputSingle({
                tokenIn: contractAddresses.get("WETH"),
                tokenOut: contractAddresses.get("DAI"),
                fee: 3000,
                recipient: keyA.address,
                deadline: blockTimestamp + 1800,
                amountOut: amountOut, // ETH
                amountInMinimum: amountInMinimum, // DAI
                sqrtPriceLimitX96: 0, // No limit
            },
                { gasLimit: maxGasLimit }
            );

            const swapPromise = new Promise((resolve, reject) => {
                uniswapV3Pool.on("Swap", (sender, recipient, amount0, amount1, sqrtPriceX96, liquidity, tick, event) => {
                    if (result != null && event.transactionHash == result.hash) {
                        event.removeListener()

                        resolve({
                            tickSwap: tick,
                            amount0: amount0.toString(),
                            amount1: amount1.toString(),
                            sqrtPriceX96: sqrtPriceX96.toString(),
                            liquidity: liquidity.toString()
                        });
                    }
                });

                setTimeout(() => {
                    reject(new Error('Timeout while waiting for event'));
                }, 1000);
            });

            await defaultProvider.waitForTransaction(result.hash);
            return (await swapPromise) as SwapResult;
        } catch (err) {
            console.log(err);

            throw err;
        }
    }

    static async AddLiquidity(tickLower: number, tickUpper: number, amount0: number = 100, amount1: number = 100) {
        let [keyA] = await ethers.getSigners();
        const defaultProvider = ethers.getDefaultProvider(ethDefaultProvider);

        try {
            const recipientAddress = await keyA.getAddress();
            const blockTimestamp = (await defaultProvider.getBlock(await defaultProvider.getBlockNumber())).timestamp;
            const npm = new ethers.Contract(nonfungiblePositionManagerAddress, nonfungiblePositionManagerABI, defaultProvider);

            const result = await npm.connect(keyA).mint({
                token0: contractAddresses.get("WETH"),
                token1: contractAddresses.get("DAI"),
                fee: 3000,
                tickLower: tickLower,
                tickUpper: tickUpper,
                amount0Desired: amount0, // ETH
                amount1Desired: amount1, // DAI?
                amount0Min: 0, // ETH
                amount1Min: 0, // DAI
                recipient: recipientAddress,
                deadline: blockTimestamp + 1800
            },
                { gasLimit: maxGasLimit }
            );

            await defaultProvider.waitForTransaction(result.hash);
        } catch (err) {
            console.log(err);

            throw err;
        }
    }

    static async DecreaseLiquidity(tokenId: number, amount0Min: number, amount1Min: number, liquidity: number) {
        let [keyA] = await ethers.getSigners();
        const defaultProvider = ethers.getDefaultProvider(ethDefaultProvider);

        try {
            const blockTimestamp = (await defaultProvider.getBlock(await defaultProvider.getBlockNumber())).timestamp;
            const npm = new ethers.Contract(nonfungiblePositionManagerAddress, nonfungiblePositionManagerABI, defaultProvider);

            const result = await npm.connect(keyA).decreaseLiquidity({
                tokenId: tokenId,
                liquidity: liquidity,
                amount0Min: amount0Min,
                amount1Min: amount1Min,
                deadline: blockTimestamp + 120
            },
                { gasLimit: maxGasLimit }
            );

            await defaultProvider.waitForTransaction(result.hash);
        } catch (err) {
            console.log(err);

            throw err;
        }
    }

    static async Positions(tokenId: number) {
        let [keyA] = await ethers.getSigners();
        const defaultProvider = ethers.getDefaultProvider(ethDefaultProvider);

        try {
            const npm = new ethers.Contract(nonfungiblePositionManagerAddress, nonfungiblePositionManagerABI, defaultProvider);

            const result = await npm.connect(keyA).positions(
                tokenId,
                { gasLimit: maxGasLimit }
            );

            return result;
        } catch (err) {
            console.log(err);

            throw err;
        }
    }


    static async PositionsUniswap(tickLower: number, tickUpper: number) {
        let [keyA] = await ethers.getSigners();
        const defaultProvider = ethers.getDefaultProvider(ethDefaultProvider);

        try {
            const uniswapV3Key = new ethers.Contract(uniswapKeyAddress, uniswapKeyABI, defaultProvider);
            const uniswapV3Pool = new ethers.Contract(defaultPoolAddress, poolABI, defaultProvider);

            const result = await uniswapV3Key.connect(keyA).compute(keyA.address, tickLower, tickUpper);
            const position = await uniswapV3Pool.connect(keyA).positions(result.toString());

            return position;
        } catch (err) {
            console.log(err);

            throw err;
        }
    }

    static async Burn(tickLower: number, tickUpper: number, liquidity: number) {
        let [keyA] = await ethers.getSigners();
        const defaultProvider = ethers.getDefaultProvider(ethDefaultProvider);

        try {
            const uniswapV3Pool = new ethers.Contract(defaultPoolAddress, poolABI, defaultProvider);

            const result = await uniswapV3Pool.connect(keyA).burn(
                tickLower,
                tickUpper,
                liquidity,
                { gasLimit: maxGasLimit }
            );

            await defaultProvider.waitForTransaction(result.hash);
        } catch (err) {
            console.log(err);

            throw err;
        }
    }

    static async Rebalance() {
        let [keyA] = await ethers.getSigners();
        const defaultProvider = ethers.getDefaultProvider(ethDefaultProvider);

        try {
            const passiveStrategy = new ethers.Contract(alphaVaultPassiveStrategyAddress, passiveStrategyABI, defaultProvider);
            const alphaVault = new ethers.Contract(alphaVaultAddress, alphaVaultABI, defaultProvider);

            const result = await passiveStrategy.connect(keyA).rebalance(
                { gasLimit: maxGasLimit }
            );

            const snapshotPromise = new Promise((resolve, reject) => {
                alphaVault.once("Snapshot", (tick, totalAmount0, totalAmount1, totalSupply, event) => {
                    event.removeListener();

                    if (event.transactionHash == result.hash)
                        resolve({
                            tickRebalance: tick,
                            totalAmount0: totalAmount0.toString(),
                            totalAmount1: totalAmount1.toString(),
                            totalSupply: totalSupply.toString(),
                        });
                    else reject();
                });

                setTimeout(() => {
                    reject(new Error('Timeout while waiting for event'));
                }, 1000);
            });

            await defaultProvider.waitForTransaction(result.hash);
            return (await snapshotPromise) as RebalanceResult;
        } catch (err) {
            console.log(err);

            throw err;
        }
    }

    static async Deposit(amount0Desired: BigNumberish, amount1Desired: BigNumberish, amount0Min: BigNumberish = 0, amount1Min: BigNumberish = 0) {
        let [keyA] = await ethers.getSigners();
        const defaultProvider = ethers.getDefaultProvider(ethDefaultProvider);

        try {
            const alphaVault = new ethers.Contract(alphaVaultAddress, alphaVaultABI, defaultProvider);

            const result = await alphaVault.connect(keyA).deposit(
                amount0Desired,
                amount1Desired,
                amount0Min,
                amount1Min,
                keyA.address,
                { gasLimit: maxGasLimit }
            );

            const depositPromise = new Promise((resolve, reject) => {
                alphaVault.once("Deposit", (sender, to, shares, amount0, amount1, event) => {
                    event.removeListener();

                    if (event.transactionHash == result.hash)
                        resolve({
                            shares: shares.toString(),
                            amount0: amount0.toString(),
                            amount1: amount1.toString()
                        });
                    else reject();
                });

                setTimeout(() => {
                    reject(new Error('Timeout while waiting for event'));
                }, 1000);
            });

            await defaultProvider.waitForTransaction(result.hash);
            return (await depositPromise) as DepositResult;
        } catch (err) {
            console.log(err);

            throw err;
        }
    }

    static async Withdraw(shares: BigNumberish, amount0Min: BigNumberish = 0, amount1Min: BigNumberish = 0) {
        let [keyA] = await ethers.getSigners();
        const defaultProvider = ethers.getDefaultProvider(ethDefaultProvider);

        try {
            const alphaVault = new ethers.Contract(alphaVaultAddress, alphaVaultABI, defaultProvider);

            const result = await alphaVault.connect(keyA).withdraw(
                shares,
                amount0Min,
                amount1Min,
                keyA.address,
                { gasLimit: maxGasLimit }
            );

            const _withdrawPromise = new Promise((resolve, reject) => {
                alphaVault.once("Withdraw", (sender, to, shares, amount0, amount1, event) => {
                    event.removeListener();

                    if (event.transactionHash == result.hash)
                        resolve({
                            // sender: sender,
                            // to: to,
                            shares: shares.toString(),
                            amount0: amount0.toString(),
                            amount1: amount1.toString()
                        });
                    else reject();
                });

                setTimeout(() => {
                    reject(new Error('Timeout while waiting for event'));
                }, 1000);
            });

            await defaultProvider.waitForTransaction(result.hash);
            return await _withdrawPromise;
        } catch (err) {
            console.log(err);

            throw (err);
        }
    }

    static async PrintPoolData(ticksToRead: number, tickCurrent?: number) {
        const [keyA] = await ethers.getSigners();
        const defaultProvider = ethers.getDefaultProvider();
        const uniswapV3Pool = new ethers.Contract(defaultPoolAddress, poolABI, defaultProvider);
        let poolSlot0 = await uniswapV3Pool.connect(keyA).slot0();

        if (tickCurrent == null)
            tickCurrent = poolSlot0.tick;

        tickCurrent = Math.trunc(tickCurrent! / 60) * 60

        console.log("Current tick: ", poolSlot0.tick);
        console.log("Observation index: ", poolSlot0.observationIndex);
        console.log("Observation cardinality: ", poolSlot0.observationCardinalityNext);
        console.log("SqrtPrice: ", poolSlot0.sqrtPriceX96.toString());
        console.log("Protocol fee: ", poolSlot0.feeProtocol);

        for (let i = -ticksToRead; i < ticksToRead + 1; i++) {
            let tickValue = tickCurrent! + i * 60;
            let currentTick = await uniswapV3Pool.connect(keyA).ticks(tickValue);

            console.log(r + "**************************************" + w);
            console.log("Tick: " + g + tickValue + w);
            console.log("Price: " + g + Scenario.tickToPrice(tickValue) + w);
            console.log("Initialized: ", g + currentTick.initialized + w);
            console.log("Liquidity gross: ", g + currentTick.liquidityGross.toString() + w);
            console.log("Liquidity net: ", g + currentTick.liquidityNet.toString() + w);
            console.log("Tick cumulative outside: ", g + currentTick.tickCumulativeOutside.toString() + w);
            console.log("Seconds per liquidity outside: ", g + currentTick.secondsPerLiquidityOutsideX128 + w);
            console.log("Seconds outside: ", g + currentTick.secondsOutside + w);
            console.log("feeGrowthOutside0X128: ", g + currentTick.feeGrowthOutside0X128.toString() + w);
            console.log("feeGrowthOutside1X128: ", g + currentTick.feeGrowthOutside1X128.toString() + w);
            console.log(r + "**************************************" + w);
        }
    }

    static async GetTicksData(ticksToRead: number, tickCurrent?: number) {
        const [keyA] = await ethers.getSigners();
        const defaultProvider = ethers.getDefaultProvider();
        const uniswapV3Pool = new ethers.Contract(defaultPoolAddress, poolABI, defaultProvider);
        const ticksData: TickData[] = [];

        if (tickCurrent == null) {
            let poolSlot0 = await uniswapV3Pool.connect(keyA).slot0();

            tickCurrent = poolSlot0.tick;
            tickCurrent = Math.trunc(tickCurrent! / 60) * 60
        }

        for (let i = -ticksToRead; i < ticksToRead + 1; i++) {
            let tickValue = tickCurrent! + i * 60;
            let currentTick = await uniswapV3Pool.connect(keyA).ticks(tickValue);

            ticksData.push({
                tick: tickValue,
                price: Scenario.tickToPrice(tickValue).toString(),
                initialized: currentTick.initialized,
                liquidityGross: currentTick.liquidityGross.toString(),
                liquidityNet: currentTick.liquidityGross.toString(),
                tickCumulativeOutside: currentTick.tickCumulativeOutside.toString(),
                secondsPerLiquidityOutsideX128: currentTick.secondsPerLiquidityOutsideX128.toString(),
                secondsOutside: currentTick.secondsOutside.toString(),
                feeGrowthOutside0X128: currentTick.feeGrowthOutside0X128.toString(),
                feeGrowthOutside1X128: currentTick.feeGrowthOutside1X128.toString()
            });
        }

        return ticksData;
    }

    static async GetSlot0() {
        const [keyA] = await ethers.getSigners();
        const defaultProvider = ethers.getDefaultProvider();
        const uniswapV3Pool = new ethers.Contract(defaultPoolAddress, poolABI, defaultProvider);

        return await uniswapV3Pool.connect(keyA).slot0();
    }

    static async GetPoolLiquidity() {
        const [keyA] = await ethers.getSigners();
        const defaultProvider = ethers.getDefaultProvider();
        const uniswapV3Pool = new ethers.Contract(defaultPoolAddress, poolABI, defaultProvider);

        return await uniswapV3Pool.connect(keyA).liquidity();
    }

    static async GetBalance0() {
        const [keyA] = await ethers.getSigners();
        const defaultProvider = ethers.getDefaultProvider();
        const alphaVault = new ethers.Contract(alphaVaultAddress, alphaVaultABI, defaultProvider);

        const balance0 = await alphaVault.connect(keyA).getBalance0()

        return {
            balance0: balance0.toString()
        }
    }

    static async GetBalance1() {
        const [keyA] = await ethers.getSigners();
        const defaultProvider = ethers.getDefaultProvider();
        const alphaVault = new ethers.Contract(alphaVaultAddress, alphaVaultABI, defaultProvider);

        const balance1 = await alphaVault.connect(keyA).getBalance1()

        return {
            balance1: balance1.toString()
        }
    }

    static async GetTotalAmounts() {
        const [keyA] = await ethers.getSigners();
        const defaultProvider = ethers.getDefaultProvider();
        const alphaVault = new ethers.Contract(alphaVaultAddress, alphaVaultABI, defaultProvider);

        const totalAmounts = await alphaVault.connect(keyA).getTotalAmounts()

        return {
            total0: totalAmounts.total0.toString(),
            total1: totalAmounts.total1.toString(),
        }
    }

    static async GetPositionAmounts(tickLower: number, tickUpper: number) {
        const [keyA] = await ethers.getSigners();
        const defaultProvider = ethers.getDefaultProvider();
        const alphaVault = new ethers.Contract(alphaVaultAddress, alphaVaultABI, defaultProvider);

        const positionAmounts = await alphaVault.connect(keyA).getPositionAmounts(tickLower, tickUpper)

        return {
            amount0: positionAmounts.amount0.toString(),
            amount1: positionAmounts.amount1.toString()
        }
    }

    static async EmergencyBurn(tickLower: number, tickUpper: number, liquidity: BigNumberish) {
        const [keyA] = await ethers.getSigners();
        const defaultProvider = ethers.getDefaultProvider();
        const alphaVault = new ethers.Contract(alphaVaultAddress, alphaVaultABI, defaultProvider);

        const result = await alphaVault.connect(keyA).emergencyBurn(tickLower, tickUpper, liquidity);
        await defaultProvider.waitForTransaction(result.hash);
    }

    static async GetAlphaVaultData() {
        const [keyA] = await ethers.getSigners();
        const defaultProvider = ethers.getDefaultProvider();
        const alphaVault = new ethers.Contract(alphaVaultAddress, alphaVaultABI, defaultProvider);

        const baseLower = await alphaVault.connect(keyA).baseLower();
        const baseUpper = await alphaVault.connect(keyA).baseUpper();
        const limitLower = await alphaVault.connect(keyA).limitLower();
        const limitUpper = await alphaVault.connect(keyA).limitUpper();
        const accruedProtocolFees0 = await alphaVault.connect(keyA).accruedProtocolFees0();
        const accruedProtocolFees1 = await alphaVault.connect(keyA).accruedProtocolFees1();

        return {
            baseUpper: baseUpper,
            baseLower: baseLower,
            limitUpper: limitUpper,
            limitLower: limitLower,
            accruedProtocolFees0: accruedProtocolFees0.toString(),
            accruedProtocolFees1: accruedProtocolFees1.toString()
        }
    }


    static tickToPrice(tick: number) {
        const tokenDecimals = token0Decimals - token1Decimals;

        return (1 / (1.0001 ** tick)) * (10 ** tokenDecimals);
    }
}