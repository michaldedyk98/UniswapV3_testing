import { keyBy } from "lodash";
import { Client } from "pg";
import { dbConfig } from "../scripts/config/db";
var format = require('pg-format');

export class Db {
  static async updateContracts(values: string[][]) {
    const client: Client = new Client(dbConfig);

    await client.connect()

    await client.query(format(`
      INSERT INTO contracts (contract, address)
        VALUES %L
        ON CONFLICT (contract) DO UPDATE
          SET contract = excluded.contract,
              address = excluded.address;
      `, values))

    await client.end();
  }

  static async deleteContracts() {
    const client: Client = new Client(dbConfig);

    await client.connect()
    await client.query(`DELETE FROM contracts;`)
    await client.end()
  }

  static async getContracts() {
    const client: Client = new Client(dbConfig);

    await client.connect()
    const result = await client.query('SELECT * FROM contracts')
    const resultKeyBy = keyBy(result.rows, 'contract');
    await client.end()

    return resultKeyBy;
  }
}