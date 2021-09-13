import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { defaultSqrtPriceX96, delay, ethDefaultProvider, feeTier, lldexTokenDecimals, maxGasLimit, token0Decimals, token1Decimals, tokenDefaultBalance } from '../scripts/config/config';
import { ethers } from 'hardhat';
import { Db } from '../utils/Db';
import { BigNumber } from 'ethers';
import fs from 'fs';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const defaultProvider = ethers.getDefaultProvider(ethDefaultProvider);
    const { deployments } = hre;
    const { deploy, get } = deployments;

    const [keyA, keyB] = await ethers.getSigners();

    const resultLLDEX = await deploy('LLDEXToken', {
        from: keyA.address,
        args: [0, lldexTokenDecimals],
        gasLimit: maxGasLimit,
        log: true,
    });

    const resultWETH = await deploy('WETHToken', {
        from: keyA.address,
        args: [0, token0Decimals],
        gasLimit: maxGasLimit,
        log: true,
    });

    let resultDAI = await deploy('DAIToken', {
        from: keyA.address,
        args: [0, token1Decimals],
        gasLimit: maxGasLimit,
        log: true,
    });
    var currentPath = process.cwd();

    let deploymentId = 1;

    if (!BigNumber.from(resultWETH.address).lt(BigNumber.from(resultDAI.address))) {
        const path = require('path').resolve(
            currentPath,
            'deployments/local/DAIToken.json'
        );

        if (fs.existsSync(path))
            fs.unlinkSync(path);
    }

    while (!BigNumber.from(resultWETH.address).lt(BigNumber.from(resultDAI.address))) {
        const pathDeploymentPrevious = require('path').resolve(
            currentPath,
            `deployments/local/DAIToken${deploymentId - 1}.json`
        );

        if (fs.existsSync(pathDeploymentPrevious))
            fs.unlinkSync(pathDeploymentPrevious);

        await delay(100);

        resultDAI = await deploy('DAIToken' + deploymentId++, {
            contract: 'DAIToken',
            from: keyA.address,
            args: [0, token1Decimals],
            gasLimit: maxGasLimit,
            log: true,
        });
    }

    if (deploymentId != 1) {
        const path = require('path').resolve(
            currentPath,
            `deployments/local/DAIToken${deploymentId - 1}.json`
        );

        const pathNew = require('path').resolve(
            currentPath,
            'deployments/local/DAIToken.json'
        );

        fs.renameSync(path, pathNew);
    }

    const WETHToken = await ethers.getContractAt('WETHToken', resultWETH.address);
    const DAIToken = await ethers.getContractAt('DAIToken', resultDAI.address);
    const LLDEXToken = await ethers.getContractAt('LLDEXToken', resultLLDEX.address);

    const keyBBalance = ethers.BigNumber.from(100).mul(ethers.BigNumber.from(10).pow(18));

    await WETHToken.connect(keyA).mint(keyA.address, tokenDefaultBalance.mul(2).add(keyBBalance));
    await DAIToken.connect(keyA).mint(keyA.address, tokenDefaultBalance.mul(2).add(keyBBalance));
    await LLDEXToken.connect(keyA).mint(keyA.address, tokenDefaultBalance.mul(2).add(keyBBalance));

    await WETHToken.connect(keyA).transfer(keyB.address, keyBBalance);
    await DAIToken.connect(keyA).transfer(keyB.address, keyBBalance);
    await LLDEXToken.connect(keyA).transfer(keyB.address, keyBBalance);

    await WETHToken.connect(keyA).approve((await deployments.get('NonfungiblePositionManager')).address, tokenDefaultBalance.mul(1000));
    await DAIToken.connect(keyA).approve((await deployments.get('NonfungiblePositionManager')).address, tokenDefaultBalance.mul(1000));

    await WETHToken.connect(keyB).approve((await deployments.get('SwapRouter')).address, tokenDefaultBalance.mul(1000));
    await DAIToken.connect(keyB).approve((await deployments.get('SwapRouter')).address, tokenDefaultBalance.mul(1000));

    await WETHToken.connect(keyA).approve((await deployments.get('SwapRouter')).address, tokenDefaultBalance.mul(1000));
    await DAIToken.connect(keyA).approve((await deployments.get('SwapRouter')).address, tokenDefaultBalance.mul(1000));

    const positionManager = await ethers.getContractAt('INonfungiblePositionManager', (await deployments.get('NonfungiblePositionManager')).address);
    const token0 = WETHToken.address;
    const token1 = DAIToken.address;

    console.log((await deployments.get('NonfungiblePositionManager')).address);

    const result = await positionManager.connect(keyA).createAndInitializePoolIfNecessary(
        token0,
        token1,
        feeTier,
        defaultSqrtPriceX96,
        { gasLimit: maxGasLimit }
    )
    await defaultProvider.waitForTransaction(result.hash);

    const factoryABI = (await deployments.getArtifact('UniswapV3Factory')).abi;
    const uniswapFactory = await ethers.getContractAt(factoryABI, (await deployments.get('UniswapV3Factory')).address);
    const uniswapPoolAddress = await uniswapFactory.getPool(token0, token1, feeTier);
    const uniswapPool = await ethers.getContractAt("IUniswapV3Pool", uniswapPoolAddress);
    await uniswapPool.connect(keyA).increaseObservationCardinalityNext(150);

    const values = [
        ['defaultPoolAddress', uniswapPoolAddress],
        ['WETH', resultWETH.address],
        ['DAI', resultDAI.address],
        ['LLDEX', resultLLDEX.address]
    ];

    await Db.updateContracts(values);
};
export default func;
func.tags = ['Tokens'];
func.dependencies = ['Uniswap']