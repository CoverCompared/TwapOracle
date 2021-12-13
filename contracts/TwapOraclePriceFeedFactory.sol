// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.0;

import "./TwapOraclePriceFeed.sol";
import "./interfaces/IUniswapV2Factory.sol";
import "./interfaces/ITwapOraclePriceFeedFactory.sol";

contract TwapOraclePriceFeedFactory is ITwapOraclePriceFeedFactory {
    address public owner;
    address public constant UNISWAP_FACTORY = 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f; // uniswap v2 factory

    mapping(address => address) public override twapOraclePriceFeedList;

    event CreateTwapOraclePriceFeed(address indexed _owner, address indexed _pair, address _twapOraclePriceFeed);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "TwapOraclePriceFeedFactory Forbidden");
        _;
    }

    function newTwapOraclePriceFeed(address _token0, address _token1) external onlyOwner {
        address pair = IUniswapV2Factory(UNISWAP_FACTORY).getPair(_token0, _token1);
        require(pair != address(0), "No pairs");

        TwapOraclePriceFeed _twapOraclePriceFeed = new TwapOraclePriceFeed(UNISWAP_FACTORY, _token0, _token1);

        twapOraclePriceFeedList[pair] = address(_twapOraclePriceFeed);
        emit CreateTwapOraclePriceFeed(msg.sender, pair, address(_twapOraclePriceFeed));
    }

    function getTwapOraclePriceFeed(address _token0, address _token1)
        external
        view
        override
        returns (address twapOraclePriceFeed)
    {
        address pair = IUniswapV2Factory(UNISWAP_FACTORY).getPair(_token0, _token1);
        twapOraclePriceFeed = twapOraclePriceFeedList[pair];
    }
}
