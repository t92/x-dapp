// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./token_interface/ERC20.sol";

contract Transform {
    struct TransferInfo {
        address sender;
        address receiver;
        uint256 amount;
        uint64 timestamp;
        bool status;
    }

    event TransferCreated(
        address indexed sender,
        address indexed receiver,
        uint256 amount,
        uint64 timestamp
    );

    function transfer(address token, address receiver, uint256 amount) external payable{
        require(receiver != address(0), "invalid receiver");
        require(amount > 0, "invalid amount");

        if(address(token) == address(0)) {
            require(msg.value == amount, 'invalid eth amount');
            (bool ok, ) = payable(receiver).call{value: amount}("");
            require(ok, "ETH transfer failed");
        } else {
            require(msg.value == 0, "dont send eth for token transfer");
            uint256 balanceBefore = IERC20(token).balanceOf(address(this));
            require(
                IERC20(token).transferFrom(
                    msg.sender,
                    address(this),
                    amount
                ),
                "transfer failed"
            );
            uint256 balanceAfter = IERC20(token).balanceOf(address(this));
            require(balanceAfter >= balanceBefore, "invalid token balance");
            require(
                balanceAfter - balanceBefore == amount,
                "fee-on-transfer token not supported"
            );
            require(IERC20(token).transfer(receiver, amount), 'transfer failed');
        }
        emit TransferCreated(msg.sender, receiver, amount, uint64(block.timestamp));
    }
}
