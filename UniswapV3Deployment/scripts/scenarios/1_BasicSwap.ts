import { delay, r, w } from "../config/config";
import { Scenario } from "../ScenarioFunctions";

async function main() {
    //await PrintPoolData(2);
    await Scenario.AddLiquidity(-120, 120, 100, 100);
    await delay(500);
    await Scenario.AddLiquidity(-60, 60, 50, 50);
    console.log(r + "BEFORE SWAP" + w);
    await Scenario.PrintPoolData(2, 0);
    await Scenario.SwapExact(100, 80);
    console.log(r + "AFTER SWAP" + w);

    await Scenario.PrintPoolData(2);
}

main()
    //.then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });