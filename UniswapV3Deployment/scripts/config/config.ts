export const contractAddresses: Map<string, string> = new Map([
    ["WETH", "0x21dF544947ba3E8b3c32561399E88B52Dc8b2823"],
    ["DAI", "0x2E2Ed0Cfd3AD2f1d34481277b3204d807Ca2F8c2"],
]);

export const nonfungiblePositionManagerAddress = "0x04C89607413713Ec9775E14b954286519d836FEf";
export const uniswapV3FactoryAddress = "0x922D6956C99E12DFeB3224DEA977D0939758A1Fe";
export const swapRouterAddress = "0x5081a39b8A5f0E35a8D959395a630b68B74Dd30f";
export const defaultPoolAddress = "0x99727a87346BA85E0F9f5a3B7527729388aEf1d4";
export const uniswapKeyAddress = "0x4C4a2f8c81640e47606d3fd77B353E87Ba015584";

export const token0Decimals: number = 18;
export const token1Decimals: number = 18;
export const feeTier: number = 3000;
export const ticksToRead: number = 2;
export const tokenDefaultBalance: number = 1000000000000000;
export const defaultSqrtPriceX96 = "79228162514264337593543950336";

export const ethDefaultProvider: string = "http://localhost:8545";

export const g = '\u001b[' + 32 + 'm'
export const r = '\u001b[' + 31 + 'm'
export const w = '\u001b[0m';

export function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}