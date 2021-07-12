import { BigNumber } from "@ethersproject/bignumber"
import { FeeAmount } from "@uniswap/v3-sdk"

export const PRICE_FIXED_DIGITS = 4
export const DEFAULT_SURROUNDING_TICKS = 1
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