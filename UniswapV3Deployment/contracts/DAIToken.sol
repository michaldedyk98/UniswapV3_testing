// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;
import "@openzeppelin/contracts/presets/ERC20PresetMinterPauser.sol";

contract DAIToken is ERC20PresetMinterPauser {
    uint8 private _decimals;

    constructor(uint256 initialSupply, uint8 decimals)
        ERC20PresetMinterPauser("DAI Stable Coin", "DAI")
    {
        _decimals = decimals;
        _mint(msg.sender, initialSupply);
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
}
