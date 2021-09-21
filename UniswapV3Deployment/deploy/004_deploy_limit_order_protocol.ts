import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { maxGasLimit, tokenDefaultBalance } from '../scripts/config/config';
import { ethers } from 'hardhat';
import { Db } from '../utils/Db';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments } = hre;
    const { deploy } = deployments;

    const contracts = await Db.getContracts();
    const [keyA, keyB] = await ethers.getSigners();

    const WETHAddress = contracts["WETH"].address
    const DAIAddress = contracts["DAI"].address

    const limitOrderProtocol = await deploy('LimitOrderProtocol', {
        from: keyA.address,
        args: [],
        gasLimit: maxGasLimit,
        log: true,
    });

    const WETHToken = await ethers.getContractAt('WETHToken', WETHAddress);
    const DAIToken = await ethers.getContractAt('DAIToken', DAIAddress);

    await WETHToken.connect(keyA).approve(limitOrderProtocol.address, tokenDefaultBalance);
    await DAIToken.connect(keyA).approve(limitOrderProtocol.address, tokenDefaultBalance);

    await WETHToken.connect(keyB).approve(limitOrderProtocol.address, tokenDefaultBalance);
    await DAIToken.connect(keyB).approve(limitOrderProtocol.address, tokenDefaultBalance);

    var values = [
        ['limitOrderProtocol', limitOrderProtocol.address],
    ];

    await Db.updateContracts(values);
    await Db.getContracts();
};
export default func;
func.tags = ['LimitOrderProtocol'];
func.dependencies = ['Core']