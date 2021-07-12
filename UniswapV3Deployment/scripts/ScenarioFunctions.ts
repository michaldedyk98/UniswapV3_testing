import { ethers } from "hardhat";
import { BigNumber } from "bignumber.js";
import { defaultPoolAddress, r, g, w, contractAddresses, ethDefaultProvider, nonfungiblePositionManagerAddress, token1Decimals, token0Decimals, swapRouterAddress, uniswapKeyAddress } from "./config/config";

const nonfungiblePositionManagerABI = [
    "function mint(tuple(address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint256 amount0Desired, uint256 amount1Desired, uint256 amount0Min, uint256 amount1Min, address recipient, uint256 deadline)) external returns(uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)",
    "function decreaseLiquidity(tuple(uint256 tokenId, uint128 liquidity, uint256 amount0Min, uint256 amount1Min, uint256 deadline)) external payable returns (uint256 amount0, uint256 amount1)",
    "function positions(uint256 tokenId) external view returns(uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)"
];

const contractABI = [
    "function token0() external view returns(address)",
    "function token1() external view returns(address)",
    "function slot0() external view returns(uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
    "function ticks(int24 tick) external view returns(uint128 liquidityGross, int128 liquidityNet, uint16 feeGrowthOutside0X128, uint256 feeGrowthOutside1X128, uint56 tickCumulativeOutside, uint160 secondsPerLiquidityOutsideX128, uint32 secondsOutside, bool initialized)",
    "function burn(int24 tickLower, int24 tickUpper, uint128 amount) external returns(uint256 amount0, uint256 amount1)",
    "function positions(bytes32 key) external view returns(uint128 _liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)"
];

const swapRouterABI = [
    "function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external returns(uint256 amountOut)",
];

const uniswapKeyABI = [
    "function compute(address owner, int24 tickLower, int24 tickUpper) external pure returns(bytes32)"
]


export class Scenario {
    static async SwapExact(amountIn: number = 100, amountOutMinimum: number = 50) {
        let [keyA, keyB] = await ethers.getSigners();
        const defaultProvider = ethers.getDefaultProvider(ethDefaultProvider);

        try {
            const blockTimestamp = (await defaultProvider.getBlock(await defaultProvider.getBlockNumber())).timestamp;
            const uniswapV3Contract = new ethers.Contract(swapRouterAddress, swapRouterABI, defaultProvider);

            const result = await uniswapV3Contract.connect(keyB).exactInputSingle({
                tokenIn: contractAddresses.get("WETH"),
                tokenOut: contractAddresses.get("DAI"),
                fee: 3000,
                recipient: keyB.address,
                deadline: blockTimestamp + 120,
                amountIn: amountIn, // ETH
                amountOutMinimum: amountOutMinimum, // DAI
                sqrtPriceLimitX96: 0, // No limit
            },
                { gasLimit: 1000000 }
            );

            defaultProvider.waitForTransaction(result.hash);
        } catch (err) {
            console.log(err);
        }
    }

    static async AddLiquidity(tickLower: number, tickUpper: number, amount0: number = 100, amount1: number = 100) {
        let [keyA] = await ethers.getSigners();
        const defaultProvider = ethers.getDefaultProvider(ethDefaultProvider);

        try {
            const recipientAddress = await keyA.getAddress();
            const blockTimestamp = (await defaultProvider.getBlock(await defaultProvider.getBlockNumber())).timestamp;
            const uniswapV3Contract = new ethers.Contract(nonfungiblePositionManagerAddress, nonfungiblePositionManagerABI, defaultProvider);

            const result = await uniswapV3Contract.connect(keyA).mint({
                token0: contractAddresses.get("WETH"),
                token1: contractAddresses.get("DAI"),
                fee: 3000,
                tickLower: tickLower,
                tickUpper: tickUpper,
                amount0Desired: amount0, // ETH
                amount1Desired: amount1, // DAI?
                amount0Min: 0, // ETH
                amount1Min: 0, // DAI
                recipient: recipientAddress,
                deadline: blockTimestamp + 1800
            },
                { gasLimit: 1000000 }
            );

            await defaultProvider.waitForTransaction(result.hash);
        } catch (err) {
            console.log(err);
        }
    }

    static async DecreaseLiquidity(tokenId: number, amount0Min: number, amount1Min: number, liquidity: number) {
        let [keyA] = await ethers.getSigners();
        const defaultProvider = ethers.getDefaultProvider(ethDefaultProvider);

        try {
            const blockTimestamp = (await defaultProvider.getBlock(await defaultProvider.getBlockNumber())).timestamp;
            const uniswapV3Contract = new ethers.Contract(nonfungiblePositionManagerAddress, nonfungiblePositionManagerABI, defaultProvider);

            const result = await uniswapV3Contract.connect(keyA).decreaseLiquidity({
                tokenId: tokenId,
                liquidity: liquidity,
                amount0Min: amount0Min,
                amount1Min: amount1Min,
                deadline: blockTimestamp + 120
            },
                { gasLimit: 1000000 }
            );

            await defaultProvider.waitForTransaction(result.hash);
        } catch (err) {
            console.log(err);
        }
    }

    static async Positions(tokenId: number) {
        let [keyA] = await ethers.getSigners();
        const defaultProvider = ethers.getDefaultProvider(ethDefaultProvider);

        try {
            const uniswapV3Contract = new ethers.Contract(nonfungiblePositionManagerAddress, nonfungiblePositionManagerABI, defaultProvider);

            const result = await uniswapV3Contract.connect(keyA).positions(tokenId,
                { gasLimit: 1000000 }
            );

            return result;
        } catch (err) {
            console.log(err);
        }
    }


    static async PositionsUniswap(tickLower: number, tickUpper: number) {
        let [keyA] = await ethers.getSigners();
        const defaultProvider = ethers.getDefaultProvider(ethDefaultProvider);

        try {
            const uniswapV3Key = new ethers.Contract(uniswapKeyAddress, uniswapKeyABI, defaultProvider);
            const uniswapV3Pool = new ethers.Contract(defaultPoolAddress, contractABI, defaultProvider);

            const result = await uniswapV3Key.connect(keyA).compute(keyA.address, tickLower, tickUpper);
            const position = await uniswapV3Pool.connect(keyA).positions(result.toString());

            return position;
        } catch (err) {
            console.log(err);
        }
    }

    static async Burn(tickLower: number, tickUpper: number, liquidity: number) {
        let [keyA] = await ethers.getSigners();
        const defaultProvider = ethers.getDefaultProvider(ethDefaultProvider);

        try {
            const uniswapV3Contract = new ethers.Contract(defaultPoolAddress, contractABI, defaultProvider);

            const result = await uniswapV3Contract.connect(keyA).burn(tickLower, tickUpper, liquidity,
                { gasLimit: 1000000 }
            );

            await defaultProvider.waitForTransaction(result.hash);
        } catch (err) {
            console.log(err);
        }
    }


    static async PrintPoolData(ticksToRead: number, tickCurrent?: number) {
        const [keyA] = await ethers.getSigners();
        const defaultProvider = ethers.getDefaultProvider();
        const uniswapV3Contract = new ethers.Contract(defaultPoolAddress, contractABI, defaultProvider);
        let poolSlot0 = await uniswapV3Contract.connect(keyA).slot0();

        if (tickCurrent == null)
            tickCurrent = poolSlot0.tick;

        tickCurrent = Math.trunc(tickCurrent! / 60) * 60

        console.log("Current tick: ", poolSlot0.tick);
        console.log("Observation index: ", poolSlot0.observationIndex);
        console.log("Observation cardinality: ", poolSlot0.observationCardinalityNext);
        console.log("SqrtPrice: ", poolSlot0.sqrtPriceX96.toString());
        console.log("Protocol fee: ", poolSlot0.feeProtocol);

        for (let i = -ticksToRead; i < ticksToRead + 1; i++) {
            let tickValue = tickCurrent! + i * 60;
            let currentTick = await uniswapV3Contract.connect(keyA).ticks(tickValue);

            console.log(r + "**************************************" + w);
            console.log("Tick: " + g + tickValue + w);
            console.log("Price: " + g + Scenario.tickToPrice(tickValue) + w);
            console.log("Initialized: ", g + currentTick.initialized + w);
            console.log("Liquidity gross: ", g + currentTick.liquidityGross.toString() + w);
            console.log("Liquidity net: ", g + currentTick.liquidityNet.toString() + w);
            console.log("Tick cumulative outside: ", g + currentTick.tickCumulativeOutside.toString() + w);
            console.log("Seconds per liquidity outside: ", g + currentTick.secondsPerLiquidityOutsideX128 + w);
            console.log("Seconds outside: ", g + currentTick.secondsOutside + w);
            console.log("feeGrowthOutside0X128: ", g + currentTick.feeGrowthOutside0X128.toString() + w);
            console.log("feeGrowthOutside1X128: ", g + currentTick.feeGrowthOutside1X128.toString() + w);
            console.log(r + "**************************************" + w);
        }
    }

    static tickToPrice(tick: number) {
        const tokenDecimals = token0Decimals - token1Decimals;

        return (new BigNumber(1).dividedBy(new BigNumber(1.0001 ** tick))).multipliedBy(new BigNumber(10).exponentiatedBy(tokenDecimals));
    }
}