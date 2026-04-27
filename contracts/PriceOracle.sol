// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

contract PriceOracle {
    AggregatorV3Interface public immutable priceFeed;
    
    // Chainlink ETH/USD Sepolia: 0x694AA1769357215DE4FAC081bf1f309aDC325306
    // 主 Rede principal: 0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419

    error InvalidPrice();
    error StalePrice();
    error NegativePrice();

    constructor(address feedAddress) {
        require(feedAddress != address(0), "Invalid feed address");
        priceFeed = AggregatorV3Interface(feedAddress);
    }

    function getLatestPrice() public view returns (int256) {
        (, int256 price, uint256 updatedAt, , ) = priceFeed.latestRoundData();
        
        if (price <= 0) revert NegativePrice();
        
        // Verificar se o preço não está muito desatualizado (1 hora)
        if (block.timestamp - updatedAt > 1 hours) revert StalePrice();
        
        return price;
    }

    function convertUsdToWei(uint256 usdAmount8Decimals) external view returns (uint256) {
        if (usdAmount8Decimals == 0) return 0;
        
        int256 ethUsdPrice = getLatestPrice();
        
        // usdAmount8Decimals = valor em USD com 8 decimais
        // ethUsdPrice = preço do ETH em USD com 8 decimais
        // resultado = valor em Wei (18 decimais)
        // (usd * 1e18) / price = wei
        
        return (usdAmount8Decimals * 1e18) / uint256(ethUsdPrice);
    }
}