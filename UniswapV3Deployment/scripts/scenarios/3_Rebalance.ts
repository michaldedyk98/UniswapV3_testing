import { ethers } from "hardhat";
import { delay, r, w } from "../config/config";
import { Scenario } from "../ScenarioFunctions";

async function main() {
    await Scenario.Deposit(200, 200);
    // await Scenario.Withdraw(100);
    // await Scenario.SwapExact(150, 10);
    // //await Scenario.Rebalance();
    // await Scenario.Deposit(400, 398);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });