import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { baseThreshold, defaultSqrtPriceX96, durationTWAP, ethDefaultProvider, feeTier, limitThreshold, maxGasLimit, maxTotalSupply, maxTWAPDeviation, MAX_TICK, minTickMove, MIN_TICK, periodAlphaVault, protocolFee, token0Decimals, token1Decimals, tokenDefaultBalance } from '../scripts/config/config';
import { ethers } from 'hardhat';
import { Db } from '../utils/Db';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const defaultProvider = ethers.getDefaultProvider(ethDefaultProvider);
    const { deployments } = hre;
    const { deploy } = deployments;

    const contracts = await Db.getContracts();
    const [keyA, keyB] = await ethers.getSigners();

    const factoryABI = (await deployments.getArtifact('UniswapV3Factory')).abi
    const uniswapFactory = await ethers.getContractAt(factoryABI, (await deployments.get('UniswapV3Factory')).address)

    const WETHAddress = contracts["WETH"].address
    const DAIAddress = contracts["DAI"].address

    const uniswapPoolAddress = await uniswapFactory.getPool(
        WETHAddress,
        DAIAddress,
        feeTier
    );
    const positionManagerAddress = (await deployments.get('NonfungiblePositionManager')).address
    const swapRouterAddress = (await deployments.get('SwapRouter')).address

    const resultBooster = await deploy('UniswapBooster', {
        from: keyA.address,
        args: [positionManagerAddress, swapRouterAddress, uniswapPoolAddress, feeTier, 10],
        gasLimit: maxGasLimit,
        log: true,
    });

    const WETHToken = await ethers.getContractAt('WETHToken', WETHAddress);
    const DAIToken = await ethers.getContractAt('DAIToken', DAIAddress);

    await WETHToken.connect(keyA).approve(resultBooster.address, tokenDefaultBalance.mul(1000));
    await DAIToken.connect(keyA).approve(resultBooster.address, tokenDefaultBalance.mul(1000));

    const resultAlphaVault0 = await deploy('AlphaVault', {
        from: keyA.address,
        args: [uniswapPoolAddress, protocolFee, maxTotalSupply],
        gasLimit: maxGasLimit,
        log: true,
    });

    await WETHToken.connect(keyA).approve(resultAlphaVault0.address, tokenDefaultBalance);
    await DAIToken.connect(keyA).approve(resultAlphaVault0.address, tokenDefaultBalance);

    const resultAlphaStrategy0 = await deploy('PassiveStrategy', {
        from: keyA.address,
        args: [
            resultAlphaVault0.address,
            baseThreshold,
            limitThreshold,
            periodAlphaVault,
            minTickMove,
            maxTWAPDeviation,
            durationTWAP,
            keyA.address
        ],
        gasLimit: maxGasLimit,
        log: true,
    });

    const alphaVault = await ethers.getContractAt('AlphaVault', resultAlphaVault0.address);
    await alphaVault.connect(keyA).setStrategy(resultAlphaStrategy0.address);
    await alphaVault.connect(keyA).rebalance(
        0,
        0,
        MIN_TICK,
        MAX_TICK,
        MIN_TICK + 60,
        -60,
        180,
        360,
        { gasLimit: maxGasLimit }
    )

    var values = [
        ['alphaVaultAddress0', resultAlphaVault0.address],
        ['alphaVaultPassiveStrategyAddress0', resultAlphaStrategy0.address],
        ['uniswapBooster', resultBooster.address],
    ];

    await Db.updateContracts(values);
};
export default func;
func.tags = ['Core'];
func.dependencies = ['Tokens']