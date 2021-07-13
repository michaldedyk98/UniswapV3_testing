import { BigNumber } from '@ethersproject/bignumber';
import { Request, Response, NextFunction } from 'express';
import { Scenario } from '../../scripts/ScenarioFunctions';
import { tickSpacing } from '../../scripts/config/config';

// Reads ticks data from <tickCurrent - ticksToRead; tickCurrent + ticksToRead>
const getTicksData = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const ticksToRead: number = Number(req.query.ticksToRead);
        let tickCurrent = undefined;

        if (req.query.tickCurrent)
            tickCurrent = Number(req.query.tickCurrent)

        if (!(ticksToRead || ticksToRead == 0))
            return res.status(400).json({ message: 'Parameter ticksToRead is required' });

        const tickData = await Scenario.GetTicksData(ticksToRead, tickCurrent);

        return res.status(200).json(tickData);
    } catch (err) {
        return res.status(500).json({
            message: 'Failed to read ticks data',
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

    if (!(amount0Desired && amount1Desired && amount0Min && amount1Min))
        return res.status(400).json({ message: 'Parameter amount0Desired, amount1Desired, amount0Min, amount1Min is required' });

    try {
        const depositResult = await Scenario.Deposit(
            BigNumber.from(amount0Desired),
            BigNumber.from(amount1Desired),
            BigNumber.from(amount0Min),
            BigNumber.from(amount1Min)
        );

        const totalAmounts = await Scenario.GetTotalAmounts();

        return res.status(200).json({
            ...depositResult,
            ...totalAmounts
        });
    } catch (err) {
        return res.status(500).json({
            message: 'Failed to deposit',
            error: err
        });
    }
};

// Withdraws tokens from AlphaVault (and uniswap v3 pool)
const withdraw = async (req: Request, res: Response, next: NextFunction) => {
    let shares: string = req.body.shares;
    let amount0Min: string = req.body.amount0Min;
    let amount1Min: string = req.body.amount1Min;

    if (!(shares && amount0Min && amount1Min))
        return res.status(400).json({ message: 'Parameter shares, amount0Min, amount1Min is required' });

    try {
        const withdrawResult = await Scenario.Withdraw(
            BigNumber.from(shares),
            BigNumber.from(amount0Min),
            BigNumber.from(amount1Min)
        );

        return res.status(200).json(withdrawResult);
    } catch (err) {
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

    if (!(amountIn && amountOutMinimum))
        return res.status(400).json({ message: 'Parameter amountIn and amountOutMinimum is required' });

    try {
        const swapResult = await Scenario.SwapExactInput(
            BigNumber.from(amountIn),
            BigNumber.from(amountOutMinimum),
        );

        const totalAmounts = await Scenario.GetTotalAmounts();
        const tickData = await Scenario.GetTicksData(0, Math.trunc(swapResult.tickSwap / tickSpacing) * tickSpacing);

        return res.status(200).json({
            ...swapResult,
            ...totalAmounts,
            ...tickData[0]
        });
    } catch (err) {
        return res.status(500).json({
            message: 'Failed to swap',
            error: err
        });
    }
};

// Executes exactOutputSingle swap on uniswap v3
const swapExactOutput = async (req: Request, res: Response, next: NextFunction) => {
    let amountOut: string = req.body.amountOut;
    let amountInMinimum: string = req.body.amountInMinimum;

    if (!(amountOut && amountInMinimum))
        return res.status(400).json({ message: 'Parameter amountOut and amountInMinimum is required' });

    try {
        const swapResult = await Scenario.SwapExactOutput(
            BigNumber.from(amountOut),
            BigNumber.from(amountInMinimum),
        );

        const totalAmounts = await Scenario.GetTotalAmounts();
        const tickData = await Scenario.GetTicksData(0, Math.trunc(swapResult.tickSwap / tickSpacing) * tickSpacing);

        return res.status(200).json({
            ...swapResult,
            ...totalAmounts,
            ...tickData[0]
        });
    } catch (err) {
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

    if (!(tickLower && tickUpper && liquidity))
        return res.status(400).json({ message: 'Parameter tickLower, tickUpper, liquidity is required' });

    try {
        const swapResult = await Scenario.EmergencyBurn(
            Number(tickLower),
            Number(tickUpper),
            BigNumber.from(liquidity),
        );

        return res.status(200).json(swapResult);
    } catch (err) {
        return res.status(500).json({
            message: 'Failed to emergency burn',
            error: err
        });
    }
};

// Executes rebalance on AlphaVault contract
const rebalance = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const rebalanceResult = await Scenario.Rebalance();
        const tickData = await Scenario.GetTicksData(0, Math.trunc(rebalanceResult.tickRebalance / tickSpacing) * tickSpacing);

        return res.status(200).json({
            ...rebalanceResult,
            ...tickData[0]
        });
    } catch (err) {
        return res.status(500).json({
            message: 'Failed to rebalance',
            error: err
        });
    }
};

// Returns slot0 of UniswapV3Pool
const getSlot0 = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const slot0 = await Scenario.GetSlot0();
        const liquidity = await Scenario.GetPoolLiquidity();

        return res.status(200).json({
            tick: slot0.tick,
            nearestTick: Math.trunc(slot0.tick / tickSpacing) * tickSpacing,
            sqrtPriceX96: slot0.sqrtPriceX96.toString(),
            liquidity: liquidity.toString(),
            observationIndex: slot0.observationIndex,
            observationCardinality: slot0.observationCardinality,
            observationCardinalityNext: slot0.observationCardinalityNext,
            feeProtocol: slot0.feeProtocol,
            unlocked: slot0.unlocked,
        });
    } catch (err) {
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

        return res.status(200).json(alphaVaultData);
    } catch (err) {
        return res.status(500).json({
            message: 'Failed to read AlphaVault contract',
            error: err
        });
    }
};

const getBalance0 = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const balance0 = await Scenario.GetBalance0();

        return res.status(200).json(balance0);
    } catch (err) {
        return res.status(500).json({
            message: 'Failed to get balance0 from AlphaVault contract',
            error: err
        });
    }
};

const getBalance1 = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const balance1 = await Scenario.GetBalance1();

        return res.status(200).json(balance1);
    } catch (err) {
        return res.status(500).json({
            message: 'Failed to get balance1 from AlphaVault contract',
            error: err
        });
    }
};

const getTotalAmounts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const totalAmounts = await Scenario.GetTotalAmounts();

        return res.status(200).json(totalAmounts);
    } catch (err) {
        return res.status(500).json({
            message: 'Failed to read total amount from AlphaVault contract',
            error: err
        });
    }
};

const getPositionAmounts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!(req.query.tickLower && req.query.tickUpper))
            return res.status(400).json({ message: 'Parameter tickLower and tickUpper is required' });

        const tickLower: number = Number(req.query.tickLower);
        const tickUpper: number = Number(req.query.tickUpper);

        const totalAmounts = await Scenario.GetPositionAmounts(tickLower, tickUpper);

        return res.status(200).json(totalAmounts);
    } catch (err) {
        return res.status(500).json({
            message: 'Failed to read positions amounts from AlphaVault contract',
            error: err
        });
    }
};

export default {
    getPositionAmounts,
    getAlphaVaultData,
    getTotalAmounts,
    getTicksData,
    getBalance0,
    getBalance1,
    getSlot0,
    deposit,
    withdraw,
    rebalance,
    swapExactInput,
    swapExactOutput,
    emergencyBurn
};