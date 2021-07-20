import { Dictionary } from "lodash";

let contractRepository: Dictionary<any>;

export function setContracts(contracts: Dictionary<any>) {
    contractRepository = contracts
}

export function getContract(contract: string) {
    return contractRepository[contract].address.toString();
}

