// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract XXB is ERC20 {
    constructor() ERC20("XXB", "XXB") {
        _mint(msg.sender, 1_000_000 * 1e18); // 先给自己100万
    }

    // 仅保证 ETH -> XXB 时 1:1
    function buy() external payable {
        require(msg.value > 0, "zero ETH");
        _mint(msg.sender, msg.value); // 1 wei ETH = 1 wei XXB
    }

    receive() external payable {
        _mint(msg.sender, msg.value);
    }
}
