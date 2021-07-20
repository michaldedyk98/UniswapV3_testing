import { BigNumber, BigNumberish } from '@ethersproject/bignumber';

export interface TickPool {
    tick: string
    feeTier: string
    token0: {
        symbol: string
        id: string
        decimals: string
    }
    token1: {
        symbol: string
        id: string
        decimals: string
    }
    sqrtPrice: string
    liquidity: string
}

export interface PoolResult {
    pool: TickPool
}

export interface Tick {
    tickIdx: string
    liquidityGross: string
    liquidityNet: string
    price0: string
    price1: string
}

export interface SurroundingTicksResult {
    ticks: Tick[]
}

export interface TickProcessed {
    liquidityGross: BigNumber
    liquidityNet: BigNumber
    tickIdx: number
    liquidityActive: BigNumber
    price0: string
    price1: string
}

export enum Direction {
    ASC,
    DESC,
}

export interface PoolTickData {
    ticksProcessed: TickProcessed[]
    feeTier: string
    tickSpacing: number
    activeTickIdx: number
}

export interface TickEntry {
    index: number,
    tickIdx: number,
    isCurrent: boolean
    activeLiquidity: number
    price0: number
    price1: number
    tvlToken0: number
    tvlToken1: number
}