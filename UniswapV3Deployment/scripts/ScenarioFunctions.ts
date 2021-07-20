import { ethers } from "hardhat";
import { BigNumber, BigNumberish } from '@ethersproject/bignumber';
import {
    r, g, w,
    ethDefaultProvider,
    token1Decimals,
    token0Decimals,
    swapRouterABI,
    nonfungiblePositionManagerABI,
    poolABI,
    uniswapKeyABI,
    passiveStrategyABI,
    alphaVaultABI,
    maxGasLimit,
    ERC20TokenABI,
    defaultDecDivider,
    feeTier,
    FEE_TIER_TO_TICK_SPACING,
    PRICE_FIXED_DIGITS,
    MAX_UINT128,
    FEE_TIER_TO_FEE_AMOUNT,
    tickSpacing,
    isBetween
} from "./config/config";
import { TickData } from "./models/TickData";
import { SwapResult } from "./models/SwapResult";
import { RebalanceResult } from "./models/RebalanceResult";
import { DepositResult } from "./models/DepositResult";
import { Direction, PoolResult, PoolTickData, Tick, TickEntry, TickProcessed } from "./models/TVL";
import keyBy from 'lodash.keyby'
import { Dictionary } from 'lodash'
import { CurrencyAmount, Token, Price } from '@uniswap/sdk-core'
import { TickMath, tickToPrice, priceToClosestTick, Pool } from '@uniswap/v3-sdk'
import { Decimal } from 'decimal.js';
import { getContract } from "./config/contracts";

var Fraction = require('fractional').Fraction

export class Scenario {
    static async SwapExactInput(amountIn: BigNumberish = 100, amountOutMinimum: BigNumberish = 50, tokenIn: string, tokenOut: string) {
        let [keyA, keyB] = await ethers.getSigners();
        const defaultProvider = ethers.getDefaultProvider(ethDefaultProvider);
        defaultProvider.pollingInterval = 1;

        try {
            const blockTimestamp = (await defaultProvider.getBlock(await defaultProvider.getBlockNumber())).timestamp;
            const swapRouter = new ethers.Contract(getContract('swapRouterAddress'), swapRouterABI, defaultProvider);
            const uniswapV3Pool = new ethers.Contract(getContract('defaultPoolAddress'), poolABI, defaultProvider);

            const result = await swapRouter.connect(keyA).exactInputSingle({
                tokenIn: getContract(tokenIn),
                tokenOut: getContract(tokenOut),
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
                            priceAfterSwap: Scenario.TickToPrice(tick),
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

    static async SwapExactOutput(amountOut: BigNumberish = 100, amountInMaximum: BigNumberish = 50, tokenIn: string, tokenOut: string) {
        let [keyA, keyB] = await ethers.getSigners();
        const defaultProvider = ethers.getDefaultProvider(ethDefaultProvider);
        defaultProvider.pollingInterval = 1;

        try {
            const blockTimestamp = (await defaultProvider.getBlock(await defaultProvider.getBlockNumber())).timestamp;
            const swapRouter = new ethers.Contract(getContract('swapRouterAddress'), swapRouterABI, defaultProvider);
            const uniswapV3Pool = new ethers.Contract(getContract('defaultPoolAddress'), poolABI, defaultProvider);

            //await delay(1);

            const result = await swapRouter.connect(keyA).exactOutputSingle({
                tokenIn: getContract(tokenIn),
                tokenOut: getContract(tokenOut),
                fee: 3000,
                recipient: keyA.address,
                deadline: blockTimestamp + 1800,
                amountOut: amountOut, // ETH
                amountInMaximum: amountInMaximum, // DAI
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
            const npm = new ethers.Contract(getContract('nonfungiblePositionManagerAddress'), nonfungiblePositionManagerABI, defaultProvider);

            const result = await npm.connect(keyA).mint({
                token0: getContract("WETH"),
                token1: getContract("DAI"),
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
            const npm = new ethers.Contract(getContract('nonfungiblePositionManagerAddress'), nonfungiblePositionManagerABI, defaultProvider);

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
            const npm = new ethers.Contract(getContract('nonfungiblePositionManagerAddress'), nonfungiblePositionManagerABI, defaultProvider);

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
            const uniswapV3Key = new ethers.Contract(getContract('uniswapKeyAddress'), uniswapKeyABI, defaultProvider);
            const uniswapV3Pool = new ethers.Contract(getContract('defaultPoolAddress'), poolABI, defaultProvider);

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
            const uniswapV3Pool = new ethers.Contract(getContract('defaultPoolAddress'), poolABI, defaultProvider);

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

    static async Rebalance(vault: number) {
        let [keyA] = await ethers.getSigners();
        const defaultProvider = ethers.getDefaultProvider(ethDefaultProvider);

        try {
            const vaultAddress = `alphaVaultAddress${vault}`;
            const passiveStrategy = new ethers.Contract(getContract('alphaVaultPassiveStrategyAddress'), passiveStrategyABI, defaultProvider);
            const alphaVault = new ethers.Contract(getContract(vaultAddress), alphaVaultABI, defaultProvider);

            const result = await passiveStrategy.connect(keyA).rebalance(
                { gasLimit: maxGasLimit }
            );

            const snapshotPromise = new Promise((resolve, reject) => {
                alphaVault.once("Snapshot", (tick, totalAmount0, totalAmount1, totalSupply, event) => {
                    //event.removeListener();

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

    static async ManualRebalance(
        swapAmount: BigNumberish,
        sqrtPriceLimitX96: BigNumberish,
        _baseLower: BigNumberish,
        _baseUpper: BigNumberish,
        _bidLower: BigNumberish,
        _bidUpper: BigNumberish,
        _askLower: BigNumberish,
        _askUpper: BigNumberish,
        vault: number
    ) {
        let [keyA] = await ethers.getSigners();
        const defaultProvider = ethers.getDefaultProvider(ethDefaultProvider);

        try {
            const vaultAddress = `alphaVaultAddress${vault}`;
            const alphaVault = new ethers.Contract(getContract(vaultAddress), alphaVaultABI, defaultProvider);

            const result = await alphaVault.connect(keyA).rebalance(
                swapAmount,
                sqrtPriceLimitX96,
                _baseLower,
                _baseUpper,
                _bidLower,
                _bidUpper,
                _askLower,
                _askUpper,
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

    static async Deposit(
        amount0Desired: BigNumberish,
        amount1Desired: BigNumberish,
        amount0Min: BigNumberish = 0,
        amount1Min: BigNumberish = 0,
        vault: number
    ) {
        let [keyA] = await ethers.getSigners();
        const defaultProvider = ethers.getDefaultProvider(ethDefaultProvider);

        try {
            const vaultAddress = `alphaVaultAddress${vault}`;
            const alphaVault = new ethers.Contract(getContract(vaultAddress), alphaVaultABI, defaultProvider);

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

    static async Withdraw(shares: BigNumberish, amount0Min: BigNumberish = 0, amount1Min: BigNumberish = 0, vault: number) {
        let [keyA] = await ethers.getSigners();
        const defaultProvider = ethers.getDefaultProvider(ethDefaultProvider);

        try {
            const vaultAddress = `alphaVaultAddress${vault}`;
            const alphaVault = new ethers.Contract(getContract(vaultAddress), alphaVaultABI, defaultProvider);

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

    static async GetTVLData(expectedTick: number) {
        const slot0 = await Scenario.GetSlot0();
        const poolResult = await Scenario.getPoolResult();
        const currentTick = slot0.tick;
        const nearestTick: number = Math.floor(slot0.tick / tickSpacing) * tickSpacing;
        const nearestExpectedTick: number = Math.floor(expectedTick / tickSpacing) * tickSpacing;

        if (currentTick == expectedTick)
            return { message: 'ExpectedTick is equal to currentTick' };

        const ticksToGenerate = (Math.abs(nearestExpectedTick - nearestTick) / tickSpacing) + 3;
        let startingTick = Math.min(nearestExpectedTick, nearestTick) - tickSpacing;

        const ticks = [...Array(ticksToGenerate)].map((_, i) => startingTick + i * tickSpacing);

        const sliceRange = (currentTick % tickSpacing == 0 && expectedTick < currentTick) || (expectedTick % tickSpacing == 0 && expectedTick > currentTick)
        const tvlEntries = await Scenario.GetTVL(ticks) as any[]
        const entryTickIdx = tvlEntries.findIndex((x) => x.tickIdx == startingTick)
        const tvlRange = tvlEntries.slice(entryTickIdx, entryTickIdx + ticksToGenerate)
        const tvlRangeExpectedToNearest = tvlRange.slice(1, sliceRange ? tvlRange.length - 2 : tvlRange.length - 1)
        const tvlRangeFullSpacing = tvlRange.slice(2, sliceRange ? tvlRange.length - 3 : tvlRange.length - 2)

        let oneTick: boolean = Math.abs(expectedTick - currentTick) < 60 && isBetween(Math.floor(currentTick / tickSpacing) * tickSpacing, Math.ceil(currentTick / tickSpacing) * tickSpacing, expectedTick)
        let lowerTVL: number = 0
        let upperTVL: number = 0

        if (expectedTick > currentTick) {
            lowerTVL = (tickSpacing - Math.abs(Math.abs(currentTick) - Math.abs(nearestTick))) / tickSpacing
            upperTVL = Math.abs(Math.abs(expectedTick) - Math.abs(nearestExpectedTick)) / tickSpacing

            if (oneTick) {
                lowerTVL = Math.abs(Math.abs(expectedTick) - Math.abs(currentTick)) / tickSpacing
                upperTVL = 0
            }
        } else {
            lowerTVL = Math.abs((Math.ceil(expectedTick / tickSpacing) * tickSpacing) - expectedTick) / tickSpacing
            upperTVL = Math.abs((Math.floor(currentTick / tickSpacing) * tickSpacing) - currentTick) / tickSpacing

            if (oneTick) {
                lowerTVL = Math.abs(Math.abs(expectedTick) - Math.abs(currentTick)) / tickSpacing
                upperTVL = 0
            }
        }

        let sumTvlToken0: number = 0
        let sumTvlToken1: number = 0

        if (lowerTVL != 0) {
            sumTvlToken0 += lowerTVL * tvlRangeExpectedToNearest[0].tvlToken0
            sumTvlToken1 += lowerTVL * tvlRangeExpectedToNearest[0].tvlToken1
        } else if (!oneTick) {
            sumTvlToken0 += tvlRangeExpectedToNearest[0].tvlToken0
            sumTvlToken1 += tvlRangeExpectedToNearest[0].tvlToken1
        }

        const lastRangeIndex: number = tvlRangeExpectedToNearest.length - 1

        if (upperTVL != 0) {
            sumTvlToken0 += upperTVL * tvlRangeExpectedToNearest[lastRangeIndex].tvlToken0
            sumTvlToken1 += upperTVL * tvlRangeExpectedToNearest[lastRangeIndex].tvlToken1
        } else if (Math.abs(nearestTick - nearestExpectedTick) != 60 && !oneTick) {
            sumTvlToken0 += tvlRangeExpectedToNearest[lastRangeIndex].tvlToken0
            sumTvlToken1 += tvlRangeExpectedToNearest[lastRangeIndex].tvlToken1
        }

        sumTvlToken0 += tvlRangeFullSpacing.reduce((x, y) => x + y.tvlToken0, 0)
        sumTvlToken1 += tvlRangeFullSpacing.reduce((x, y) => x + y.tvlToken1, 0)

        //let updateFullRange: boolean = expectedTick % tickSpacing == 0 && currentTick % tickSpacing == 0


        // if (expectedTick % tickSpacing == 0 && Math.abs(expectedTick - nearestTick) > tickSpacing && !updateFullRange) {
        //     sumTvlToken0 += tvlRangeExpectedToNearest[0].tvlToken0
        //     sumTvlToken1 += tvlRangeExpectedToNearest[0].tvlToken1
        //     // slice(0, tvlRangeExpectedToNearest.length - 1).reduce((x, y) => x + y.tvlToken0, 0)
        //     // sumTvlToken1 = tvlRangeExpectedToNearest.slice(0, tvlRangeExpectedToNearest.length - 1).reduce((x, y) => x + y.tvlToken1, 0)
        // }

        // if (updateFullRange) {
        //     sumTvlToken0 += tvlRangeExpectedToNearest.slice(0, tvlRangeExpectedToNearest.length - 1).reduce((x, y) => x + y.tvlToken0, 0)
        //     sumTvlToken1 += tvlRangeExpectedToNearest.slice(0, tvlRangeExpectedToNearest.length - 1).reduce((x, y) => x + y.tvlToken1, 0)
        // } else {
        //     sumTvlToken0 += tvlRangeFullSpacing.reduce((x, y) => x + y.tvlToken0, 0)
        //     sumTvlToken1 += tvlRangeFullSpacing.reduce((x, y) => x + y.tvlToken1, 0)
        // }

        // if (!(expectedTick % 60 == 0 && currentTick % 60 == 0)) {
        //     if (nearestExpectedTick != nearestTick) {
        //         sumTvlToken0 += lowerTVL * tvlRangeExpectedToNearest[0].tvlToken0
        //         sumTvlToken0 += upperTVL * tvlRangeExpectedToNearest[tvlRangeExpectedToNearest.length - 1].tvlToken0

        //         sumTvlToken1 += lowerTVL * tvlRangeExpectedToNearest[0].tvlToken1
        //         sumTvlToken1 += upperTVL * tvlRangeExpectedToNearest[tvlRangeExpectedToNearest.length - 1].tvlToken1
        //     } else {
        //         sumTvlToken0 += (Math.abs(expectedTick - currentTick) / tickSpacing) * tvlRangeExpectedToNearest[0].tvlToken0
        //         sumTvlToken1 += (Math.abs(expectedTick - currentTick) / tickSpacing) * tvlRangeExpectedToNearest[0].tvlToken1
        //     }
        // }

        const token0Calculated = new Decimal(sumTvlToken0).mul(new Decimal(10).pow(18)).add(1);
        const token1Calculated = new Decimal(sumTvlToken1).mul(new Decimal(10).pow(18)).add(1);

        let tokenToBuy: string = ''
        let tokenToSell: string = ''
        let amountToBuy: string = ''

        if (expectedTick > currentTick) {
            tokenToBuy = poolResult.pool.token0.symbol
            tokenToSell = poolResult.pool.token1.symbol
            amountToBuy = token0Calculated.toFixed()
        }
        else {
            tokenToBuy = poolResult.pool.token1.symbol
            tokenToSell = poolResult.pool.token0.symbol
            amountToBuy = token1Calculated.toFixed()
        }

        if (expectedTick > slot0.tick)
            sumTvlToken1 = -sumTvlToken1;
        else sumTvlToken0 = -sumTvlToken0;

        return {
            // expectedTicks: tvlRangeExpectedToNearest,
            // fullRange: tvlRangeFullSpacing,
            data: {
                tick: slot0.tick,
                price: Scenario.TickToPrice(slot0.tick).toString(),
                nearestTick: nearestTick,
                expectedTick: expectedTick,
                nearestExpectedTick: nearestExpectedTick,
                expectedTickPrice: Scenario.TickToPrice(expectedTick).toString(),
                tokenToBuy: tokenToBuy,
                tokenToSell: tokenToSell,
                amountToBuy: amountToBuy,
                comment: `You have to buy ${amountToBuy} ${tokenToBuy}`
            },
            tvl: {
                lowerTVL: lowerTVL,
                upperTVL: upperTVL,
                tvlToken0: sumTvlToken0,
                tvlToken1: sumTvlToken1,
            },
            ticks: tvlRange
        };
    }

    static async PrintPoolData(ticksToRead: number, tickCurrent?: number) {
        const [keyA] = await ethers.getSigners();
        const defaultProvider = ethers.getDefaultProvider();
        const uniswapV3Pool = new ethers.Contract(getContract('defaultPoolAddress'), poolABI, defaultProvider);
        let poolSlot0 = await uniswapV3Pool.connect(keyA).slot0();

        if (tickCurrent == null)
            tickCurrent = poolSlot0.tick;

        tickCurrent = Math.floor(tickCurrent! / 60) * 60

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
            console.log("Price: " + g + Scenario.TickToPrice(tickValue) + w);
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
        const uniswapV3Pool = new ethers.Contract(getContract('defaultPoolAddress'), poolABI, defaultProvider);
        const ticksData: TickData[] = [];

        if (tickCurrent == null) {
            let poolSlot0 = await uniswapV3Pool.connect(keyA).slot0();

            tickCurrent = poolSlot0.tick;
            tickCurrent = Math.floor(tickCurrent! / 60) * 60
        }

        for (let i = -ticksToRead; i < ticksToRead + 1; i++) {
            let tickValue = tickCurrent! + i * 60;
            let currentTick = await uniswapV3Pool.connect(keyA).ticks(tickValue);

            ticksData.push({
                tick: tickValue,
                price: Scenario.TickToPrice(tickValue).toString(),
                initialized: currentTick.initialized,
                liquidityGross: currentTick.liquidityGross.toString(),
                liquidityNet: currentTick.liquidityNet.toString(),
                tickCumulativeOutside: currentTick.tickCumulativeOutside.toString(),
                secondsPerLiquidityOutsideX128: currentTick.secondsPerLiquidityOutsideX128.toString(),
                secondsOutside: currentTick.secondsOutside.toString(),
                feeGrowthOutside0X128: currentTick.feeGrowthOutside0X128.toString(),
                feeGrowthOutside1X128: currentTick.feeGrowthOutside1X128.toString()
            });
        }

        return ticksData;
    }

    static async GetTVL(ticks: number[], tick?: number) {
        const [keyA] = await ethers.getSigners();
        const defaultProvider = ethers.getDefaultProvider();
        const uniswapV3Pool = new ethers.Contract(getContract('defaultPoolAddress'), poolABI, defaultProvider);
        const initializedTicks: Tick[] = [];

        const poolResult: PoolResult = await Scenario.getPoolResult();

        for (let i = 0; i < ticks.length; i++) {
            let currentTick = await uniswapV3Pool.connect(keyA).ticks(ticks[i]);

            initializedTicks.push({
                tickIdx: ticks[i].toString(),
                liquidityGross: currentTick.liquidityGross.toString(),
                liquidityNet: currentTick.liquidityNet.toString(),
                price0: '0',
                price1: '0'
            });
        }

        const tickSpacing = FEE_TIER_TO_TICK_SPACING(poolResult.pool.feeTier)
        const activeTickIdx = Math.floor(+poolResult.pool.tick / tickSpacing) * tickSpacing
        const tickIdxToInitializedTick: Dictionary<Tick> = keyBy(initializedTicks, 'tickIdx')

        const token0 = new Token(1, poolResult.pool.token0.id, parseInt(poolResult.pool.token0.decimals))
        const token1 = new Token(1, poolResult.pool.token1.id, parseInt(poolResult.pool.token1.decimals))

        const activeTickProcessed: TickProcessed = {
            liquidityActive: BigNumber.from(poolResult.pool.liquidity),
            tickIdx: activeTickIdx,
            liquidityNet: BigNumber.from(0),
            price0: tickToPrice(token0, token1, activeTickIdx).toFixed(PRICE_FIXED_DIGITS),
            price1: tickToPrice(token1, token0, activeTickIdx).toFixed(PRICE_FIXED_DIGITS),
            liquidityGross: BigNumber.from(0),
        }

        const activeTick = tickIdxToInitializedTick[activeTickIdx]
        if (activeTick) {
            activeTickProcessed.liquidityGross = BigNumber.from(activeTick.liquidityGross)
            activeTickProcessed.liquidityNet = BigNumber.from(activeTick.liquidityNet)
        }

        const min = Math.min(...ticks),
            max = Math.max(...ticks);
        const surroundingTicks: number = (Math.abs(max - min) / tickSpacing) + 32;
        //const surroundingTicks: number = 300;

        // console.log(surroundingTicks);

        const subsequentTicks: TickProcessed[] = computeSurroundingTicks(
            activeTickProcessed,
            tickSpacing,
            surroundingTicks,
            Direction.ASC,
            token0,
            token1,
            tickIdxToInitializedTick
        )

        const previousTicks: TickProcessed[] = computeSurroundingTicks(
            activeTickProcessed,
            tickSpacing,
            surroundingTicks,
            Direction.DESC,
            token0,
            token1,
            tickIdxToInitializedTick
        )

        const ticksProcessed: TickProcessed[] = previousTicks.concat(activeTickProcessed).concat(subsequentTicks)

        const feeTier: string = poolResult.pool.feeTier
        const poolTickData = {
            ticksProcessed,
            feeTier,
            tickSpacing,
            activeTickIdx,
        }

        const entries: TickEntry[] = await formatData(poolTickData as PoolTickData, token0, token1);

        if (tick == undefined)
            return entries.map((x) => ({
                tickIdx: x.tickIdx,
                price0: x.price0,
                price1: x.price1,
                tvlToken0: x.tvlToken0,
                tvlToken1: x.tvlToken1,
                tvlDescription: Scenario.entryToTVL(x, poolResult, ticksProcessed)
            }))

        const entryTickIdx = entries.findIndex((x) => x.tickIdx == tick);

        if (entryTickIdx == -1) {
            return {
                message: 'Given tick is out of bounds'
            }
        }

        const entryCurrent = entries[entryTickIdx];

        return {
            tickIdx: entryCurrent.tickIdx,
            price0: entryCurrent.price0,
            price1: entryCurrent.price1,
            tvlToken0: entryCurrent.tvlToken0,
            tvlToken1: entryCurrent.tvlToken1,
            tvlDescription: Scenario.entryToTVL(entryCurrent, poolResult, ticksProcessed)
        }
    }

    static async GetSlot0() {
        const [keyA] = await ethers.getSigners();
        const defaultProvider = ethers.getDefaultProvider();
        const uniswapV3Pool = new ethers.Contract(getContract('defaultPoolAddress'), poolABI, defaultProvider);

        return await uniswapV3Pool.connect(keyA).slot0();
    }

    static async GetProtocolFees() {
        const [keyA] = await ethers.getSigners();
        const defaultProvider = ethers.getDefaultProvider();
        const uniswapV3Pool = new ethers.Contract(getContract('defaultPoolAddress'), poolABI, defaultProvider);

        return await uniswapV3Pool.connect(keyA).protocolFees();
    }

    static async GetPoolLiquidity() {
        const [keyA] = await ethers.getSigners();
        const defaultProvider = ethers.getDefaultProvider();
        const uniswapV3Pool = new ethers.Contract(getContract('defaultPoolAddress'), poolABI, defaultProvider);

        return await uniswapV3Pool.connect(keyA).liquidity();
    }

    static async GetBalance0(vault: number) {
        const [keyA] = await ethers.getSigners();
        const defaultProvider = ethers.getDefaultProvider();
        const vaultAddress = `alphaVaultAddress${vault}`;
        const alphaVault = new ethers.Contract(getContract(vaultAddress), alphaVaultABI, defaultProvider);

        const balance0 = await alphaVault.connect(keyA).getBalance0()

        return {
            balance0: balance0.toString()
        }
    }

    static async GetBalance1(vault: number) {
        const [keyA] = await ethers.getSigners();
        const defaultProvider = ethers.getDefaultProvider();
        const vaultAddress = `alphaVaultAddress${vault}`;
        const alphaVault = new ethers.Contract(getContract(vaultAddress), alphaVaultABI, defaultProvider);

        const balance1 = await alphaVault.connect(keyA).getBalance1()

        return {
            balance1: balance1.toString()
        }
    }

    static async GetTotalAmounts(vault: number) {
        const vaultAddress = `alphaVaultAddress${vault}`;
        const [keyA] = await ethers.getSigners();
        const defaultProvider = ethers.getDefaultProvider();
        const alphaVault = new ethers.Contract(getContract(vaultAddress), alphaVaultABI, defaultProvider);

        const totalAmounts = await alphaVault.connect(keyA).getTotalAmounts()

        return {
            total0: totalAmounts.total0.toString(),
            total1: totalAmounts.total1.toString(),
        }
    }

    static async GetPositionAmounts(tickLower: number, tickUpper: number, vault: number) {
        const vaultAddress = `alphaVaultAddress${vault}`;
        const [keyA] = await ethers.getSigners();
        const defaultProvider = ethers.getDefaultProvider();
        const alphaVault = new ethers.Contract(getContract(vaultAddress), alphaVaultABI, defaultProvider);

        const positionAmounts = await alphaVault.connect(keyA).getPositionAmounts(tickLower, tickUpper)

        return {
            amount0: positionAmounts.amount0.toString(),
            amount1: positionAmounts.amount1.toString()
        }
    }

    static async EmergencyBurn(tickLower: number, tickUpper: number, liquidity: BigNumberish, vault: number) {
        const vaultAddress = `alphaVaultAddress${vault}`;
        const [keyA] = await ethers.getSigners();
        const defaultProvider = ethers.getDefaultProvider(ethDefaultProvider);
        const alphaVault = new ethers.Contract(getContract(vaultAddress), alphaVaultABI, defaultProvider);

        const result = await alphaVault.connect(keyA).emergencyBurn(tickLower, tickUpper, liquidity);
        await defaultProvider.waitForTransaction(result.hash);
    }

    static async Poke(tickLower: number, tickUpper: number, vault: number) {
        const vaultAddress = `alphaVaultAddress${vault}`;
        const [keyA] = await ethers.getSigners();
        const defaultProvider = ethers.getDefaultProvider(ethDefaultProvider);
        const alphaVault = new ethers.Contract(getContract(vaultAddress), alphaVaultABI, defaultProvider);

        const result = await alphaVault.connect(keyA)._poke(tickLower, tickUpper);
        await defaultProvider.waitForTransaction(result.hash);
    }


    static async GetLiquidityAt(tickLower: number, tickUpper: number, vault: number) {
        const vaultAddress = `alphaVaultAddress${vault}`;
        const [keyA] = await ethers.getSigners();
        const defaultProvider = ethers.getDefaultProvider(ethDefaultProvider);
        const alphaVault = new ethers.Contract(getContract(vaultAddress), alphaVaultABI, defaultProvider);

        const result = await alphaVault.connect(keyA).getLiquidityAt(tickLower, tickUpper);
        return {
            tickLower: tickLower,
            tickUpper: tickUpper,
            liquidity: result.toString(),
        }
    }

    static async BalanceOf() {
        const [keyA] = await ethers.getSigners();
        const defaultProvider = ethers.getDefaultProvider(ethDefaultProvider);
        const wethToken = new ethers.Contract(getContract('WETH')!, ERC20TokenABI, defaultProvider);
        const daiToken = new ethers.Contract(getContract('DAI')!, ERC20TokenABI, defaultProvider);
        const alphaVaultToken0 = new ethers.Contract(getContract('alphaVaultAddress0'), ERC20TokenABI, defaultProvider);
        const alphaVaultToken1 = new ethers.Contract(getContract('alphaVaultAddress1'), ERC20TokenABI, defaultProvider);

        const resultWETH = await wethToken.connect(keyA).balanceOf(keyA.address);
        const resultDAI = await daiToken.connect(keyA).balanceOf(keyA.address);
        const resultAlphaWETH = await wethToken.connect(keyA).balanceOf(getContract('alphaVaultAddress0'));
        const resultPoolWETH = await wethToken.connect(keyA).balanceOf(getContract('defaultPoolAddress'));

        const resultAlphaDAI = await daiToken.connect(keyA).balanceOf(getContract('alphaVaultAddress0'));
        const resultPoolDAI = await daiToken.connect(keyA).balanceOf(getContract('defaultPoolAddress'));

        const resultAlphaHighWETH = await wethToken.connect(keyA).balanceOf(getContract('alphaVaultAddress1'));
        const resultAlphaHighDAI = await daiToken.connect(keyA).balanceOf(getContract('alphaVaultAddress1'));

        const sharesAlpha0 = await alphaVaultToken0.connect(keyA).balanceOf(keyA.address);
        const sharesAlpha1 = await alphaVaultToken1.connect(keyA).balanceOf(keyA.address);

        return {
            token0Balance: (resultWETH.div(defaultDecDivider)).toString(),
            token1Balanace: (resultDAI.div(defaultDecDivider)).toString(),
            token0BalanceAlpha0: (resultAlphaWETH.div(defaultDecDivider)).toString(),
            token1BalanceAlpha0: (resultAlphaDAI.div(defaultDecDivider)).toString(),
            token0BalanceAlpha1: (resultAlphaHighWETH.div(defaultDecDivider)).toString(),
            token1BalanceAlpha1: (resultAlphaHighDAI.div(defaultDecDivider)).toString(),
            token0BalancePool: (resultPoolWETH.div(defaultDecDivider)).toString(),
            token1BalancePool: (resultPoolDAI.div(defaultDecDivider)).toString(),
            tokenAV0: (sharesAlpha0.div(defaultDecDivider)).toString(),
            tokenAV1: (sharesAlpha1.div(defaultDecDivider)).toString(),
            _token0Balance: (resultWETH).toString(),
            _token1Balanace: (resultDAI).toString(),
            _token0BalanceAlpha0: (resultAlphaWETH).toString(),
            _token1BalanceAlpha0: (resultAlphaDAI).toString(),
            _token0BalanceAlpha1: (resultAlphaHighWETH).toString(),
            _token1BalanceAlpha1: (resultAlphaHighDAI).toString(),
            _token0BalancePool: (resultPoolWETH).toString(),
            _token1BalancePool: (resultPoolDAI).toString(),
            _tokenAV0: (sharesAlpha0).toString(),
            _tokenAV1: (sharesAlpha1).toString(),
        };
    }

    static async GetAlphaVaultData(vault: number) {
        const vaultAddress = `alphaVaultAddress${vault}`;
        const [keyA] = await ethers.getSigners();
        const defaultProvider = ethers.getDefaultProvider();
        const alphaVault = new ethers.Contract(getContract(vaultAddress), alphaVaultABI, defaultProvider);

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

    static TickToPrice(tick: number) {
        const tokenDecimals = token0Decimals - token1Decimals;

        return 1 / ((1 / (1.0001 ** tick)) * (10 ** tokenDecimals));
    }

    static async PriceToClosestTick(price: number) {
        const poolResult = await Scenario.getPoolResult()
        const token0 = new Token(1, poolResult.pool.token0.id, parseInt(poolResult.pool.token0.decimals))
        const token1 = new Token(1, poolResult.pool.token1.id, parseInt(poolResult.pool.token1.decimals))

        const priceFraction = new Fraction(price);

        const closestTick = priceToClosestTick(
            new Price(
                token0,
                token1,
                priceFraction.denominator,
                priceFraction.numerator
            )
        );

        return closestTick;
    }

    static async getPoolResult() {
        const [keyA] = await ethers.getSigners();
        const defaultProvider = ethers.getDefaultProvider();
        const uniswapV3Pool = new ethers.Contract(getContract('defaultPoolAddress'), poolABI, defaultProvider);

        const liquidity = await uniswapV3Pool.connect(keyA).liquidity();
        const slot0 = await uniswapV3Pool.connect(keyA).slot0();

        const poolResult: PoolResult = {
            pool: {
                feeTier: feeTier.toString(),
                liquidity: liquidity.toString(),
                sqrtPrice: slot0.sqrtPriceX96.toString(),
                tick: slot0.tick.toString(),
                token0: {
                    decimals: token0Decimals.toString(),
                    id: '0x0000000000000000000000000000000000000001',
                    symbol: 'WETH'
                },
                token1: {
                    decimals: token1Decimals.toString(),
                    id: '0x0000000000000000000000000000000000000002',
                    symbol: 'DAI'
                }
            }

        }
        return poolResult;
    }

    static entryToTVL(tick: TickEntry, poolResult: PoolResult, ticksProcessed: TickProcessed[]) {
        if (tick.price1 < +(ticksProcessed[Math.floor(ticksProcessed.length / 2)].price1))
            return poolResult.pool.token0.symbol + " Locked: " + tick.tvlToken0 + " " + poolResult.pool.token0.symbol;

        return poolResult.pool.token1.symbol + " Locked: " + tick.tvlToken1 + " " + poolResult.pool.token1.symbol;
    }
}

async function formatData(poolTickData: PoolTickData, token0: Token, token1: Token) {
    const newData = await Promise.all(
        poolTickData.ticksProcessed.map(async (t: TickProcessed, i) => {
            const active = t.tickIdx === poolTickData.activeTickIdx
            const sqrtPriceX96 = TickMath.getSqrtRatioAtTick(t.tickIdx)
            const mockTicks = [
                {
                    index: t.tickIdx - FEE_TIER_TO_TICK_SPACING(poolTickData.feeTier),
                    liquidityGross: t.liquidityGross.toString(),
                    liquidityNet: t.liquidityNet.mul(BigNumber.from('-1')).toString(),
                },
                {
                    index: t.tickIdx,
                    liquidityGross: t.liquidityGross.toString(),
                    liquidityNet: t.liquidityNet.toString(),
                },
            ]
            const pool =
                token0 && token1 ? new Pool(token0, token1, FEE_TIER_TO_FEE_AMOUNT(poolTickData.feeTier), sqrtPriceX96, t.liquidityActive.toString(), t.tickIdx, mockTicks)
                    : undefined
            const nextSqrtX96 = poolTickData.ticksProcessed[i - 1]
                ? TickMath.getSqrtRatioAtTick(poolTickData.ticksProcessed[i - 1].tickIdx)
                : undefined
            const maxAmountToken0 = token0 ? CurrencyAmount.fromRawAmount(token0, MAX_UINT128.toString()) : undefined
            const outputRes0 =
                pool && maxAmountToken0 ? await pool.getOutputAmount(maxAmountToken0, nextSqrtX96) : undefined

            const token1Amount = outputRes0?.[0] as CurrencyAmount<Token> | undefined

            const amount0 = token1Amount ? parseFloat(token1Amount.toExact()) * parseFloat(t.price1) : 0
            const amount1 = token1Amount ? parseFloat(token1Amount.toExact()) : 0

            return {
                index: i,
                tickIdx: t.tickIdx,
                isCurrent: active,
                activeLiquidity: parseFloat(t.liquidityActive.toString()),
                price0: parseFloat(t.price0),
                price1: parseFloat(t.price1),
                tvlToken0: amount0,
                tvlToken1: amount1,
            }
        })
    )

    newData?.map((entry, i) => {
        if (i > 0) {
            newData[i - 1].tvlToken0 = entry.tvlToken0
            newData[i - 1].tvlToken1 = entry.tvlToken1
        }
    })

    return newData as TickEntry[];
}

const computeSurroundingTicks = (
    activeTickProcessed: TickProcessed,
    tickSpacing: number,
    numSurroundingTicks: number,
    direction: Direction,
    token0: Token,
    token1: Token,
    tickIdxToInitializedTick: Dictionary<Tick>
) => {
    let previousTickProcessed: TickProcessed = {
        ...activeTickProcessed,
    }

    let processedTicks: TickProcessed[] = []
    for (let i = 0; i < numSurroundingTicks; i++) {
        const currentTickIdx =
            direction == Direction.ASC
                ? previousTickProcessed.tickIdx + tickSpacing
                : previousTickProcessed.tickIdx - tickSpacing

        if (currentTickIdx < TickMath.MIN_TICK || currentTickIdx > TickMath.MAX_TICK) {
            break
        }

        const currentTickProcessed: TickProcessed = {
            liquidityActive: previousTickProcessed.liquidityActive,
            tickIdx: currentTickIdx,
            liquidityNet: BigNumber.from(0),
            price0: tickToPrice(token0, token1, currentTickIdx).toFixed(PRICE_FIXED_DIGITS),
            price1: tickToPrice(token1, token0, currentTickIdx).toFixed(PRICE_FIXED_DIGITS),
            liquidityGross: BigNumber.from(0),
        }

        const currentInitializedTick = tickIdxToInitializedTick[currentTickIdx.toString()]
        if (currentInitializedTick) {
            currentTickProcessed.liquidityGross = BigNumber.from(currentInitializedTick.liquidityGross)
            currentTickProcessed.liquidityNet = BigNumber.from(currentInitializedTick.liquidityNet)
        }

        if (direction == Direction.ASC && currentInitializedTick) {
            currentTickProcessed.liquidityActive =
                previousTickProcessed.liquidityActive.add(
                    BigNumber.from(currentInitializedTick.liquidityNet))

        } else if (direction == Direction.DESC && !(previousTickProcessed.liquidityNet.eq(BigNumber.from(0)))) {
            currentTickProcessed.liquidityActive =
                previousTickProcessed.liquidityActive.sub(
                    previousTickProcessed.liquidityNet
                )
        }

        processedTicks.push(currentTickProcessed)
        previousTickProcessed = currentTickProcessed
    }

    if (direction == Direction.DESC) {
        processedTicks = processedTicks.reverse()
    }

    return processedTicks
}

