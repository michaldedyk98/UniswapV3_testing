import { keyBy } from "lodash";
import { Client } from "pg";
import { dbConfig } from "../scripts/config/db";
var format = require('pg-format');

export class Db {
  static async updateContracts(values: string[][]) {
    // const client: Client = new Client(dbConfig);

    // await client.connect()

    // await client.query(format(`
    //   INSERT INTO contracts (contract, address)
    //     VALUES %L
    //     ON CONFLICT (contract) DO UPDATE
    //       SET contract = excluded.contract,
    //           address = excluded.address;
    //   `, values))

    // await client.end();
  }

  static async deleteContracts() {
    // const client: Client = new Client(dbConfig);

    // await client.connect()
    // await client.query(`DELETE FROM contracts;`)
    // await client.end()
  }

  static async getContracts() {
    // const client: Client = new Client(dbConfig);

    // await client.connect()
    // const result = await client.query('SELECT * FROM contracts')
    // const resultKeyBy = keyBy(result.rows, 'contract');
    // await client.end()

    const resultKeyBy = {
      nonfungiblePositionManagerAddress: {
        contract: 'nonfungiblePositionManagerAddress',
        address: '0x0165878A594ca255338adfa4d48449f69242Eb8F'
      },
      uniswapV3FactoryAddress: {
        contract: 'uniswapV3FactoryAddress',
        address: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512'
      },
      swapRouterAddress: {
        contract: 'swapRouterAddress',
        address: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9'
      },
      uniswapKeyAddress: {
        contract: 'uniswapKeyAddress',
        address: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0'
      },
      defaultPoolAddress: {
        contract: 'defaultPoolAddress',
        address: '0x440E0D30d5b21719E8dD851313D396C22ec71a52'
      },
      WETH: {
        contract: 'WETH',
        address: '0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6'
      },
      DAI: {
        contract: 'DAI',
        address: '0x8A791620dd6260079BF849Dc5567aDC3F2FdC318'
      },
      LLDEX: {
        contract: 'LLDEX',
        address: '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853'
      },
      alphaVaultAddress0: {
        contract: 'alphaVaultAddress0',
        address: '0x4A679253410272dd5232B3Ff7cF5dbB88f295319'
      },
      alphaVaultPassiveStrategyAddress0: {
        contract: 'alphaVaultPassiveStrategyAddress0',
        address: '0xc5a5C42992dECbae36851359345FE25997F5C42d'
      },
      uniswapBooster: {
        contract: 'uniswapBooster',
        address: '0x4ed7c70F96B99c776995fB64377f0d4aB3B0e1C1'
      },
      limitOrderProtocol: {
        contract: 'limitOrderProtocol',
        address: '0xc3e53F4d16Ae77Db1c982e75a937B9f60FE63690'
      }
    };

    return resultKeyBy;
  }
}