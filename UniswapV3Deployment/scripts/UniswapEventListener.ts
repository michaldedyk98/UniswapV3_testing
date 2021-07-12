import { ethers } from "hardhat";
import { Contract } from "@ethersproject/contracts";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { defaultPoolAddress, ethDefaultProvider, g, nonfungiblePositionManagerAddress, r, w } from "./config/config";

const nonfungiblePositionManagerABI = [
    "event IncreaseLiquidity(uint256 indexed tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)",
    "event DecreaseLiquidity(uint256 indexed tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)",
];

const uniswapV3PoolABI = [
    "event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)",
    "event Burn(address indexed owner, int24 indexed tickLower, int24 indexed tickUpper, uint128 amount, uint256 amount0, uint256 amount1)"
]

let npmContract: Contract;
let keyA: SignerWithAddress;

async function main() {
    [keyA] = await ethers.getSigners();
    const defaultProvider = ethers.getDefaultProvider(ethDefaultProvider);

    try {
        npmContract = new ethers.Contract(nonfungiblePositionManagerAddress, nonfungiblePositionManagerABI, defaultProvider);
        const uniswapV3PoolContract = new ethers.Contract(defaultPoolAddress, uniswapV3PoolABI, defaultProvider);

        uniswapV3PoolContract.on("Burn", (owner, tickLower, tickUpper, amount, amount0, amount1) => {
            console.log(g + "*********** [IncreaseLiquidity] ***********" + w)
            console.log("owner: " + r + owner + w)
            console.log("tickLower: " + r + tickLower + w)
            console.log("tickUpper: " + r + tickUpper + w)
            console.log("amount: " + r + amount + w)
            console.log("amount0: " + r + amount0 + w)
            console.log("amount1: " + r + amount1 + w)
            console.log(g + "*******************************************" + w)
        });

        npmContract.on("IncreaseLiquidity", (tokenId, liquidity, amount0, amount1) => {
            console.log(g + "*********** [IncreaseLiquidity] ***********" + w)
            console.log("Token ID: " + r + tokenId + w)
            console.log("Liquidity: " + r + liquidity + w)
            console.log("Amount0: " + r + amount0 + w)
            console.log("Amount1: " + r + amount1 + w)
            console.log(g + "*******************************************" + w)
        });

        npmContract.on("DecreaseLiquidity", (tokenId, liquidity, amount0, amount1) => {
            console.log(g + "*********** [DecreaseLiquidity] ***********" + w)
            console.log("Token ID: " + r + tokenId + w)
            console.log("Liquidity: " + r + liquidity + w)
            console.log("Amount0: " + r + amount0 + w)
            console.log("Amount1: " + r + amount1 + w)
            console.log(g + "*******************************************" + w)
        });

        uniswapV3PoolContract.on("Swap", (sender, recipient, amount0, amount1, sqrtPriceX96, liquidity, tick) => {
            console.log(g + "***************** [Swap] *****************" + w)
            console.log("Sender: " + r + sender + w)
            console.log("Recipient: " + r + recipient + w)
            console.log("Amount0: " + r + amount0 + w)
            console.log("Amount1: " + r + amount1 + w)
            console.log("SqrtPriceX96: " + r + sqrtPriceX96 + w)
            console.log("Liquidity: " + r + liquidity + w)
            console.log("Tick: " + r + tick + w)
            console.log(g + "*******************************************" + w)
        });
    } catch (err) {
        console.log(err);
    }
}

main()
    //.then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });