// SPDX-License-Identifier: Unlicense

pragma solidity >=0.6.0 <0.9.0;

interface IStrategy {
    function rebalance() external;

    function shouldRebalance() external view returns (bool);
}
