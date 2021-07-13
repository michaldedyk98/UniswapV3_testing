export interface TickData {
    tick: number;
    price: string;
    initialized: boolean;
    liquidityGross: string;
    liquidityNet: string;
    tickCumulativeOutside: string;
    secondsPerLiquidityOutsideX128: string;
    secondsOutside: string;
    feeGrowthOutside0X128: string;
    feeGrowthOutside1X128: string;
}