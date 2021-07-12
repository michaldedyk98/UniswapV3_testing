"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var queries_1 = require("./queries");
var v3_sdk_1 = require("@uniswap/v3-sdk");
var sdk_core_1 = require("@uniswap/sdk-core");
var client_1 = require("./apollo/client");
var lodash_keyby_1 = __importDefault(require("lodash.keyby"));
var config_1 = require("./config/config");
var jsbi_1 = __importDefault(require("jsbi"));
var common_1 = require("./models/common");
var g = '\u001b[' + 32 + 'm';
var r = '\u001b[' + 31 + 'm';
var w = '\u001b[0m';
var poolAddress = "0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8";
var INITIAL_TICKS_TO_FETCH = 200;
var token0;
var token1;
var tickIdxToInitializedTick;
var ticksProcessed;
var poolResult;
function main() {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var _b, data, error, loading, tickSpacing, activeTickIdx, tick, tickIdxLowerBound, tickIdxUpperBound, skip, initializedTicks, activeTickProcessed, activeTick, subsequentTicks, previousTicks, feeTier, poolTickData, entries, entryTickIdx, entry, entryNext, entryPrev;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, client_1.client.query({
                        query: queries_1.poolQuery,
                        variables: {
                            poolAddress: poolAddress,
                        },
                    })];
                case 1:
                    _b = _c.sent(), data = _b.data, error = _b.error, loading = _b.loading;
                    poolResult = data;
                    tickSpacing = config_1.FEE_TIER_TO_TICK_SPACING(poolResult.pool.feeTier);
                    activeTickIdx = Math.floor(+poolResult.pool.tick / tickSpacing) * tickSpacing;
                    console.log("1 to sqrtTickRatioX96 " + v3_sdk_1.TickMath.getSqrtRatioAtTick(0));
                    console.log("Current tick: " + g + poolResult.pool.tick + w);
                    console.log("Nearest tick: " + g + activeTickIdx + w);
                    console.log("Pool liquidity " + poolResult.pool.liquidity);
                    console.log("Pool sqrt price: " + poolResult.pool.sqrtPrice);
                    console.log("Tick spacing: " + config_1.FEE_TIER_TO_TICK_SPACING(poolResult.pool.feeTier));
                    console.log("Fee tier: " + poolResult.pool.feeTier);
                    console.log("Token0 symbol: " + poolResult.pool.token0.symbol);
                    console.log("Token1 symbol: " + poolResult.pool.token1.symbol);
                    tick = parseInt((_a = process.argv[2]) !== null && _a !== void 0 ? _a : activeTickIdx);
                    tickIdxLowerBound = activeTickIdx - config_1.DEFAULT_SURROUNDING_TICKS * tickSpacing;
                    tickIdxUpperBound = activeTickIdx + config_1.DEFAULT_SURROUNDING_TICKS * tickSpacing;
                    skip = 0;
                    return [4 /*yield*/, client_1.client.query({
                            query: queries_1.tickQuery,
                            fetchPolicy: 'network-only',
                            variables: {
                                poolAddress: poolAddress,
                                tickIdxLowerBound: tickIdxLowerBound,
                                tickIdxUpperBound: tickIdxUpperBound,
                                skip: skip,
                            },
                        })];
                case 2:
                    initializedTicks = (_c.sent()).data;
                    console.log("Ticks received: " + initializedTicks.ticks.length);
                    tickIdxToInitializedTick = lodash_keyby_1.default(initializedTicks.ticks, 'tickIdx');
                    token0 = new sdk_core_1.Token(1, poolResult.pool.token0.id, parseInt(poolResult.pool.token0.decimals));
                    token1 = new sdk_core_1.Token(1, poolResult.pool.token1.id, parseInt(poolResult.pool.token1.decimals));
                    activeTickProcessed = {
                        liquidityActive: jsbi_1.default.BigInt(poolResult.pool.liquidity),
                        tickIdx: activeTickIdx,
                        liquidityNet: jsbi_1.default.BigInt(0),
                        price0: v3_sdk_1.tickToPrice(token0, token1, activeTickIdx).toFixed(config_1.PRICE_FIXED_DIGITS),
                        price1: v3_sdk_1.tickToPrice(token1, token0, activeTickIdx).toFixed(config_1.PRICE_FIXED_DIGITS),
                        liquidityGross: jsbi_1.default.BigInt(0),
                    };
                    activeTick = tickIdxToInitializedTick[activeTickIdx];
                    if (activeTick) {
                        activeTickProcessed.liquidityGross = jsbi_1.default.BigInt(activeTick.liquidityGross);
                        activeTickProcessed.liquidityNet = jsbi_1.default.BigInt(activeTick.liquidityNet);
                    }
                    subsequentTicks = computeSurroundingTicks(activeTickProcessed, tickSpacing, config_1.DEFAULT_SURROUNDING_TICKS, common_1.Direction.ASC);
                    previousTicks = computeSurroundingTicks(activeTickProcessed, tickSpacing, config_1.DEFAULT_SURROUNDING_TICKS, common_1.Direction.DESC);
                    ticksProcessed = previousTicks.concat(activeTickProcessed).concat(subsequentTicks);
                    console.log("Previous ticks length: " + previousTicks.length);
                    console.log("Subsequent ticks length: " + subsequentTicks.length);
                    feeTier = poolResult.pool.feeTier;
                    poolTickData = {
                        ticksProcessed: ticksProcessed,
                        feeTier: feeTier,
                        tickSpacing: tickSpacing,
                        activeTickIdx: activeTickIdx,
                    };
                    return [4 /*yield*/, formatData(poolTickData)];
                case 3:
                    entries = _c.sent();
                    entryTickIdx = entries.findIndex(function (x) { return x.tickIdx == tick; });
                    entry = entries[entryTickIdx];
                    console.log("Entries: " + entries.length);
                    console.log("Tick to read: " + g + tick + w);
                    console.log("--------------------------------------");
                    entryNext = entries[entryTickIdx + 1];
                    console.log(g + ("TickIndex at tick " + entryNext.index + ": " + entryNext.tickIdx) + w);
                    console.log(g + ("Price0 at tick " + entryNext.index + ": " + entryNext.price0) + w);
                    console.log(g + ("Price1 at tick " + entryNext.index + ": " + entryNext.price1) + w);
                    console.log(g + (entryToTVL(entryNext) + " at tick " + entryNext.index) + w);
                    console.log("**************************************");
                    console.log(r + ("TickIndex at tick " + entryTickIdx + ": " + entry.tickIdx) + w);
                    console.log(r + ("Price0 at tick " + entryTickIdx + ": " + entry.price0) + w);
                    console.log(r + ("Price1 at tick " + entryTickIdx + ": " + entry.price1) + w);
                    console.log(r + ("TVL0 at tick " + entryTickIdx + ": " + entry.tvlToken0) + w);
                    console.log(r + ("TVL1 at tick " + entryTickIdx + ": " + entry.tvlToken1) + w);
                    console.log(r + (entryToTVL(entry) + " at tick " + entry.index) + w);
                    console.log("**************************************");
                    entryPrev = entries[entryTickIdx - 1];
                    console.log(g + ("TickIndex at tick " + entryPrev.index + ": " + entryPrev.tickIdx) + w);
                    console.log(g + ("Price0 at tick " + entryPrev.index + ": " + entryPrev.price0) + w);
                    console.log(g + ("Price1 at tick " + entryPrev.index + ": " + entryPrev.price1) + w);
                    console.log(g + (entryToTVL(entryPrev) + " at tick " + entryPrev.index) + w);
                    console.log("--------------------------------------");
                    return [2 /*return*/];
            }
        });
    });
}
function entryToTVL(tick) {
    if (tick.price1 < +(ticksProcessed[Math.floor(ticksProcessed.length / 2)].price1))
        return poolResult.pool.token0.symbol + " Locked: " + tick.tvlToken0 + " " + poolResult.pool.token0.symbol;
    return poolResult.pool.token1.symbol + " Locked: " + tick.tvlToken1 + " " + poolResult.pool.token1.symbol;
}
function formatData(poolTickData) {
    return __awaiter(this, void 0, void 0, function () {
        var newData;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, Promise.all(poolTickData.ticksProcessed.map(function (t, i) { return __awaiter(_this, void 0, void 0, function () {
                        var active, sqrtPriceX96, mockTicks, pool, nextSqrtX96, maxAmountToken0, outputRes0, _a, token1Amount, amount0, amount1;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    active = t.tickIdx === poolTickData.activeTickIdx;
                                    sqrtPriceX96 = v3_sdk_1.TickMath.getSqrtRatioAtTick(t.tickIdx);
                                    mockTicks = [
                                        {
                                            index: t.tickIdx - config_1.FEE_TIER_TO_TICK_SPACING(poolTickData.feeTier),
                                            liquidityGross: t.liquidityGross,
                                            liquidityNet: jsbi_1.default.multiply(t.liquidityNet, jsbi_1.default.BigInt('-1')),
                                        },
                                        {
                                            index: t.tickIdx,
                                            liquidityGross: t.liquidityGross,
                                            liquidityNet: t.liquidityNet,
                                        },
                                    ];
                                    pool = token0 && token1 ? new v3_sdk_1.Pool(token0, token1, config_1.FEE_TIER_TO_FEE_AMOUNT(poolTickData.feeTier), sqrtPriceX96, t.liquidityActive, t.tickIdx, mockTicks)
                                        : undefined;
                                    nextSqrtX96 = poolTickData.ticksProcessed[i - 1]
                                        ? v3_sdk_1.TickMath.getSqrtRatioAtTick(poolTickData.ticksProcessed[i - 1].tickIdx)
                                        : undefined;
                                    maxAmountToken0 = token0 ? sdk_core_1.CurrencyAmount.fromRawAmount(token0, config_1.MAX_UINT128.toString()) : undefined;
                                    if (!(pool && maxAmountToken0)) return [3 /*break*/, 2];
                                    return [4 /*yield*/, pool.getOutputAmount(maxAmountToken0, nextSqrtX96)];
                                case 1:
                                    _a = _b.sent();
                                    return [3 /*break*/, 3];
                                case 2:
                                    _a = undefined;
                                    _b.label = 3;
                                case 3:
                                    outputRes0 = _a;
                                    token1Amount = outputRes0 === null || outputRes0 === void 0 ? void 0 : outputRes0[0];
                                    amount0 = token1Amount ? parseFloat(token1Amount.toExact()) * parseFloat(t.price1) : 0;
                                    amount1 = token1Amount ? parseFloat(token1Amount.toExact()) : 0;
                                    return [2 /*return*/, {
                                            index: i,
                                            tickIdx: t.tickIdx,
                                            isCurrent: active,
                                            activeLiquidity: parseFloat(t.liquidityActive.toString()),
                                            price0: parseFloat(t.price0),
                                            price1: parseFloat(t.price1),
                                            tvlToken0: amount0,
                                            tvlToken1: amount1,
                                        }];
                            }
                        });
                    }); }))];
                case 1:
                    newData = _a.sent();
                    newData === null || newData === void 0 ? void 0 : newData.map(function (entry, i) {
                        if (i > 0) {
                            newData[i - 1].tvlToken0 = entry.tvlToken0;
                            newData[i - 1].tvlToken1 = entry.tvlToken1;
                        }
                    });
                    return [2 /*return*/, newData];
            }
        });
    });
}
var computeSurroundingTicks = function (activeTickProcessed, tickSpacing, numSurroundingTicks, direction) {
    var previousTickProcessed = __assign({}, activeTickProcessed);
    var processedTicks = [];
    for (var i = 0; i < numSurroundingTicks; i++) {
        var currentTickIdx = direction == common_1.Direction.ASC
            ? previousTickProcessed.tickIdx + tickSpacing
            : previousTickProcessed.tickIdx - tickSpacing;
        if (currentTickIdx < v3_sdk_1.TickMath.MIN_TICK || currentTickIdx > v3_sdk_1.TickMath.MAX_TICK) {
            break;
        }
        var currentTickProcessed = {
            liquidityActive: previousTickProcessed.liquidityActive,
            tickIdx: currentTickIdx,
            liquidityNet: jsbi_1.default.BigInt(0),
            price0: v3_sdk_1.tickToPrice(token0, token1, currentTickIdx).toFixed(config_1.PRICE_FIXED_DIGITS),
            price1: v3_sdk_1.tickToPrice(token1, token0, currentTickIdx).toFixed(config_1.PRICE_FIXED_DIGITS),
            liquidityGross: jsbi_1.default.BigInt(0),
        };
        var currentInitializedTick = tickIdxToInitializedTick[currentTickIdx.toString()];
        if (currentInitializedTick) {
            currentTickProcessed.liquidityGross = jsbi_1.default.BigInt(currentInitializedTick.liquidityGross);
            currentTickProcessed.liquidityNet = jsbi_1.default.BigInt(currentInitializedTick.liquidityNet);
        }
        if (direction == common_1.Direction.ASC && currentInitializedTick) {
            currentTickProcessed.liquidityActive = jsbi_1.default.add(previousTickProcessed.liquidityActive, jsbi_1.default.BigInt(currentInitializedTick.liquidityNet));
        }
        else if (direction == common_1.Direction.DESC && jsbi_1.default.notEqual(previousTickProcessed.liquidityNet, jsbi_1.default.BigInt(0))) {
            currentTickProcessed.liquidityActive = jsbi_1.default.subtract(previousTickProcessed.liquidityActive, previousTickProcessed.liquidityNet);
        }
        processedTicks.push(currentTickProcessed);
        previousTickProcessed = currentTickProcessed;
    }
    if (direction == common_1.Direction.DESC) {
        processedTicks = processedTicks.reverse();
    }
    return processedTicks;
};
main()
    .then(function () { return process.exit(0); })
    .catch(function (error) {
    console.error(error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map