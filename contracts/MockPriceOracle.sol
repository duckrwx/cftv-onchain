// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockPriceOracle {
    // Mock ETH/USD price (3000 USD per ETH)
    int256 public constant MOCK_PRICE = 3000e8;

    function getLatestPrice() public pure returns (int256) {
        return MOCK_PRICE;
    }

    function convertUsdToWei(uint256 usdAmount8Decimals) external pure returns (uint256) {
        // 3000 USD = 1 ETH
        // usdAmount8Decimals / 3000 = ETH in 18 decimals
        return (usdAmount8Decimals * 1e18) / uint256(MOCK_PRICE);
    }
}