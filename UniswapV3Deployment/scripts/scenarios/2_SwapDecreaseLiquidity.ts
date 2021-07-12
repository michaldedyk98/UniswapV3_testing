import { delay, r, w } from "../config/config";
import { Scenario } from "../ScenarioFunctions";

async function main() {
    await Scenario.AddLiquidity(-120, 120, 100, 100);
    //await Scenario.Burn(-120, 120, 200302);
    await positionPool(-120, 120);
    // await delay(500);
    // await Scenario.AddLiquidity(-60, 60, 50, 50);

    // await Scenario.DecreaseLiquidity(1, 10, 10, 2100);

    // console.log(r + "BEFORE SWAP" + w);
    //await Scenario.PrintPoolData(2, 0);
    // await Scenario.SwapExact(100, 80);
    // console.log(r + "AFTER SWAP" + w);

    // await Scenario.PrintPoolData(2);

}

async function positionNFT(tokenId: number) {
    const result = await Scenario.Positions(tokenId);
    console.log(`Token ${tokenId} liquidity: ` + result.liquidity.toString());
    console.log(`Token ${tokenId} feeGrowthInside0LastX128: ` + result.feeGrowthInside0LastX128.toString());
    console.log(`Token ${tokenId} feeGrowthInside1LastX128: ` + result.feeGrowthInside1LastX128.toString());
    console.log(`Token ${tokenId} tokensOwed0: ` + result.tokensOwed0.toString());
    console.log(`Token ${tokenId} tokensOwed1: ` + result.tokensOwed1.toString());
}

async function positionPool(tickLower: number, tickUpper: number) {
    const result = await Scenario.PositionsUniswap(tickLower, tickUpper);
    console.log("Liquidity: " + result._liquidity.toString());
    console.log("FeeGrowthInside0LastX128: " + result.feeGrowthInside0LastX128.toString());
    console.log("FeeGrowthInside1LastX128: " + result.feeGrowthInside1LastX128.toString());
    console.log("TokensOwed0: " + result.tokensOwed0.toString());
    console.log("TokensOwed1: " + result.tokensOwed1.toString());

}

main()
    //.then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });