export const contractAddresses: Map<string, string> = new Map([
    ["WETH", "0x4A679253410272dd5232B3Ff7cF5dbB88f295319"],
    ["DAI", "0x7a2088a1bFc9d81c55368AE168C2C02570cB814F"],
]);

export const nonfungiblePositionManagerAddress = "0x322813Fd9A801c5507c9de605d63CEA4f2CE6c44";
export const uniswapV3FactoryAddress = "0x3Aa5ebB10DC797CAC828524e59A333d0A371443c";
export const swapRouterAddress = "0xc6e7DF5E7b4f2A278906862b61205850344D4e7d";
export const defaultPoolAddress = "0x9B5659cb585476753d69b065D89f770c85aEbe39";
export const uniswapKeyAddress = "0xa85233C63b9Ee964Add6F2cffe00Fd84eb32338f";
export const alphaVaultAddress = "0xf5059a5D33d5853360D16C683c16e67980206f36";
export const alphaVaultPassiveStrategyAddress = "0x70e0bA845a1A0F2DA3359C97E0285013525FFC49";

export const token0Decimals: number = 18;
export const token1Decimals: number = 18;
export const feeTier: number = 3000;
export const tickSpacing: number = 60;

export const protocolFee: number = 10000;
export const maxTotalSupply = 1e32
export const ticksToRead: number = 2;
export const baseThreshold: number = 3600;
export const limitThreshold: number = 1200;
export const periodAlphaVault: number = 5; // Rebalance after 5 seconds
export const minTickMove: number = 0;
export const maxTWAPDeviation: number = 100; // 1%
export const durationTWAP = 60; // 60 seconds
export const maxGasLimit = 12250000;

export const tokenDefaultBalance: number = 1000000000000000;
export const defaultSqrtPriceX96 = "79228162514264337593543950336";

export const ethDefaultProvider: string = "http://localhost:8545";

export const g = '\u001b[' + 32 + 'm'
export const r = '\u001b[' + 31 + 'm'
export const w = '\u001b[0m';

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
    "function exactOutputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountOut, uint256 amountInMinimum, uint160 sqrtPriceLimitX96)) external returns(uint256 amountIn)",
];

export const uniswapKeyABI = [
    "function compute(address owner, int24 tickLower, int24 tickUpper) external pure returns(bytes32)"
]

export const passiveStrategyABI = [
    "function rebalance() external"
]

export const alphaVaultABI = [
    "function deposit(uint256 amount0Desired, uint256 amount1Desired, uint256 amount0Min, uint256 amount1Min, address to) external returns(uint256 shares, uint256 amount0, uint256 amount1)",
    "function withdraw(uint256 shares, uint256 amount0Min, uint256 amount1Min, address to) external returns(uint256 amount0, uint256 amount1)",
    "event Deposit(address indexed sender, address indexed to, uint256 shares, uint256 amount0, uint256 amount1)",
    "event Withdraw(address indexed sender, address indexed to, uint256 shares, uint256 amount0, uint256 amount1)",
    "event CollectFees(uint256 feesToVault0, uint256 feesToVault1, uint256 feesToProtocol0, uint256 feesToProtocol1)",
    "event Snapshot(int24 tick, uint256 totalAmount0, uint256 totalAmount1, uint256 totalSupply)",
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
    "function emergencyBurn(int24 tickLower, int24 tickUpper, uint128 liquidity)"
]