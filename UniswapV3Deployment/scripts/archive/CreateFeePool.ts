import { ethers } from "hardhat";
import { feeTier } from "../config/config";

// const contractABI = [
//     "function createPool(address tokenA, address tokenB, uint24 fee) external returns(address pool)",
// ];

const nonfungiblePositionManagerABI = [
    "function createAndInitializePoolIfNecessary(address tokenA, address tokenB, uint24 fee, uint160 sqrtPriceX96) external returns(address pool)"
];

async function main() {
    const [keyA] = await ethers.getSigners();
    const defaultProvider = ethers.getDefaultProvider();

    try {
        // let uniswapV3Contract = new ethers.Contract(nonfungiblePositionManagerAddress, nonfungiblePositionManagerABI, defaultProvider);
        // // let feePoolAddressTx = await uniswapV3Contract.connect(keyA).createAndInitializePoolIfNecessary(
        // //     contractAddresses.get("WETH"),
        // //     contractAddresses.get("DAI"),
        // //     feeTier,
        // //     "79228162514264337593543950336"
        // // );

        // (await defaultProvider.waitForTransaction(feePoolAddressTx.hash));

        // console.log("Transaction address: ", feePoolAddressTx.hash);
    } catch (err) {
        console.log(err);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });