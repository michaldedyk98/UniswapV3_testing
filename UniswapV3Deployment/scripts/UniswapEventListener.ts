import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { alphaVaultABI, alphaVaultAddress, defaultPoolAddress, ethDefaultProvider, g, nonfungiblePositionManagerABI, nonfungiblePositionManagerAddress, poolABI, r, w } from "./config/config";

let keyA: SignerWithAddress;

async function main() {
    [keyA] = await ethers.getSigners();
    const defaultProvider = ethers.getDefaultProvider(ethDefaultProvider);
    defaultProvider.pollingInterval = 1;

    try {
        const npmContract = new ethers.Contract(nonfungiblePositionManagerAddress, nonfungiblePositionManagerABI, defaultProvider);
        const uniswapV3PoolContract = new ethers.Contract(defaultPoolAddress, poolABI, defaultProvider);
        const alphaVaultContract = new ethers.Contract(alphaVaultAddress, alphaVaultABI, defaultProvider);

        uniswapV3PoolContract.on("Burn", (owner, tickLower, tickUpper, amount, amount0, amount1, event) => {
            console.log(g + "*********** [IncreaseLiquidity] ***********" + w)
            console.log("Tx: " + r + event.transactionHash + w)
            console.log("owner: " + r + owner + w)
            console.log("tickLower: " + r + tickLower + w)
            console.log("tickUpper: " + r + tickUpper + w)
            console.log("amount: " + r + amount + w)
            console.log("amount0: " + r + amount0 + w)
            console.log("amount1: " + r + amount1 + w)
            console.log(g + "*******************************************" + w)
        });

        npmContract.on("IncreaseLiquidity", (tokenId, liquidity, amount0, amount1, event) => {
            console.log(g + "*********** [IncreaseLiquidity] ***********" + w)
            console.log("Tx: " + r + event.transactionHash + w)
            console.log("Token ID: " + r + tokenId + w)
            console.log("Liquidity: " + r + liquidity + w)
            console.log("Amount0: " + r + amount0 + w)
            console.log("Amount1: " + r + amount1 + w)
            console.log(g + "*******************************************" + w)
        });

        npmContract.on("DecreaseLiquidity", (tokenId, liquidity, amount0, amount1, event) => {
            console.log(g + "*********** [DecreaseLiquidity] ***********" + w)
            console.log("Tx: " + r + event.transactionHash + w)
            console.log("Token ID: " + r + tokenId + w)
            console.log("Liquidity: " + r + liquidity + w)
            console.log("Amount0: " + r + amount0 + w)
            console.log("Amount1: " + r + amount1 + w)
            console.log(g + "*******************************************" + w)
        });

        uniswapV3PoolContract.on("Swap", (sender, recipient, amount0, amount1, sqrtPriceX96, liquidity, tick, event) => {
            console.log(g + "***************** [Swap] *****************" + w)
            console.log("Tx: " + r + event.transactionHash + w)
            console.log("Sender: " + r + sender + w)
            console.log("Recipient: " + r + recipient + w)
            console.log("Amount0: " + r + amount0 + w)
            console.log("Amount1: " + r + amount1 + w)
            console.log("SqrtPriceX96: " + r + sqrtPriceX96 + w)
            console.log("Liquidity: " + r + liquidity + w)
            console.log("Tick: " + r + tick + w)
            console.log(g + "*******************************************" + w)
        });

        alphaVaultContract.on("Deposit", async (sender, to, shares, amount0, amount1, event) => {
            console.log(g + "***************** [Deposit] *****************" + w)
            console.log("Tx: " + r + event.transactionHash + w)
            console.log("Sender: " + r + sender + w)
            console.log("To: " + r + to + w)
            console.log("Shares: " + r + shares + w)
            console.log("Amount0: " + r + amount0 + w)
            console.log("Amount1: " + r + amount1 + w)
            console.log(g + "*******************************************" + w)
        });

        alphaVaultContract.on("Withdraw", (sender, to, shares, amount0, amount1, event) => {
            console.log(g + "***************** [Withdraw] *****************" + w)
            console.log("Tx: " + r + event.transactionHash + w)
            console.log("Sender: " + r + sender + w)
            console.log("To: " + r + to + w)
            console.log("Shares: " + r + shares + w)
            console.log("Amount0: " + r + amount0 + w)
            console.log("Amount1: " + r + amount1 + w)
            console.log(g + "*******************************************" + w)
        });

        alphaVaultContract.on("CollectFees", (feesToVault0, feesToVault1, feesToProtocol0, feesToProtocol1, event) => {
            console.log(g + "***************** [CollectFees] *****************" + w)
            console.log("Tx: " + r + event.transactionHash + w)
            console.log("FeesToVault0: " + r + feesToVault0 + w)
            console.log("FeesToVault1: " + r + feesToVault1 + w)
            console.log("FeesToProtocol0: " + r + feesToProtocol0 + w)
            console.log("FeesToProtocol1: " + r + feesToProtocol1 + w)
            console.log(g + "*******************************************" + w)
        });

        alphaVaultContract.on("Snapshot", (tick, totalAmount0, totalAmount1, totalSupply, event) => {
            console.log(g + "***************** [Snapshot] *****************" + w)
            console.log("Tx: " + r + event.transactionHash + w)
            console.log("Tick: " + r + tick + w)
            console.log("TotalAmount0: " + r + totalAmount0 + w)
            console.log("TotalAmount1: " + r + totalAmount1 + w)
            console.log("TotalSupply: " + r + totalSupply + w)
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