"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tickQuery = exports.poolQuery = void 0;
var graphql_tag_1 = __importDefault(require("graphql-tag"));
exports.poolQuery = graphql_tag_1.default(templateObject_1 || (templateObject_1 = __makeTemplateObject(["\n  query pool($poolAddress: String!) {\n    pool(id: $poolAddress) {\n      tick\n      token0 {\n        symbol\n        id\n        decimals\n      }\n      token1 {\n        symbol\n        id\n        decimals\n      }\n      feeTier\n      sqrtPrice\n      liquidity\n    }\n  }\n"], ["\n  query pool($poolAddress: String!) {\n    pool(id: $poolAddress) {\n      tick\n      token0 {\n        symbol\n        id\n        decimals\n      }\n      token1 {\n        symbol\n        id\n        decimals\n      }\n      feeTier\n      sqrtPrice\n      liquidity\n    }\n  }\n"])));
exports.tickQuery = graphql_tag_1.default(templateObject_2 || (templateObject_2 = __makeTemplateObject(["\n    query surroundingTicks(\n      $poolAddress: String!\n      $tickIdxLowerBound: BigInt!\n      $tickIdxUpperBound: BigInt!\n      $skip: Int!\n    ) {\n      ticks(\n        first: 1000\n        skip: $skip\n        where: { poolAddress: $poolAddress, tickIdx_lte: $tickIdxUpperBound, tickIdx_gte: $tickIdxLowerBound }\n      ) {\n        tickIdx\n        liquidityGross\n        liquidityNet\n        price0\n        price1\n      }\n    }\n  "], ["\n    query surroundingTicks(\n      $poolAddress: String!\n      $tickIdxLowerBound: BigInt!\n      $tickIdxUpperBound: BigInt!\n      $skip: Int!\n    ) {\n      ticks(\n        first: 1000\n        skip: $skip\n        where: { poolAddress: $poolAddress, tickIdx_lte: $tickIdxUpperBound, tickIdx_gte: $tickIdxLowerBound }\n      ) {\n        tickIdx\n        liquidityGross\n        liquidityNet\n        price0\n        price1\n      }\n    }\n  "])));
var templateObject_1, templateObject_2;
//# sourceMappingURL=queries.js.map