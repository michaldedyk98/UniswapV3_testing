import { g, r, swapRouterMaximumIn, tickSpacing, w } from "../../scripts/config/config";
import { Scenario } from "../../scripts/ScenarioFunctions";
import { client, log } from '../../scripts/config/db';
import HttpException from "../../scripts/models/HttpException";
import { Transaction } from "../../scripts/models/Transaction";

async function processTransactions(iterations: number, offset: number) {
    try {
        const result = await client.query(`
            SELECT * FROM pair_data 
                ORDER BY id DESC 
                LIMIT $1 
                OFFSET $2
        `, [iterations, offset])

        const transactions: Transaction[] = result.rows

        var t0 = performance.now()

        for (let i = 0; i < iterations; i++) {
            const expectedTick = await Scenario.PriceToClosestTick(transactions[i].open)

            console.log(`Open: ${transactions[i].open}, Tick: ${expectedTick}`)
            try {
                await moveMarketToPrice({ expectedTick: expectedTick, expectedPrice: transactions[i].open }, transactions[i].open)

                if (new Date(transactions[i].date).getHours() == 16) {
                    console.log(`Rebalance, tick: ${expectedTick}`)
                    await rebalance({}, 1)
                }
            } catch (err) {
                if (err instanceof HttpException)
                    console.log(r + `Failed to move market to price: ${transactions[i].open}, expectedTick == currentTick` + w)
            }
        }

        var t1 = performance.now()

        console.log(g + 'Transactions processed: ' + iterations + ', processing took ' + ((t1 - t0) / 1000) + " seconds." + w);
    } catch (err) {
        console.error('Failed to process transactions', err)
    }
}

async function rebalance(input: any, vault: number) {
    try {
        const rebalanceResult = await Scenario.Rebalance(vault);
        const tickData = await Scenario.GetTicksData(0, Math.floor(rebalanceResult.tickRebalance / tickSpacing) * tickSpacing);
        const result = {
            vault: vault,
            ...rebalanceResult,
            ...tickData[0]
        }

        log('rebalance', 'Success', input, result)

        return result
    } catch (err) {
        log('rebalance', 'Failed to rebalance', input, err)

        throw err;
    }
}

async function moveMarketToPrice(input: any, expectedPrice: number) {
    const expectedTick = await Scenario.PriceToClosestTick(expectedPrice)

    return await moveMarketToTick(input, expectedTick)
}

async function moveMarketToTick(input: any, expectedTick: number, onTvlErrorThrow: boolean = true) {
    const tvlData = await Scenario.GetTVLData(expectedTick);
    if (!tvlData.data) {
        log('moveMarketTo', 'Error', input, tvlData)

        throw new HttpException(400, tvlData);
    }

    try {
        const swapResult = await Scenario.SwapExactOutput(
            tvlData.data.amountToBuy,
            swapRouterMaximumIn,
            tvlData.data.tokenToSell,
            tvlData.data.tokenToBuy
        )

        const slot0 = await Scenario.GetSlot0()
        const slot0Data = {
            tick: slot0.tick,
            price: Scenario.TickToPrice(slot0.tick).toString(),
        }
        const result = {
            ...swapResult,
            ...slot0Data
        }

        log('moveMarketTo', 'Success', input, result)

        return result;
    } catch (err) {
        log('moveMarketTo', 'Failed to move market', input, err)

        throw err;
    }
}

export default {
    rebalance,
    moveMarketToTick,
    processTransactions
};