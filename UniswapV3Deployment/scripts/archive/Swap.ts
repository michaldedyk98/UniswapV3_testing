import { Scenario } from "../ScenarioFunctions";

async function main() {
    await Scenario.SwapExactInput();
}

main()
    //.then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });