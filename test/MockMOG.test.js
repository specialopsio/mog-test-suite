const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MockMOG Token - Simple Test Verification", function () {
  let mockMOG;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    
    const MockMOG = await ethers.getContractFactory("MockMOG");
    mockMOG = await MockMOG.deploy();
  });

  describe("Basic Functionality", function () {
    it("Should set the right owner", async function () {
      expect(await mockMOG.owner()).to.equal(owner.address);
    });

    it("Should assign the total supply to the owner", async function () {
      const ownerBalance = await mockMOG.balanceOf(owner.address);
      expect(await mockMOG.totalSupply()).to.equal(ownerBalance);
    });

    it("Should have correct token details", async function () {
      expect(await mockMOG.name()).to.equal("Mog Coin");
      expect(await mockMOG.symbol()).to.equal("Mog");
      expect(await mockMOG.decimals()).to.equal(18);
    });
  });

  describe("Audit Findings Verification", function () {
    it("Should confirm contract renouncement risk", async function () {
      // Verify owner can renounce
      await mockMOG.renounceOwnership();
      expect(await mockMOG.owner()).to.equal(ethers.ZeroAddress);
      
      // Verify no functions work after renouncement
      await expect(
        mockMOG.setParameters(1, 1, 1, 1, 1, 100)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should enforce trading restrictions", async function () {
      // Give addr1 some tokens
      await mockMOG.transfer(addr1.address, ethers.parseUnits("1000", 18));
      
      // Trading should be disabled by default
      expect(await mockMOG.TradingOpen()).to.be.false;
      
      // Non-authorized should not be able to trade
      await expect(
        mockMOG.connect(addr1).transfer(addr2.address, ethers.parseUnits("100", 18))
      ).to.be.revertedWith("Trading not open yet");
      
      // Enable trading
      await mockMOG.startTrading();
      expect(await mockMOG.TradingOpen()).to.be.true;
      
      // Now should work
      await mockMOG.connect(addr1).transfer(addr2.address, ethers.parseUnits("100", 18));
      expect(await mockMOG.balanceOf(addr2.address)).to.be.gt(0);
    });

    it("Should enforce fee limits", async function () {
      // Should prevent fees over 50%
      await expect(
        mockMOG.setParameters(60, 0, 0, 0, 0, 100)
      ).to.be.revertedWith("Fees can not be more than 50%");
      
      // Should allow 49%
      await mockMOG.setParameters(49, 0, 0, 0, 0, 100);
      expect(await mockMOG.totalFee()).to.equal(49);
    });

    it("Should enforce wallet limits", async function () {
      await mockMOG.startTrading();
      const maxWallet = await mockMOG._maxWalletToken();
      
      // Give addr1 enough tokens to test the limit
      await mockMOG.transfer(addr1.address, maxWallet * 2n);
      
      // addr1 (non-authorized) tries to send over limit to addr2
      await expect(
        mockMOG.connect(addr1).transfer(addr2.address, maxWallet + ethers.parseUnits("1", 18))
      ).to.be.revertedWith("Total Holding is currently limited, you can not buy that much.");
    });

    it("Should allow limit removal", async function () {
      const totalSupply = await mockMOG.totalSupply();
      
      await mockMOG.removeLimits();
      
      expect(await mockMOG._maxTxAmount()).to.equal(totalSupply);
      expect(await mockMOG._maxWalletToken()).to.equal(totalSupply);
    });
  });

  describe("Burn Mechanism", function () {
    it("Should reduce total supply through burns", async function () {
      await mockMOG.startTrading();
      const initialSupply = await mockMOG.totalSupply();
      
      // Give tokens and transfer to trigger fees/burn
      await mockMOG.transfer(addr1.address, ethers.parseUnits("10000", 18));
      await mockMOG.connect(addr1).transfer(addr2.address, ethers.parseUnits("1000", 18));
      
      const finalSupply = await mockMOG.totalSupply();
      expect(finalSupply).to.be.lt(initialSupply);
    });
  });
}); 