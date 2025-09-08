// SPDX-License-Identifier: GPL-3.0-only
pragma solidity =0.8.13;

interface IUniswapV1Exchange {
    function balanceOf(address owner) external view returns (uint256);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function removeLiquidity(uint256 amount, uint256 min_eth, uint256 min_tokens, uint256 deadline) external returns (uint256, uint256);
}
