"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FEE_TIER_TO_FEE_AMOUNT = exports.FEE_TIER_TO_TICK_SPACING = exports.MAX_UINT128 = exports.DEFAULT_SURROUNDING_TICKS = exports.PRICE_FIXED_DIGITS = void 0;
var bignumber_1 = require("@ethersproject/bignumber");
var v3_sdk_1 = require("@uniswap/v3-sdk");
exports.PRICE_FIXED_DIGITS = 4;
exports.DEFAULT_SURROUNDING_TICKS = 1;
exports.MAX_UINT128 = bignumber_1.BigNumber.from(2).pow(128).sub(1);
var FEE_TIER_TO_TICK_SPACING = function (feeTier) {
    switch (feeTier) {
        case '10000':
            return 200;
        case '3000':
            return 60;
        case '500':
            return 10;
        default:
            throw Error("Tick spacing for fee tier " + feeTier + " undefined.");
    }
};
exports.FEE_TIER_TO_TICK_SPACING = FEE_TIER_TO_TICK_SPACING;
var FEE_TIER_TO_FEE_AMOUNT = function (feeTier) {
    switch (feeTier) {
        case '10000':
            return v3_sdk_1.FeeAmount.HIGH;
        case '3000':
            return v3_sdk_1.FeeAmount.MEDIUM;
        case '500':
            return v3_sdk_1.FeeAmount.LOW;
        default:
            throw Error("FeeAmount for fee tier " + feeTier + " undefined.");
    }
};
exports.FEE_TIER_TO_FEE_AMOUNT = FEE_TIER_TO_FEE_AMOUNT;
//# sourceMappingURL=config.js.map