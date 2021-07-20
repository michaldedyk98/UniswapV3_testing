import { swapRouterMaximumIn, tickSpacing } from "../../scripts/config/config";
import { Scenario } from "../../scripts/ScenarioFunctions";
import { log } from '../../scripts/config/db';
import { BigNumber } from '@ethersproject/bignumber';
import HttpException from "../../scripts/models/HttpException";

async function rebalance(input: any, vault: number) {
    try {
        const rebalanceResult = await Scenario.Rebalance(vault);
        const tickData = await Scenario.GetTicksData(0, Math.floor(rebalanceResult.tickRebalance / tickSpacing) * tickSpacing);
        const result = {
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

async function moveMarketToTick(input: any, expectedTick: number) {
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

        //const rebalanceResult = await Scenario.Rebalance();

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
};