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

    function removeLiquidityETH(
        address token,
        uint liquidity,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external returns (uint amountToken, uint amountETH) {
        require(deadline >= block.timestamp, "expired");
        address pair = factory.getPair(token, WETH);
        require(pair != address(0), "no pair");

        // Pull LP from caller into pair and burn
        MockV2Pair(pair).transferFrom(msg.sender, pair, liquidity);
        MockV2Pair(pair).burn(pair, liquidity);

        // Payout tokens from pair balance
        uint tokenBal = IERC20(token).balanceOf(pair);
        amountToken = tokenBal < liquidity ? tokenBal : liquidity;
        require(amountToken >= amountTokenMin, "token min");
        if (amountToken > 0) {
            MockV2Pair(pair).payout(token, to, amountToken);
        }

        // Payout ETH from router balance (mock behavior)
        uint ethBal = address(this).balance;
        amountETH = ethBal < liquidity ? ethBal : liquidity;
        require(amountETH >= amountETHMin, "eth min");
        if (amountETH > 0) {
            (bool sent,) = payable(to).call{value: amountETH}("");
            require(sent, "eth send");
        }
    }
}


