// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * This smart contract
 */

contract MockUSDT is Ownable, ERC20 {
    uint256 INITIAL_SUPPLY = 10000000000 * 10**6;

    mapping(address => uint256) private _faucets;
    uint256 public constant faucetLimit = 500000 * 10**6;

    constructor() public ERC20("USDT", "USDT") {
        _mint(msg.sender, INITIAL_SUPPLY);
    }

    function decimals() public view override returns (uint8) {
        return 6;
    }

    function faucetToken(uint256 _amount) external {
        require(msg.sender == owner() || _faucets[msg.sender] + _amount <= faucetLimit, "Uno: Faucet amount limitation");
        _mint(msg.sender, _amount);
    }
}
