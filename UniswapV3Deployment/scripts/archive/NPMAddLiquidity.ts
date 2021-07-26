import { Scenario } from "../ScenarioFunctions";


async function main() {
    //await Scenario.AddLiquidity(-120, 120);
}

main()
    //.then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });