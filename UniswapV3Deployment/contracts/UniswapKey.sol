// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

contract UniswapKey {
    constructor() {}

    function compute(
        address owner,
        int24 tickLower,
        int24 tickUpper
    ) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(owner, tickLower, tickUpper));
    }
}
