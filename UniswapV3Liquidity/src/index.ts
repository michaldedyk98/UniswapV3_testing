import { poolQuery, tickQuery } from './queries'
import { TickMath, tickToPrice, TICK_SPACINGS, FeeAmount, Pool, priceToClosestTick, SqrtPriceMath } from '@uniswap/v3-sdk'
import { CurrencyAmount, Token } from '@uniswap/sdk-core'
import { client } from './apollo/client';
import keyBy from 'lodash.keyby'
import { Dictionary } from 'lodash'
import { DEFAULT_SURROUNDING_TICKS, FEE_TIER_TO_FEE_AMOUNT, FEE_TIER_TO_TICK_SPACING, MAX_UINT128, PRICE_FIXED_DIGITS } from './config/config';
import JSBI from 'jsbi'
import { Direction, PoolResult, PoolTickData, SurroundingTicksResult, Tick, TickEntry, TickProcessed } from './models/common';

const g = '\u001b[' + 32 + 'm'
const r = '\u001b[' + 31 + 'm'
const w = '\u001b[0m';
const poolAddress: string = "0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8"
const INITIAL_TICKS_TO_FETCH: number = 200
var token0: Token;
var token1: Token;
var tickIdxToInitializedTick: Dictionary<Tick>;
var ticksProcessed: TickProcessed[];
var poolResult: PoolResult;

async function main() {
    const { data, error, loading } = await client.query<PoolResult>({
        query: poolQuery,
        variables: {
            poolAddress,
        },
    })

    poolResult = data;

    const tickSpacing = FEE_TIER_TO_TICK_SPACING(poolResult.pool.feeTier)
    const activeTickIdx = Math.floor(+poolResult.pool.tick / tickSpacing) * tickSpacing

    console.log("1 to sqrtTickRatioX96 " + TickMath.getSqrtRatioAtTick(0))

    console.log("Current tick: " + g + poolResult.pool.tick + w);
    console.log("Nearest tick: " + g + activeTickIdx + w);
    console.log("Pool liquidity " + poolResult.pool.liquidity);
    console.log("Pool sqrt price: " + poolResult.pool.sqrtPrice);
    console.log("Tick spacing: " + FEE_TIER_TO_TICK_SPACING(poolResult.pool.feeTier));
    console.log("Fee tier: " + poolResult.pool.feeTier);
    console.log("Token0 symbol: " + poolResult.pool.token0.symbol);
    console.log("Token1 symbol: " + poolResult.pool.token1.symbol);

    const tick: number = parseInt(process.argv[2] ?? activeTickIdx);

    const tickIdxLowerBound = activeTickIdx - DEFAULT_SURROUNDING_TICKS * tickSpacing
    const tickIdxUpperBound = activeTickIdx + DEFAULT_SURROUNDING_TICKS * tickSpacing
    const skip = 0;

    const { data: initializedTicks } = await client.query<SurroundingTicksResult>({
        query: tickQuery,
        fetchPolicy: 'network-only',
        variables: {
            poolAddress,
            tickIdxLowerBound,
            tickIdxUpperBound,
            skip,
        },
    })

    console.log("Ticks received: " + initializedTicks.ticks.length)

    tickIdxToInitializedTick = keyBy(initializedTicks.ticks, 'tickIdx')

    token0 = new Token(1, poolResult.pool.token0.id, parseInt(poolResult.pool.token0.decimals))
    token1 = new Token(1, poolResult.pool.token1.id, parseInt(poolResult.pool.token1.decimals))

    const activeTickProcessed: TickProcessed = {
        liquidityActive: JSBI.BigInt(poolResult.pool.liquidity),
        tickIdx: activeTickIdx,
        liquidityNet: JSBI.BigInt(0),
        price0: tickToPrice(token0, token1, activeTickIdx).toFixed(PRICE_FIXED_DIGITS),
        price1: tickToPrice(token1, token0, activeTickIdx).toFixed(PRICE_FIXED_DIGITS),
        liquidityGross: JSBI.BigInt(0),
    }

    const activeTick = tickIdxToInitializedTick[activeTickIdx]
    if (activeTick) {
        activeTickProcessed.liquidityGross = JSBI.BigInt(activeTick.liquidityGross)
        activeTickProcessed.liquidityNet = JSBI.BigInt(activeTick.liquidityNet)
    }

    const subsequentTicks: TickProcessed[] = computeSurroundingTicks(
        activeTickProcessed,
        tickSpacing,
        DEFAULT_SURROUNDING_TICKS,
        Direction.ASC
    )

    const previousTicks: TickProcessed[] = computeSurroundingTicks(
        activeTickProcessed,
        tickSpacing,
        DEFAULT_SURROUNDING_TICKS,
        Direction.DESC
    )

    ticksProcessed = previousTicks.concat(activeTickProcessed).concat(subsequentTicks)

    console.log("Previous ticks length: " + previousTicks.length);
    console.log("Subsequent ticks length: " + subsequentTicks.length);

    const feeTier: string = poolResult.pool.feeTier
    const poolTickData = {
        ticksProcessed,
        feeTier,
        tickSpacing,
        activeTickIdx,
    }

    const entries: TickEntry[] = await formatData(poolTickData as PoolTickData);

    const entryTickIdx = entries.findIndex((x) => x.tickIdx == tick);
    const entry = entries[entryTickIdx];

    console.log("Entries: " + entries.length);
    console.log("Tick to read: " + g + tick + w);
    console.log("--------------------------------------");
    const entryNext = entries[entryTickIdx + 1];
    console.log(g + `TickIndex at tick ${entryNext.index}: ${entryNext.tickIdx}` + w);
    console.log(g + `Price0 at tick ${entryNext.index}: ${entryNext.price0}` + w);
    console.log(g + `Price1 at tick ${entryNext.index}: ${entryNext.price1}` + w);
    console.log(g + `${entryToTVL(entryNext)} at tick ${entryNext.index}` + w);
    console.log("**************************************");
    console.log(r + `TickIndex at tick ${entryTickIdx}: ${entry.tickIdx}` + w);
    console.log(r + `Price0 at tick ${entryTickIdx}: ${entry.price0}` + w);
    console.log(r + `Price1 at tick ${entryTickIdx}: ${entry.price1}` + w);
    console.log(r + `TVL0 at tick ${entryTickIdx}: ${entry.tvlToken0}` + w);
    console.log(r + `TVL1 at tick ${entryTickIdx}: ${entry.tvlToken1}` + w);
    console.log(r + `${entryToTVL(entry)} at tick ${entry.index}` + w);
    console.log("**************************************");
    const entryPrev = entries[entryTickIdx - 1];
    console.log(g + `TickIndex at tick ${entryPrev.index}: ${entryPrev.tickIdx}` + w);
    console.log(g + `Price0 at tick ${entryPrev.index}: ${entryPrev.price0}` + w);
    console.log(g + `Price1 at tick ${entryPrev.index}: ${entryPrev.price1}` + w);
    console.log(g + `${entryToTVL(entryPrev)} at tick ${entryPrev.index}` + w);
    console.log("--------------------------------------");
}

function entryToTVL(tick: TickEntry) {
    if (tick.price1 < +(ticksProcessed[Math.floor(ticksProcessed.length / 2)].price1))
        return poolResult.pool.token0.symbol + " Locked: " + tick.tvlToken0 + " " + poolResult.pool.token0.symbol;

    return poolResult.pool.token1.symbol + " Locked: " + tick.tvlToken1 + " " + poolResult.pool.token1.symbol;
}

async function formatData(poolTickData: PoolTickData) {
    const newData = await Promise.all(
        poolTickData.ticksProcessed.map(async (t: TickProcessed, i) => {
            const active = t.tickIdx === poolTickData.activeTickIdx
            const sqrtPriceX96 = TickMath.getSqrtRatioAtTick(t.tickIdx)
            const mockTicks = [
                {
                    index: t.tickIdx - FEE_TIER_TO_TICK_SPACING(poolTickData.feeTier),
                    liquidityGross: t.liquidityGross,
                    liquidityNet: JSBI.multiply(t.liquidityNet, JSBI.BigInt('-1')),
                },
                {
                    index: t.tickIdx,
                    liquidityGross: t.liquidityGross,
                    liquidityNet: t.liquidityNet,
                },
            ]
            const pool =
                token0 && token1 ? new Pool(token0, token1, FEE_TIER_TO_FEE_AMOUNT(poolTickData.feeTier), sqrtPriceX96, t.liquidityActive, t.tickIdx, mockTicks)
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
    direction: Direction
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
            liquidityNet: JSBI.BigInt(0),
            price0: tickToPrice(token0, token1, currentTickIdx).toFixed(PRICE_FIXED_DIGITS),
            price1: tickToPrice(token1, token0, currentTickIdx).toFixed(PRICE_FIXED_DIGITS),
            liquidityGross: JSBI.BigInt(0),
        }

        const currentInitializedTick = tickIdxToInitializedTick[currentTickIdx.toString()]
        if (currentInitializedTick) {
            currentTickProcessed.liquidityGross = JSBI.BigInt(currentInitializedTick.liquidityGross)
            currentTickProcessed.liquidityNet = JSBI.BigInt(currentInitializedTick.liquidityNet)
        }

        if (direction == Direction.ASC && currentInitializedTick) {
            currentTickProcessed.liquidityActive = JSBI.add(
                previousTickProcessed.liquidityActive,
                JSBI.BigInt(currentInitializedTick.liquidityNet)
            )
        } else if (direction == Direction.DESC && JSBI.notEqual(previousTickProcessed.liquidityNet, JSBI.BigInt(0))) {
            currentTickProcessed.liquidityActive = JSBI.subtract(
                previousTickProcessed.liquidityActive,
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


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });