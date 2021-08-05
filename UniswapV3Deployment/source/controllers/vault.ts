import { BigNumber } from '@ethersproject/bignumber';
import { Request, Response, NextFunction } from 'express';
import { Scenario } from '../../scripts/ScenarioFunctions';
import { tickSpacing } from '../../scripts/config/config';
import { log } from '../../scripts/config/db';
import internal from './internal'
import HttpException from '../../scripts/models/HttpException';

// Reads ticks data from <tickCurrent - ticksToRead; tickCurrent + ticksToRead>
const getTicksData = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const ticksToRead: number = Number(req.query.ticksToRead);
        let tickCurrent = undefined;

        if (req.query.tickCurrent)
            tickCurrent = Number(req.query.tickCurrent)

        if (!(ticksToRead || ticksToRead == 0)) {
            log('getTicksData', 'Parameter ticksToRead is required', req.body, {})

            return res.status(400).json({ message: 'Parameter ticksToRead is required' });
        }

        const tickData = await Scenario.GetTicksData(ticksToRead, tickCurrent);

        log('getTicksData', 'Success', req.query, tickData)

        return res.status(200).json(tickData);
    } catch (err) {
        log('getTicksData', 'Failed to read ticks data', req.query, err)

        return res.status(500).json({
            message: 'Failed to read ticks data',
            error: err
        });
    }
};

// Adds liquidity to uniswap using nonfungiblePositionManager
const addLiquidity = async (req: Request, res: Response, next: NextFunction) => {
    let tickLower: string = req.body.tickLower;
    let tickUpper: string = req.body.tickUpper;
    let amount0: string = req.body.amount0;
    let amount1: string = req.body.amount1;

    if (!(tickLower && tickUpper && amount0 && amount1)) {
        log('addLiquidity', 'Parameter tickLower, tickUpper, amount0, amount1 is required', req.body, {})

        return res.status(400).json({ message: 'Parameter tickLower, tickUpper, amount0, amount1 is required' });
    }

    try {
        const result = await Scenario.AddLiquidity(
            Number(tickLower),
            Number(tickUpper),
            BigNumber.from(amount0),
            BigNumber.from(amount1),
        );

        log('addLiquidity', 'Success', req.body, result)

        return res.status(200).json(result);
    } catch (err) {
        log('addLiquidity', 'Failed to add liquidity using nonfungiblePositionManager', req.body, err)

        return res.status(500).json({
            message: 'Failed to add liquidity using nonfungiblePositionManager',
            error: err
        });
    }
};

// Deposits tokens into Alpha Vault
const deposit = async (req: Request, res: Response, next: NextFunction) => {
    let amount0Desired: string = req.body.amount0Desired;
    let amount1Desired: string = req.body.amount1Desired;
    let amount0Min: string = req.body.amount0Min;
    let amount1Min: string = req.body.amount1Min;
    let vault: number = req.body.vault;

    if (!(amount0Desired && amount1Desired && amount0Min && amount1Min && (vault != null))) {
        log('deposit', 'Parameter amount0Desired, amount1Desired, amount0Min, amount1Min, vault is required', req.body, {})

        return res.status(400).json({ message: 'Parameter amount0Desired, amount1Desired, amount0Min, amount1Min, vault is required' });
    }

    try {
        const depositResult = await Scenario.Deposit(
            BigNumber.from(amount0Desired),
            BigNumber.from(amount1Desired),
            BigNumber.from(amount0Min),
            BigNumber.from(amount1Min),
            vault
        );

        const totalAmounts = await Scenario.GetTotalAmounts(vault);
        const result = {
            ...depositResult,
            ...totalAmounts
        }

        log('deposit', 'Success', req.body, result)

        return res.status(200).json(result);
    } catch (err) {
        log('deposit', 'Failed to deposit', req.body, err)

        return res.status(500).json({
            message: 'Failed to deposit',
            error: err
        });
    }
};

// Deposits tokens into uniswap booster
const boosterDeposit = async (req: Request, res: Response, next: NextFunction) => {
    let amount0Desired: string = req.body.amount0Desired;
    let amount1Desired: string = req.body.amount1Desired;
    let baseLower: string = req.body.baseLower;
    let baseUpper: string = req.body.baseUpper;

    if (!(amount0Desired != null && amount1Desired != null && baseLower != null && baseUpper != null)) {
        log('boosterDeposit', 'Parameter amount0Desired, amount1Desired, baseLower, baseUpper is required', req.body, {})

        return res.status(400).json({ message: 'Parameter amount0Desired, amount1Desired, baseLower, baseUpper is required' });
    }

    try {
        const depositResult = await Scenario.BoosterDeposit(
            Number(baseLower),
            Number(baseUpper),
            BigNumber.from(amount0Desired),
            BigNumber.from(amount1Desired),
        );

        log('boosterDeposit', 'Success', req.body, depositResult)

        return res.status(200).json(depositResult);
    } catch (err) {
        log('boosterDeposit', 'Failed to deposit', req.body, err)

        return res.status(500).json({
            message: 'Failed to deposit',
            error: err
        });
    }
};

// Deposits NFT token into uniswap booster
const boosterDepositNFT = async (req: Request, res: Response, next: NextFunction) => {
    let tokenId: string = req.body.tokenId;

    if (!(tokenId != null)) {
        log('boosterDepositNFT', 'Parameter tokenId is required', req.body, {})

        return res.status(400).json({ message: 'Parameter tokenId is required' });
    }

    try {
        const depositResult = await Scenario.BoosterDepositNFT(
            BigNumber.from(tokenId),
        );

        log('boosterDepositNFT', 'Success', req.body, depositResult)

        return res.status(200).json(depositResult);
    } catch (err) {
        log('boosterDepositNFT', 'Failed to deposit', req.body, err)

        return res.status(500).json({
            message: 'Failed to deposit NFT',
            error: err
        });
    }
};

// Withdraws all tokens from UniswapBooster
const boosterWithdraw = async (req: Request, res: Response, next: NextFunction) => {
    let tokenId: string = req.body.tokenId;

    if (!(tokenId != null)) {
        log('boosterWithdraw', 'Parameter tokenId is required', req.body, {})

        return res.status(400).json({ message: 'Parameter tokenId is required' });
    }

    try {
        const depositResult = await Scenario.BoosterWithdraw(
            BigNumber.from(tokenId),
        );

        log('boosterWithdraw', 'Success', req.body, depositResult)

        return res.status(200).json(depositResult);
    } catch (err) {
        log('boosterWithdraw', 'Failed to withdraw', req.body, err)

        return res.status(500).json({
            message: 'Failed to withdraw',
            error: err
        });
    }
};


// Withdraws all tokens from UniswapBooster (paused only)
const boosterEmergencyWithdraw = async (req: Request, res: Response, next: NextFunction) => {
    let tokenId: string = req.body.tokenId;

    if (!(tokenId != null)) {
        log('boosterEmergencyWithdraw', 'Parameter tokenId is required', req.body, {})

        return res.status(400).json({ message: 'Parameter tokenId is required' });
    }

    try {
        const depositResult = await Scenario.BoosterEmergencyWithdraw(
            BigNumber.from(tokenId),
        );

        log('boosterEmergencyWithdraw', 'Success', req.body, depositResult)

        return res.status(200).json(depositResult);
    } catch (err) {
        log('boosterEmergencyWithdraw', 'Failed to withdraw', req.body, err)

        return res.status(500).json({
            message: 'Failed to withdraw',
            error: err
        });
    }
};

// Pauses booster contract
const boosterPause = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await Scenario.BoosterPause();

        log('boosterPause', 'Success', req.body, {})

        return res.status(200).json({ message: 'Success' });
    } catch (err) {
        log('boosterPause', 'Failed to pause', req.body, err)

        return res.status(500).json({
            message: 'Failed to pause',
            error: err
        });
    }
};

// Pauses booster contract
const boosterUnpause = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await Scenario.BoosterUnpause();

        log('boosterUnpause', 'Success', req.body, {})

        return res.status(200).json({ message: 'Success' });
    } catch (err) {
        log('boosterUnpause', 'Failed to unpause', req.body, err)

        return res.status(500).json({
            message: 'Failed to unpause',
            error: err
        });
    }
};

// Withdraws tokens from AlphaVault (and uniswap v3 pool)
const withdraw = async (req: Request, res: Response, next: NextFunction) => {
    let shares: string = req.body.shares;
    let amount0Min: string = req.body.amount0Min;
    let amount1Min: string = req.body.amount1Min;
    let vault: number = req.body.vault;

    if (!(shares && amount0Min && amount1Min && (vault != null))) {
        log('withdraw', 'Parameter shares, amount0Min, amount1Min, vault is required', req.body, {})

        return res.status(400).json({ message: 'Parameter shares, amount0Min, amount1Min, vault is required' });
    }

    try {
        const withdrawResult = await Scenario.Withdraw(
            BigNumber.from(shares),
            BigNumber.from(amount0Min),
            BigNumber.from(amount1Min),
            vault
        );

        log('withdraw', 'Success', req.body, withdrawResult)

        return res.status(200).json(withdrawResult);
    } catch (err) {
        log('withdraw', 'Failed to withdraw', req.body, err)

        return res.status(500).json({
            message: 'Failed to withdraw',
            error: err
        });
    }
};

// Executes exactInputSingle swap on uniswap v3
const swapExactInput = async (req: Request, res: Response, next: NextFunction) => {
    let amountIn: string = req.body.amountIn;
    let amountOutMinimum: string = req.body.amountOutMinimum;
    let tokenIn: string = req.body.tokenIn;
    let tokenOut: string = req.body.tokenOut;
    let vault: number = req.body.vault ?? 0;

    if (!(amountIn && amountOutMinimum && tokenIn && tokenOut)) {
        log('swapExactInput', 'Parameter amountIn, amountOutMinimum is required', req.body, {})

        return res.status(400).json({ message: 'Parameter amountIn, amountOutMinimum is required' });
    }

    try {
        const swapResult = await Scenario.SwapExactInput(
            BigNumber.from(amountIn),
            BigNumber.from(amountOutMinimum),
            tokenIn,
            tokenOut,
        );

        const totalAmounts = await Scenario.GetTotalAmounts(vault);
        const tickData = await Scenario.GetTicksData(0, Math.floor(swapResult.tickSwap / tickSpacing) * tickSpacing);
        const result = {
            ...swapResult,
            ...totalAmounts,
            ...tickData[0]
        }

        log('swapExactInput', 'Success', req.body, result)

        return res.status(200).json(result);
    } catch (err) {
        log('swapExactInput', 'Failed to swap', req.body, err)

        return res.status(500).json({
            message: 'Failed to swap',
            error: err
        });
    }
};

// Executes exactOutputSingle swap on uniswap v3
const swapExactOutput = async (req: Request, res: Response, next: NextFunction) => {
    let amountOut: string = req.body.amountOut;
    let amountInMaximum: string = req.body.amountInMaximum;
    let tokenIn: string = req.body.tokenIn;
    let tokenOut: string = req.body.tokenOut;
    let vault: number = req.body.vault ?? 0;

    if (!(amountOut && amountInMaximum && tokenIn && tokenOut)) {
        log('swapExactOutput', 'Parameter amountOut, amountInMaximum, tokenIn, tokenOut is required', req.body, {})

        return res.status(400).json({ message: 'Parameter amountOut, amountInMaximum, tokenIn, tokenOut is required' });
    }

    try {
        const swapResult = await Scenario.SwapExactOutput(
            BigNumber.from(amountOut),
            BigNumber.from(amountInMaximum),
            tokenIn,
            tokenOut
        );

        const totalAmounts = await Scenario.GetTotalAmounts(vault);
        const tickData = await Scenario.GetTicksData(0, Math.floor(swapResult.tickSwap / tickSpacing) * tickSpacing);
        const result = {
            ...swapResult,
            ...totalAmounts,
            ...tickData[0]
        }

        log('swapExactOutput', 'Success', req.body, result)

        return res.status(200).json(result);
    } catch (err) {
        log('swapExactOutput', 'Failed to swap', req.body, err)

        return res.status(500).json({
            message: 'Failed to swap',
            error: err
        });
    }
};

const emergencyBurn = async (req: Request, res: Response, next: NextFunction) => {
    let tickLower: string = req.body.tickLower;
    let tickUpper: string = req.body.tickUpper;
    let liquidity: string = req.body.liquidity;
    let vault: number = req.body.vault;

    if (!(tickLower && tickUpper && liquidity && (vault != null))) {
        log('emergencyBurn', 'Parameter tickLower, tickUpper, liquidity, vault is required', req.body, {})

        return res.status(400).json({ message: 'Parameter tickLower, tickUpper, liquidity, vault is required' });
    }

    try {
        const swapResult = await Scenario.EmergencyBurn(
            Number(tickLower),
            Number(tickUpper),
            BigNumber.from(liquidity),
            vault
        );

        log('emergencyBurn', 'Success', req.body, swapResult)

        return res.status(200).json(swapResult);
    } catch (err) {
        log('emergencyBurn', 'Failed to emergency burn', req.body, err)

        return res.status(500).json({
            message: 'Failed to emergency burn',
            error: err
        });
    }
};

// Executes rebalance on AlphaVault contract
const rebalance = async (req: Request, res: Response, next: NextFunction) => {
    try {
        let vault: number = req.body.vault;

        if (!(vault != null)) {
            log('emergencyBurn', 'Parameter vault is required', req.body, {})

            return res.status(400).json({ message: 'Parameter vault is required' });
        }
        const result = await internal.rebalance(req.body, vault)

        return res.status(200).json(result);
    } catch (err) {
        return res.status(500).json({
            message: 'Failed to rebalance',
            error: err
        });
    }
};

// Executes manual rebalance on AlphaVault contract
const manualRebalance = async (req: Request, res: Response, next: NextFunction) => {
    try {
        let swapAmount: string = req.body.swapAmount;
        let sqrtPriceLimitX96: string = req.body.sqrtPriceLimitX96;
        let baseLower: string = req.body.baseLower;
        let baseUpper: string = req.body.baseUpper;
        let bidLower: string = req.body.bidLower;
        let bidUpper: string = req.body.bidUpper;
        let askLower: string = req.body.askLower;
        let askUpper: string = req.body.askUpper;
        let vault: number = req.body.vault;

        if (!(swapAmount && sqrtPriceLimitX96 && baseLower && baseUpper && bidLower && bidUpper && askLower && askUpper && (vault != null))) {
            const message = 'Parameter swapAmount, sqrtPriceLimitX96, baseLower, baseUpper, bidLower, bidUpper, askLower, askUpper, vault is required'
            log('emergencyBurn', message, req.body, {})

            return res.status(400).json({ message: message });
        }

        const rebalanceResult = await Scenario.ManualRebalance(
            BigNumber.from(swapAmount),
            BigNumber.from(sqrtPriceLimitX96),
            BigNumber.from(baseLower),
            BigNumber.from(baseUpper),
            BigNumber.from(bidLower),
            BigNumber.from(bidUpper),
            BigNumber.from(askLower),
            BigNumber.from(askUpper),
            vault
        );
        const tickData = await Scenario.GetTicksData(0, Math.floor(rebalanceResult.tickRebalance / tickSpacing) * tickSpacing);
        const result = {
            ...rebalanceResult,
            ...tickData[0]
        }

        log('manualRebalance', 'Success', req.body, result)

        return res.status(200).json(result);
    } catch (err) {
        log('manualRebalance', 'Failed to rebalance', req.body, err)

        return res.status(500).json({
            message: 'Failed to rebalance',
            error: err,
        });
    }
};

// Deploys new AlphaVault
const deployAlphaVault = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await Scenario.AddAlphaVault(
        );

        log('deployAlphaVault', 'Success', req.body, result)

        return res.status(200).json(result);
    } catch (err) {
        log('deployAlphaVault', 'Failed to deploy alpha vault', req.body, err)

        return res.status(500).json({
            message: 'Failed to deploy alpha vault',
            error: err,
        });
    }
};

const processTransactions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!(req.query.offset && req.query.limit)) {
            log('processTransactions', 'Parameter offset, limit is required', req.query, {})

            return res.status(400).json({ message: 'Parameter offset, limit is required' });
        }

        const limit: number = Number(req.query.limit);
        const offset: number = Number(req.query.offset);
        let vault: number = Number(req.query.vault);

        internal.processTransactions(limit, offset)

        log('processTransactions', 'Success', req.query, {})

        return res.status(200).json({
            message: 'Success'
        });
    } catch (err) {
        log('processTransactions', 'Failed to process transactions', req.query, err)

        return res.status(500).json({
            message: 'Failed to process transactions',
            error: err
        });
    }
};

// Poke
const poke = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!(req.query.tickLower && req.query.tickUpper && req.query.vault != null)) {
            log('poke', 'Parameter tickLower, tickUpper, vault is required', req.query, {})

            return res.status(400).json({ message: 'Parameter tickLower, tickUpper, vault is required' });
        }

        const tickLower: number = Number(req.query.tickLower);
        const tickUpper: number = Number(req.query.tickUpper);
        let vault: number = Number(req.query.vault);

        await Scenario.Poke(tickLower, tickUpper, vault);

        log('poke', 'Success', req.query, {})

        return res.status(200).json({
            message: 'Success'
        });
    } catch (err) {
        log('poke', 'Failed to _poke', req.query, err)

        return res.status(500).json({
            message: 'Failed to _poke',
            error: err
        });
    }
};

const getLiquidityAt = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!(req.query.tickLower && req.query.tickUpper && req.query.vault != null)) {
            log('getLiquidityAt', 'Parameter tickLower, tickUpper, vault is required', req.query, {})

            return res.status(400).json({ message: 'Parameter tickLower, tickUpper, vault is required' });
        }

        const tickLower: number = Number(req.query.tickLower);
        const tickUpper: number = Number(req.query.tickUpper);
        let vault: number = Number(req.query.vault);

        const result = await Scenario.GetLiquidityAt(tickLower, tickUpper, vault);

        log('getLiquidityAt', 'Success', req.query, result)

        return res.status(200).json(result);
    } catch (err) {
        log('getLiquidityAt', 'Failed to getLiquidity at tickLower and tickUpper', req.query, err)

        return res.status(500).json({
            message: 'Failed to getLiquidity at tickLower and tickUpper',
            error: err
        });
    }
};

// Returns slot0 of UniswapV3Pool
const getSlot0 = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const slot0 = await Scenario.GetSlot0();
        const liquidity = await Scenario.GetPoolLiquidity();
        const protocolFees = await Scenario.GetProtocolFees();
        const result = {
            tick: slot0.tick,
            price: Scenario.TickToPrice(slot0.tick).toString(),
            nearestTick: Math.floor(slot0.tick / tickSpacing) * tickSpacing,
            sqrtPriceX96: slot0.sqrtPriceX96.toString(),
            liquidity: liquidity.toString(),
            observationIndex: slot0.observationIndex,
            observationCardinality: slot0.observationCardinality,
            observationCardinalityNext: slot0.observationCardinalityNext,
            feeProtocol: slot0.feeProtocol,
            unlocked: slot0.unlocked,
            token0Fees: protocolFees.token0.toString(),
            token1Fees: protocolFees.token1.toString(),
        }

        log('getSlot0', 'Success', req.query, result)

        return res.status(200).json(result);
    } catch (err) {
        log('getSlot0', 'Failed to read slot0', req.query, err)

        return res.status(500).json({
            message: 'Failed to read slot0',
            error: err
        });
    }
};

// Returns data (baseUpper, baseLower, etc.) from AlphaVault contract
const getAlphaVaultData = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const alphaVaultData = await Scenario.GetAlphaVaultData();

        log('getAlphaVaultData', 'Success', req.query, alphaVaultData)

        return res.status(200).json(alphaVaultData);
    } catch (err) {
        log('getAlphaVaultData', 'Failed to read AlphaVault contract', req.query, err)

        return res.status(500).json({
            message: 'Failed to read AlphaVault contract',
            error: err
        });
    }
};

const getBalance0 = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!(req.query.vault != null)) {
            log('getLiquidityAt', 'Parameter vault is required', req.query, {})

            return res.status(400).json({ message: 'Parameter vault is required' });
        }

        let vault: number = Number(req.query.vault);
        const balance0 = await Scenario.GetBalance0(vault);

        log('getBalance0', 'Success', req.query, balance0)

        return res.status(200).json(balance0);
    } catch (err) {
        log('getBalance0', 'Failed to get balance0 from AlphaVault contract', req.query, err)

        return res.status(500).json({
            message: 'Failed to get balance0 from AlphaVault contract',
            error: err
        });
    }
};

const getBalance1 = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!(req.query.vault != null)) {
            log('getLiquidityAt', 'Parameter vault is required', req.query, {})

            return res.status(400).json({ message: 'Parameter vault is required' });
        }

        let vault: number = Number(req.query.vault);
        const balance1 = await Scenario.GetBalance1(vault);

        log('getBalance1', 'Success', req.query, balance1)

        return res.status(200).json(balance1);
    } catch (err) {
        log('getBalance1', 'Failed to get balance1 from AlphaVault contract', req.query, err)

        return res.status(500).json({
            message: 'Failed to get balance1 from AlphaVault contract',
            error: err
        });
    }
};

const getBalanceOf = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await Scenario.BalanceOf();

        log('getBalanceOf', 'Success', req.query, result)

        return res.status(200).json(result);
    } catch (err) {
        log('getBalanceOf', 'Failed to get balanceOf KeyA', req.query, err)

        return res.status(500).json({
            message: 'Failed to get balanceOf KeyA',
            error: err
        });
    }
};


const getTotalAmounts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!(req.query.vault != null)) {
            log('getLiquidityAt', 'Parameter vault is required', req.query, {})

            return res.status(400).json({ message: 'Parameter vault is required' });
        }

        let vault: number = Number(req.query.vault);
        const totalAmounts = await Scenario.GetTotalAmounts(vault);

        log('getTotalAmounts', 'Success', req.query, totalAmounts)

        return res.status(200).json(totalAmounts);
    } catch (err) {
        log('getTotalAmounts', 'Failed to read total amount from AlphaVault contract', req.query, err)

        return res.status(500).json({
            message: 'Failed to read total amount from AlphaVault contract',
            error: err
        });
    }
};

const getBoosterPosition = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!(req.query.tokenId != null)) {
            log('getBoosterPosition', 'Parameter tokenId is required', req.query, {})

            return res.status(400).json({ message: 'Parameter tokenId is required' });
        }

        const tokenId: number = Number(req.query.tokenId);
        const positionAmounts = await Scenario.Positions(tokenId);

        log('getBoosterPosition', 'Success', req.query, positionAmounts)

        return res.status(200).json(positionAmounts);
    } catch (err) {
        log('getBoosterPosition', 'Failed to read positions from UniswapBooster contract', req.query, err)

        return res.status(500).json({
            message: 'Failed to read positions from UniswapBooster contract',
            error: err
        });
    }
};


const getPositionAmounts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!(req.query.tickLower && req.query.tickUpper && req.query.vault != null)) {
            log('getPositionAmounts', 'Parameter tickLower, tickUpper, vault is required', req.query, {})

            return res.status(400).json({ message: 'Parameter tickLower, tickUpper, vault is required' });
        }

        const tickLower: number = Number(req.query.tickLower);
        const tickUpper: number = Number(req.query.tickUpper);
        const vault: number = Number(req.query.vault);
        const positionAmounts = await Scenario.GetPositionAmounts(tickLower, tickUpper, vault);

        log('getPositionAmounts', 'Success', req.query, positionAmounts)

        return res.status(200).json(positionAmounts);
    } catch (err) {
        log('getPositionAmounts', 'Failed to read positions amounts from AlphaVault contract', req.query, err)

        return res.status(500).json({
            message: 'Failed to read positions amounts from AlphaVault contract',
            error: err
        });
    }
};

const getTVL = async (req: Request, res: Response, next: NextFunction) => {
    let ticks: number[] = req.body.ticks;
    let tick: number = req.body.tick;


    if (!(ticks && (tick || tick == 0))) {
        log('getTVL', 'Parameter ticks and tick is required', req.query, {})

        return res.status(400).json({ message: 'Parameter ticks and tick is required' });
    }

    try {
        const tvl = await Scenario.GetTVL(
            ticks,
            tick,
        );

        log('getTVL', 'Success', req.query, tvl)

        return res.status(200).json(tvl);
    } catch (err) {
        log('getTVL', 'Failed to get TVL', req.query, err)

        return res.status(500).json({
            message: 'Failed to get TVL',
            error: err
        });
    }
};

const getPriceImpactTVL = async (req: Request, res: Response, next: NextFunction) => {
    let expectedTick: number = req.body.expectedTick;
    let expectedPrice: number = req.body.expectedPrice;

    if ((expectedTick || expectedTick == 0) && expectedPrice) {
        log('getPriceImpactTVL', 'Only expectedTick or expectedPrice is allowed', req.body, {})

        return res.status(400).json({ message: 'Only expectedTick or expectedPrice is allowed' });
    }

    if (!((expectedTick || expectedTick == 0) || expectedPrice)) {
        log('getPriceImpactTVL', 'At least one parameter - expectedTick or expectedPrice is required', req.body, {})

        return res.status(400).json({ message: 'At least one parameter - expectedTick or expectedPrice is required' });
    }

    if (expectedTick == undefined && expectedPrice)
        expectedTick = await Scenario.PriceToClosestTick(expectedPrice)

    try {
        const tvlData = await Scenario.GetTVLData(expectedTick);

        log('getPriceImpactTVL', 'Success', req.body, tvlData)

        return res.status(200).json(tvlData);
    } catch (err) {
        log('getPriceImpactTVL', 'Failed to get price impact TVL', req.body, err)

        return res.status(500).json({
            message: 'Failed to get price impact TVL',
            error: err
        });
    }
};

const moveMarketTo = async (req: Request, res: Response, next: NextFunction) => {
    let expectedTick: number = req.body.expectedTick;
    let expectedPrice: number = req.body.expectedPrice;

    if ((expectedTick || expectedTick == 0) && expectedPrice) {
        log('moveMarketTo', 'Only expectedTick or expectedPrice is allowed', req.body, {})

        return res.status(400).json({ message: 'Only expectedTick or expectedPrice is allowed' });
    }

    if (!((expectedTick || expectedTick == 0) || expectedPrice)) {
        log('moveMarketTo', 'At least one parameter - expectedTick or expectedPrice is required', req.body, {})

        return res.status(400).json({ message: 'At least one parameter - expectedTick or expectedPrice is required' });
    }

    if (expectedTick == undefined && expectedPrice)
        expectedTick = await Scenario.PriceToClosestTick(expectedPrice)

    try {
        const result = await internal.moveMarketToTick(req.body, expectedTick)

        return res.status(200).json(result);
    }
    catch (err) {
        if (err instanceof HttpException)
            return res.status(err.status).json({
                error: err.message
            });

        return res.status(500).json({
            message: 'Failed to move market',
            error: err
        });
    }
};


const getAlphaVaultTVL = async (req: Request, res: Response, next: NextFunction) => {
    let tick: number = req.body.tick;
    let vault: number = req.body.vault;

    // if (!((tick || tick == 0) && (vault != null))) {
    //     log('getAlphaVaultTVL', 'Parameter tick, vault is required', req.body, {})

    //     return res.status(400).json({ message: 'Parameter tick, vault is required' });
    // }

    // const alphaVaultData = await Scenario.GetAlphaVaultData(vault);
    // const ticks: number[] = [
    //     alphaVaultData.baseLower,
    //     alphaVaultData.baseUpper,
    //     alphaVaultData.limitLower,
    //     alphaVaultData.limitUpper
    // ];

    // const ticksSorted = ticks.sort((n1, n2) => n1 - n2)

    try {
        // const tvl = await Scenario.GetTVL(
        //     ticksSorted,
        //     tick,
        // );

        // log('getAlphaVaultTVL', 'Success', req.body, tvl)

        return res.status(200).json({});
    } catch (err) {
        log('getAlphaVaultTVL', 'Failed to get TVL', req.body, err)

        return res.status(500).json({
            message: 'Failed to get TVL',
            error: err
        });
    }
};

export default {
    getPositionAmounts,
    getAlphaVaultData,
    getTotalAmounts,
    getLiquidityAt,
    getTicksData,
    getBalance0,
    getBalance1,
    getBalanceOf,
    getSlot0,
    getTVL,
    getAlphaVaultTVL,
    getPriceImpactTVL,
    getBoosterPosition,
    boosterDepositNFT,
    boosterDeposit,
    boosterWithdraw,
    boosterEmergencyWithdraw,
    boosterUnpause,
    boosterPause,
    deposit,
    withdraw,
    rebalance,
    manualRebalance,
    swapExactInput,
    swapExactOutput,
    emergencyBurn,
    poke,
    moveMarketTo,
    deployAlphaVault,
    processTransactions,
    addLiquidity,
};