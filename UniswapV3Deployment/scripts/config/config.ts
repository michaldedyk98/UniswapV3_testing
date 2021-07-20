import { BigNumber } from '@ethersproject/bignumber';
import { FeeAmount } from '../util/v3-periphery/constants';


// export const contractAddresses: Map<string, string> = new Map([
//     ["WETH", "0x322813Fd9A801c5507c9de605d63CEA4f2CE6c44"],
//     ["DAI", "0xa85233C63b9Ee964Add6F2cffe00Fd84eb32338f"],
// ]);

// export const nonfungiblePositionManagerAddress = "0x59b670e9fA9D0A427751Af201D676719a970857b";
// export const uniswapV3FactoryAddress = "0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE";
// export const swapRouterAddress = "0x68B1D87F95878fE05B998F19b66F4baba5De1aed";
// export const defaultPoolAddress = "0xA6765834BBdEF5B96Df1e12CaCCeF9d934140004";
// export const uniswapKeyAddress = "0x4ed7c70F96B99c776995fB64377f0d4aB3B0e1C1";
// export const alphaVaultAddress = "0x9E545E3C0baAB3E08CdfD552C960A1050f373042";
// export const alphaVaultPassiveStrategyAddress = "0x851356ae760d987E095750cCeb3bC6014560891C";

export const token0Decimals: number = 18
export const token1Decimals: number = 18
export const feeTier: number = 3000
export const tickSpacing: number = 60

export const protocolFee: number = 10000 // 10 %
export const maxTotalSupply: BigNumber = BigNumber.from("100000000000000000000000000000")
export const baseThreshold: number = 3600
export const limitThreshold: number = 1200
export const periodAlphaVault: number = 5 // Rebalance after 5 seconds
export const minTickMove: number = 0
export const maxTWAPDeviation: number = 100 // 1%
export const durationTWAP = 60 // 60 seconds
export const maxGasLimit = 12250000

export const MIN_TICK = -887220
export const MAX_TICK = -MIN_TICK

export const tokenDefaultBalance: BigNumber = BigNumber.from("10000000000000000000000000000")
export const alphaVaultDeposit: BigNumber = BigNumber.from("10000000000000000000000000")
export const alphaVaultRebalanceAmount: BigNumber = BigNumber.from("9000000000000000000000000")
export const swapRouterMaximumIn: BigNumber = BigNumber.from("100000000000000000000000000000000000")

export const defaultDecDivider: BigNumber = BigNumber.from("1000000000000000000")
export const defaultSqrtPriceX96 = "79228162514264337593543950336"

export const ethDefaultProvider: string = "http://localhost:8545"

export const g = '\u001b[' + 32 + 'm'
export const r = '\u001b[' + 31 + 'm'
export const w = '\u001b[0m';

export const PRICE_FIXED_DIGITS = 4
export const DEFAULT_SURROUNDING_TICKS = 450
export const MAX_UINT128 = BigNumber.from(2).pow(128).sub(1)

export const FEE_TIER_TO_TICK_SPACING = (feeTier: string): number => {
    switch (feeTier) {
        case '10000':
            return 200
        case '3000':
            return 60
        case '500':
            return 10
        default:
            throw Error(`Tick spacing for fee tier ${feeTier} undefined.`)
    }
}

export const FEE_TIER_TO_FEE_AMOUNT = (feeTier: string): FeeAmount => {
    switch (feeTier) {
        case '10000':
            return FeeAmount.HIGH
        case '3000':
            return FeeAmount.MEDIUM
        case '500':
            return FeeAmount.LOW
        default:
            throw Error(`FeeAmount for fee tier ${feeTier} undefined.`)
    }
}

export const isBetween = (num1: number, num2: number, value: number) => value > num1 && value < num2


export function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export const nonfungiblePositionManagerABI = [
    "function mint(tuple(address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint256 amount0Desired, uint256 amount1Desired, uint256 amount0Min, uint256 amount1Min, address recipient, uint256 deadline)) external returns(uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)",
    "function decreaseLiquidity(tuple(uint256 tokenId, uint128 liquidity, uint256 amount0Min, uint256 amount1Min, uint256 deadline)) external payable returns (uint256 amount0, uint256 amount1)",
    "function positions(uint256 tokenId) external view returns(uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)",
    "event IncreaseLiquidity(uint256 indexed tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)",
    "event DecreaseLiquidity(uint256 indexed tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)",
];

export const poolABI = [
    "function token0() external view returns(address)",
    "function token1() external view returns(address)",
    "function liquidity() external view returns(uint128)",
    "function protocolFees() external view returns(uint128 token0, uint128 token1)",
    "function slot0() external view returns(uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
    "function ticks(int24 tick) external view returns(uint128 liquidityGross, int128 liquidityNet, uint16 feeGrowthOutside0X128, uint256 feeGrowthOutside1X128, uint56 tickCumulativeOutside, uint160 secondsPerLiquidityOutsideX128, uint32 secondsOutside, bool initialized)",
    "function burn(int24 tickLower, int24 tickUpper, uint128 amount) external returns(uint256 amount0, uint256 amount1)",
    "function positions(bytes32 key) external view returns(uint128 _liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)",
    "function increaseObservationCardinalityNext(uint16 observationCardinalityNext) external",
    "event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)",
    "event Burn(address indexed owner, int24 indexed tickLower, int24 indexed tickUpper, uint128 amount, uint256 amount0, uint256 amount1)"
];

export const swapRouterABI = [
    "function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external returns(uint256 amountOut)",
    "function exactOutputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountOut, uint256 amountInMaximum, uint160 sqrtPriceLimitX96)) external returns(uint256 amountIn)",
];

export const uniswapKeyABI = [
    "function compute(address owner, int24 tickLower, int24 tickUpper) external pure returns(bytes32)"
]

export const passiveStrategyABI = [
    "function rebalance() external"
]

export const ERC20TokenABI = [
    "function balanceOf(address account) public view returns (uint256)"
]

export const alphaVaultABI = [
    "function deposit(uint256 amount0Desired, uint256 amount1Desired, uint256 amount0Min, uint256 amount1Min, address to) external returns(uint256 shares, uint256 amount0, uint256 amount1)",
    "function withdraw(uint256 shares, uint256 amount0Min, uint256 amount1Min, address to) external returns(uint256 amount0, uint256 amount1)",
    "event Deposit(address indexed sender, address indexed to, uint256 shares, uint256 amount0, uint256 amount1)",
    "event Withdraw(address indexed sender, address indexed to, uint256 shares, uint256 amount0, uint256 amount1)",
    "event CollectFees(uint256 feesToVault0, uint256 feesToVault1, uint256 feesToProtocol0, uint256 feesToProtocol1)",
    "event Snapshot(int24 tick, uint256 totalAmount0, uint256 totalAmount1, uint256 totalSupply)",
    "event LogData(int24 tickLower, int24 tickUpper, uint128 liquidity)",
    "function baseLower() external view returns(int24)",
    "function baseUpper() external view returns(int24)",
    "function limitLower() external view returns(int24)",
    "function limitUpper() external view returns(int24)",
    "function accruedProtocolFees0() external view returns(uint256)",
    "function accruedProtocolFees1() external view returns(uint256)",
    "function getBalance0() public view returns (uint256)",
    "function getBalance1() public view returns (uint256)",
    "function getTotalAmounts() public view returns (uint256 total0, uint256 total1)",
    "function getPositionAmounts(int24 tickLower, int24 tickUpper) public view returns(uint256 amount0, uint256 amount1)",
    "function emergencyBurn(int24 tickLower, int24 tickUpper, uint128 liquidity)",
    "function _poke(int24 tickLower, int24 tickUpper) public",
    "function getLiquidityAt(int24 tickLower, int24 tickUpper) external pure returns(uint128 liquidity)",
    "function rebalance(int256 swapAmount, uint160 sqrtPriceLimitX96, int24 _baseLower, int24 _baseUpper, int24 _bidLower, int24 _bidUpper, int24 _askLower, int24 _askUpper) external"
]