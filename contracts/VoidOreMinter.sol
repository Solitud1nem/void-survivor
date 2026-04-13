// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract VoidOreMinter {

    address public immutable owner;

    // 0.0001 ETH / 1000 ore = 100_000_000_000 wei per 1 ore (100 gwei)
    uint256 public pricePerOre = 100_000_000_000;

    uint256 public constant MIN_ORE = 100;
    uint256 public constant MAX_ORE = 100_000;

    bool public paused;

    event OrePurchased(address indexed buyer, uint256 amount, uint256 ethPaid, uint256 timestamp);
    event PriceUpdated(uint256 oldPrice, uint256 newPrice);
    event Withdrawn(address to, uint256 amount);

    error NotOwner();
    error ContractPaused();
    error AmountOutOfRange();
    error InsufficientPayment(uint256 required, uint256 sent);
    error WithdrawFailed();
    error ZeroBalance();

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }

    function buyOre(uint256 amount) external payable whenNotPaused {
        if (amount < MIN_ORE || amount > MAX_ORE) revert AmountOutOfRange();
        uint256 required = amount * pricePerOre;
        if (msg.value < required) revert InsufficientPayment(required, msg.value);
        emit OrePurchased(msg.sender, amount, msg.value, block.timestamp);
        uint256 excess = msg.value - required;
        if (excess > 0) {
            (bool ok,) = msg.sender.call{value: excess}("");
            (ok);
        }
    }

    function priceFor(uint256 amount) external view returns (uint256) {
        return amount * pricePerOre;
    }

    function balance() external view returns (uint256) {
        return address(this).balance;
    }

    function withdraw() external onlyOwner {
        uint256 bal = address(this).balance;
        if (bal == 0) revert ZeroBalance();
        (bool ok,) = owner.call{value: bal}("");
        if (!ok) revert WithdrawFailed();
        emit Withdrawn(owner, bal);
    }

    function setPrice(uint256 newPrice) external onlyOwner {
        require(newPrice > 0, "Price must be > 0");
        emit PriceUpdated(pricePerOre, newPrice);
        pricePerOre = newPrice;
    }

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }

    receive() external payable {}
}
