import { Dictionary } from "lodash";
import { client } from "./db";

let contractRepository: Dictionary<any>;

export function setContracts(contracts: Dictionary<any>) {
    contractRepository = contracts
}

export function getContract(contract: string) {
    return contractRepository[contract].address.toString();
}

export function getContracts() {
    return contractRepository;
}

export async function addContract(contract: string, address: string) {
    var format = require('pg-format');

    var values = [
        [contract, address],
    ];

    await client.query(format(`
      INSERT INTO contracts (contract, address)
        VALUES %L
        ON CONFLICT (contract) DO UPDATE
          SET contract = excluded.contract,
              address = excluded.address;
      `, values))

    contractRepository[contract] = {
        address: address,
        contract: contract
    }
}

