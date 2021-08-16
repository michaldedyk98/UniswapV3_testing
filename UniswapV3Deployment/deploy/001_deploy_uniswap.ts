import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { maxGasLimit } from '../scripts/config/config';
import { ethers } from 'hardhat';
import { Db } from '../utils/Db';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments } = hre;
    const { deploy } = deployments;

    // Remove all contracts from db
    await Db.deleteContracts();

    // await hre.network.provider.request({
    //     method: "hardhat_reset",
    //     params: [],
    // });

    const [keyA] = await ethers.getSigners();

    const resultWETH9 = await deploy('WETH9', {
        from: keyA.address,
        args: [],
        gasLimit: maxGasLimit,
        log: true,
    });

    const resultUniswapV3Factory = await deploy('UniswapV3Factory', {
        from: keyA.address,
        args: [],
        gasLimit: maxGasLimit,
        log: true,
    });

    const resultUniswapKey = await deploy('UniswapKey', {
        from: keyA.address,
        args: [],
        gasLimit: maxGasLimit,
        log: true,
    });

    const resultRouter = await deploy('SwapRouter', {
        from: keyA.address,
        args: [resultWETH9.address, resultUniswapV3Factory.address],
        gasLimit: maxGasLimit,
        log: true,
    });

    const resultNFTDescriptor = await deploy('NFTDescriptor', {
        from: keyA.address,
        args: [],
        gasLimit: maxGasLimit,
        log: true,
    });

    const resultPositionDescriptor = await deploy('NonfungibleTokenPositionDescriptor', {
        from: keyA.address,
        args: [resultWETH9.address],
        gasLimit: maxGasLimit,
        log: true,
        libraries: {
            NFTDescriptor: resultNFTDescriptor.address
        }
    });

    const resultPositionManager = await deploy('NonfungiblePositionManager', {
        from: keyA.address,
        args: [resultUniswapV3Factory.address, resultWETH9.address, resultPositionDescriptor.address],
        gasLimit: maxGasLimit,
        log: true,
    });

    const values = [
        ['nonfungiblePositionManagerAddress', resultPositionManager.address],
        ['uniswapV3FactoryAddress', resultUniswapV3Factory.address],
        ['swapRouterAddress', resultRouter.address],
        ['uniswapKeyAddress', resultUniswapKey.address],
    ];

    await Db.updateContracts(values);
};
export default func;
func.tags = ['Uniswap'];