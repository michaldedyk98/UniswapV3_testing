// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;
import "@openzeppelin/contracts/presets/ERC20PresetMinterPauser.sol";

contract LLDEXToken is ERC20PresetMinterPauser {
    uint8 private _decimals;

    constructor(uint256 initialSupply, uint8 decimals_)
        ERC20PresetMinterPauser("Low Latency DEX Token", "LLDEX")
    {
        _decimals = decimals_;
        _mint(msg.sender, initialSupply);
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
}
