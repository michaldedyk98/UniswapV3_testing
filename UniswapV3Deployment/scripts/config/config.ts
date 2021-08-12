import { BigNumber } from '@ethersproject/bignumber';
import { Token } from '@uniswap/sdk-core';
import { FeeAmount } from '../util/v3-periphery/constants';

export const token0Decimals: number = 18        // Token0 decimals
export const token1Decimals: number = 18        // Token1 decimals
export const feeTier: number = 3000             // UniswapV3Pool fee tier - 0.3%
export const tickSpacing: number = 60           // Tick spacing, for fee tier 0.1% - 20, 0.3% - 60, 1% - 200

export const protocolFee: number = 10000        // 10 % protocol fee
export const maxTotalSupply: BigNumber = BigNumber.from("100000000000000000000000000000")
export const baseThreshold: number = 3600       // Base position threshold
export const limitThreshold: number = 1200      // Limit position threshold
export const periodAlphaVault: number = 1       // Rebalance after 1 second
export const minTickMove: number = 0
export const maxTWAPDeviation: number = 100     // 1%
export const durationTWAP = 1                   // 1 second
export const maxGasLimit = 12250000             // Local EVM gas limit

/** Uniswap v3 max and min tick value */
export const MIN_TICK = -887220
export const MAX_TICK = -MIN_TICK

/** Default balance of token0 and token1 */
export const tokenDefaultBalance: BigNumber = BigNumber.from("1000000000000000000000000000000")
/** Amount of deposit to AlphaVault1 */
export const alphaVaultDeposit: BigNumber = BigNumber.from("1000000000000000000000000000")
/** AlphaVault1 rebalance swap value */
export const alphaVaultRebalanceAmount: BigNumber = BigNumber.from("9000000000000000000000000")
/** Swap router maximum token input */
export const swapRouterMaximumIn: BigNumber = BigNumber.from("100000000000000000000000000000000000")
/** Initital price of pool */
export const defaultSqrtPriceX96 = "79228162514264337593543950336"

export const ethDefaultProvider: string = "http://localhost:8545"

export const g = '\u001b[' + 32 + 'm'
export const r = '\u001b[' + 31 + 'm'
export const w = '\u001b[0m';

/** Number of decimals */
export const FIXED_DIGITS = 4
/** Max value of uint128 */
export const MAX_UINT128 = BigNumber.from(2).pow(128).sub(1)

/** Base token used in calculation of decimal value from integer */
export const baseToken = new Token(
    1,
    '0x0000000000000000000000000000000000000000',
    token0Decimals
)

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

export const isBetween = (num1: number, num2: number, value: number) => value >= num1 && value <= num2

export function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/** NonfungiblePositionManager ABI */
export const nonfungiblePositionManagerABI = [
    "function collect(tuple(uint256 tokenId, address recipient, uint128 amount0Max, uint128 amount1Max)) external payable returns (uint256 amount0, uint256 amount1)",
    "function approve(address spender, uint256 tokenId) external",
    "function mint(tuple(address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint256 amount0Desired, uint256 amount1Desired, uint256 amount0Min, uint256 amount1Min, address recipient, uint256 deadline)) external returns(uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)",
    "function decreaseLiquidity(tuple(uint256 tokenId, uint128 liquidity, uint256 amount0Min, uint256 amount1Min, uint256 deadline)) external payable returns (uint256 amount0, uint256 amount1)",
    "function positions(uint256 tokenId) external view returns(uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)",
    "event IncreaseLiquidity(uint256 indexed tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)",
    "event DecreaseLiquidity(uint256 indexed tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)",
];

/** UniswapV3Pool ABI */
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

/** SwapRouter ABI */
export const swapRouterABI = [
    "function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external returns(uint256 amountOut)",
    "function exactOutputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountOut, uint256 amountInMaximum, uint160 sqrtPriceLimitX96)) external returns(uint256 amountIn)",
];

/** UniswapKey ABI */
export const uniswapKeyABI = [
    "function compute(address owner, int24 tickLower, int24 tickUpper) external pure returns(bytes32)"
]

/** AlphaVault's PassiveStrategy ABI */
export const passiveStrategyABI = [
    "function rebalance() external"
]

/** ERC20 Token ABI */
export const ERC20TokenABI = [
    "function balanceOf(address account) public view returns (uint256)",
    "function approve(address spender, uint256 amount) external returns (bool)"
]

/** UniswapBooster ABI */
export const uniswapBoosterABI = [
    "function boosterProtocolBalance1() external view returns(uint256)",
    "function positions(uint256 tokenId) public view returns(address operator, uint8 uniswapShares, uint256 amount0, uint256 amount1, int24 tickLower, int24 tickUpper, uint128 liquidity, uint128 tokensOwed0, uint128 tokensOwed1)",
    "function deposit(int24 baseLower, int24 baseUpper, uint256 amount0Desired, uint256 amount1Desired) external returns(uint256 boosterTokenId, uint256 tokenId, uint256 amount0, uint256 amount1)",
    "function depositNFT(uint256 tokenId) external returns(uint256 boosterTokenId, uint256 poolTokenId, uint256 amount0, uint256 amount1)",
    "function withdraw(uint256 tokenId, address to) external returns(uint256 feeAmount0, uint256 feeAmount1, uint256 total0, uint256 total1)",
    "function emergencyWithdraw(uint256 tokenId) external returns(uint256 total0, uint256 total1)",
    "function pause() external",
    "function unpause() external",
    "event Deposit(address indexed sender, uint256 tokenId0, uint256 tokenId1, uint256 amount0, uint256 amount1)",
    "event DepositNFT(address indexed sender, uint256 tokenId0, uint256 tokenId1)",
    "event Withdraw(address indexed sender, address indexed to, uint256 tokenId0, uint256 tokenId1, uint256 amount0, uint256 amount1, uint256 feeAmount0, uint256 feeAmount1)",
    "event EmergencyWithdraw(address indexed sender, uint256 tokenId0, uint256 tokenId1, uint256 amount0, uint256 amount1)"
]


/** AlphaVault ABI */
export const alphaVaultABI = [
    "event Deposit(address indexed sender, address indexed to, uint256 shares, uint256 amount0, uint256 amount1)",
    "event Withdraw(address indexed sender, address indexed to, uint256 shares, uint256 amount0, uint256 amount1)",
    "event CollectFees(uint256 feesToVault0, uint256 feesToVault1, uint256 feesToProtocol0, uint256 feesToProtocol1)",
    "event Snapshot(int24 tick, uint256 totalAmount0, uint256 totalAmount1, uint256 totalSupply)",
    "event LogData(int24 tickLower, int24 tickUpper, uint128 liquidity)",
    "function deposit(uint256 amount0Desired, uint256 amount1Desired, uint256 amount0Min, uint256 amount1Min, address to) external returns(uint256 shares, uint256 amount0, uint256 amount1)",
    "function withdraw(uint256 shares, uint256 amount0Min, uint256 amount1Min, address to) external returns(uint256 amount0, uint256 amount1)",
    "function baseLower() external view returns(int24)",
    "function baseUpper() external view returns(int24)",
    "function limitLower() external view returns(int24)",
    "function limitUpper() external view returns(int24)",
    "function accruedProtocolFees0() external view returns(uint256)",
    "function accruedProtocolFees1() external view returns(uint256)",
    "function getBalance0() public view returns (uint256)",
    "function getBalance1() public view returns (uint256)",
    "function getTotalAmounts() public view returns (uint256 total0, uint256 total1)",
    "function getPositionAmounts(int24 tickLower, int24 tickUpper) public view returns(uint256 amount0, uint256 amount1, uint128 _tokensOwed0, uint128 _tokensOwed1)",
    "function emergencyBurn(int24 tickLower, int24 tickUpper, uint128 liquidity)",
    "function _poke(int24 tickLower, int24 tickUpper) public",
    "function getLiquidityAt(int24 tickLower, int24 tickUpper) external pure returns(uint128 liquidity)",
    "function balanceOf(address account) public view returns (uint256)",
    "function rebalance(int256 swapAmount, uint160 sqrtPriceLimitX96, int24 _baseLower, int24 _baseUpper, int24 _bidLower, int24 _bidUpper, int24 _askLower, int24 _askUpper) external"
]