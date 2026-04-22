// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;


import "./token_interface/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


contract Goods is Ownable{
    IERC20 public immutable xxb;

    constructor(address xxbToken) Ownable(msg.sender){
        require(xxbToken != address(0), "zero token");
        xxb = IERC20(xxbToken);
    }
    
    struct Product {
        uint256 id;
        string name;
        uint64 stock;
        uint256 price;
        bool active;
    }

    mapping(uint256 => Product) public products;
    uint256 public nextProductId = 1;

    event ProductAdded(uint256 id, string name, uint256 price);
    event ProductBought(
        address indexed buyer,
        uint256 indexed id,
        uint64 number,
        uint256 totalCost
    );

    function addProduce(string calldata name, uint256 price) external onlyOwner returns (uint256 productId){
        require(bytes(name).length > 0, "empty name");
        require(price > 0, "price=0");

        productId = nextProductId++;
        products[productId] = Product({
            id: productId,
            name: name,
            stock: 10000,
            price: price, // 6 decimals
            active: true    
        });

        emit ProductAdded(productId, name, price);
        return productId;
    }
    // 是否是部署合约的人
    function isOwner() external view returns (bool) {
        return msg.sender == owner();
    }

    function buy(uint256 id) external returns (bool success){
        Product storage p = products[id];
        require(p.active, "inactive");
        require(p.stock >= 1, "Insufficient quantity of goods");

        uint256 totalCost = p.price * uint256(1);
        require(
            xxb.transferFrom(msg.sender, owner(), totalCost),
            "XXB transfer failed"
        );

        p.stock -= 1;
        emit ProductBought(msg.sender, id, 1, totalCost);
        return true;
    }
}

