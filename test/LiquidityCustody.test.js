const { expect } = require("chai");
const { ethers, network } = require("hardhat");

// References: Uniswap local environment (mainnet fork) guidance
// https://docs.uniswap.org/contracts/v3/guides/local-environment

describe("MOG Liquidity Custody (Local, mocked V2)", function () {
  it("mints LP to EOA via swapBack and allows EOA to remove liquidity", async function () {
    const [deployer, a1, a2] = await ethers.getSigners();

    // Deploy mock factory, WETH, and mock router
    const Factory = await ethers.getContractFactory("MockV2Factory");
    const factory = await Factory.deploy();
    const WETH9 = await ethers.getContractFactory("WETH9");
    const weth = await WETH9.deploy();
    const Router = await ethers.getContractFactory("MockV2Router");
    const router = await Router.deploy(factory, await weth.getAddress());

    // Deploy token but override router/pair expectations by setting storage via cheat (not available) -> instead, we will swap router address by deploying a custom MOG or by impersonation
    // Since MOG hardcodes router in constructor, we simulate by deploying a modified instance via same bytecode: acceptable here is to rely on MockMOG-like behavior. For coverage, we keep original MOG but interactions hit our mock router at that address via `hardhat_setCode`.
    // Point the Uniswap V2 router address to our mock router using hardhat_setCode
    const v2RouterAddr = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
    const mockRouterCode = await ethers.provider.getCode(await router.getAddress());
    await network.provider.send("hardhat_setCode", [v2RouterAddr, mockRouterCode]);

    // Now deploy MOG which will read the v2 router address and interact with our mocked code
    const MOG = await ethers.getContractFactory("MOG");
    const mog = await MOG.deploy();

    // Configure small threshold to trigger swapBack quickly
    // Also open trading to apply fees
    await mog.setSwapBackSettings(true, ethers.parseUnits("1000", 18));
    await mog.startTrading();

    // Move tokens to non-exempt a1, then transfer to a2 to accrue fees to contract
    const seed = ethers.parseUnits("100000", 18);
    await mog.transfer(a1.address, seed);

    // Repeated taxed transfers until contract balance reaches threshold
    const targetThreshold = await mog.swapThreshold();
    for (let i = 0; i < 50; i++) {
      await mog.connect(a1).transfer(a2.address, ethers.parseUnits("1000", 18));
      const contractBal = await mog.balanceOf(await mog.getAddress());
      if (contractBal >= targetThreshold) break;
    }

    // Next transfer should trigger swapBack inside _transferFrom
    const lpBefore = 0n;
    await mog.connect(a1).transfer(a2.address, ethers.parseUnits("100", 18));

    const pairAddr = await mog.pair();

    const ERC20_ABI = [
      "function balanceOf(address) view returns (uint256)",
      "function approve(address,uint256) returns (bool)"
    ];
    const lp = new ethers.Contract(pairAddr, ERC20_ABI, deployer);
    const lpBalance = await lp.balanceOf(deployer.address);
    expect(lpBalance).to.be.gt(lpBefore);

    // Remove liquidity from EOA (autoLiquidityReceiver is deployer by default)
    const routerIface = new ethers.Contract(
      v2RouterAddr,
      [
        "function removeLiquidityETH(address token, uint liquidity, uint amountTokenMin, uint amountETHMin, address to, uint deadline) returns (uint amountToken, uint amountETH)"
      ],
      deployer
    );

    // Approve router to spend LP
    await lp.approve(v2RouterAddr, lpBalance);

    const ethBefore = await ethers.provider.getBalance(deployer.address);
    const tokenBefore = await mog.balanceOf(deployer.address);

    // Be generous with mins for test purposes
    const tx = await routerIface.removeLiquidityETH(
      await mog.getAddress(),
      lpBalance / 2n,
      0,
      0,
      deployer.address,
      Math.floor(Date.now() / 1000) + 600
    );
    const receipt = await tx.wait();

    const gasUsed = BigInt(receipt.gasUsed.toString())
    const effectiveGasPriceRaw = receipt.effectiveGasPrice ?? receipt.gasPrice;
    const effectiveGasPrice = BigInt(effectiveGasPriceRaw.toString())
    const gasCost = gasUsed * effectiveGasPrice;

    const ethAfter = await ethers.provider.getBalance(deployer.address);
    const tokenAfter = await mog.balanceOf(deployer.address);

    expect(ethAfter + gasCost).to.be.eq(ethBefore);
    expect(tokenAfter).to.be.gt(tokenBefore);
  });
});


