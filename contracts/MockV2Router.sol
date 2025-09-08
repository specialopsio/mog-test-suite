// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "./MockV2Factory.sol";
import "./IERC20.sol";

contract MockV2Router {
    MockV2Factory public immutable factory;
    address public immutable WETH;

    constructor(MockV2Factory _factory, address _weth) {
        factory = _factory;
        WETH = _weth;
    }

    // Note: public state vars expose auto-getters with same signatures

    receive() external payable {}

    function addLiquidityETH(
        address token,
        uint amountTokenDesired,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external payable returns (uint amountToken, uint amountETH, uint liquidity) {
        require(deadline >= block.timestamp, "expired");
        address pair = factory.getPair(token, WETH);
        if (pair == address(0)) {
            pair = factory.createPair(token, WETH);
        }
        IERC20(token).transferFrom(msg.sender, pair, amountTokenDesired);
        amountToken = amountTokenDesired;
        amountETH = msg.value;
        MockV2Pair(pair).mint(to, amountToken + amountETH);
        liquidity = amountToken + amountETH;
    }

    function swapExactTokensForETHSupportingFeeOnTransferTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external {
        require(deadline >= block.timestamp, "expired");
        // Minimal mock: just consume tokens into pair and emit no revert
        address tokenIn = path[0];
        address pair = factory.getPair(tokenIn, WETH);
        if (pair == address(0)) pair = factory.createPair(tokenIn, WETH);
        IERC20(tokenIn).transferFrom(msg.sender, pair, amountIn);
        // send mock ETH proceeds
        (bool ok,) = payable(to).call{value: 1 wei}("");
        ok;
    }
}


