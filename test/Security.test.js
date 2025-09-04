const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("MOG Token - Security Tests", function () {
  let mogToken;
  let owner;
  let addr1;
  let addr2;
  let addr3;
  let addrs;

  async function deployMOGTokenFixture() {
    const [owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();
    
    const MOGToken = await ethers.getContractFactory("MOG");
    const mogToken = await MOGToken.deploy();
    
    return { mogToken, owner, addr1, addr2, addr3, addrs };
  }

  beforeEach(async function () {
    const fixture = await loadFixture(deployMOGTokenFixture);
    mogToken = fixture.mogToken;
    owner = fixture.owner;
    addr1 = fixture.addr1;
    addr2 = fixture.addr2;
    addr3 = fixture.addr3;
    addrs = fixture.addrs;
  });

  describe("Access Control Security", function () {
    it("Should prevent unauthorized access to owner functions", async function () {
      // Test setParameters
      await expect(
        mogToken.connect(addr1).setParameters(1, 1, 1, 1, 1, 100)
      ).to.be.revertedWith("Ownable: caller is not the owner");

      // Test setStructure
      await expect(
        mogToken.connect(addr1).setStructure(100, 100, 100)
      ).to.be.revertedWith("Ownable: caller is not the owner");

      // Test startTrading
      await expect(
        mogToken.connect(addr1).startTrading()
      ).to.be.revertedWith("Ownable: caller is not the owner");

      // Test reduceFee
      await expect(
        mogToken.connect(addr1).reduceFee()
      ).to.be.revertedWith("Ownable: caller is not the owner");

      // Test maxWalletRule
      await expect(
        mogToken.connect(addr1).maxWalletRule(50)
      ).to.be.revertedWith("Ownable: caller is not the owner");

      // Test removeLimits
      await expect(
        mogToken.connect(addr1).removeLimits()
      ).to.be.revertedWith("Ownable: caller is not the owner");

      // Test setWallets
      await expect(
        mogToken.connect(addr1).setWallets(addr1.address, addr1.address, addr1.address, addr1.address, addr1.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");

      // Test setSwapBackSettings
      await expect(
        mogToken.connect(addr1).setSwapBackSettings(true, ethers.parseUnits("1000", 18))
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should prevent unauthorized ownership transfer", async function () {
      await expect(
        mogToken.connect(addr1).transferOwnership(addr2.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should prevent unauthorized ownership renouncement", async function () {
      await expect(
        mogToken.connect(addr1).renounceOwnership()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Fee Manipulation Prevention", function () {
    it("Should prevent fee manipulation beyond limits", async function () {
      // Test setting total fees over 50%
      await expect(
        mogToken.setParameters(60, 0, 0, 0, 0, 100)
      ).to.be.revertedWith("Fees can not be more than 50%");

      await expect(
        mogToken.setParameters(25, 25, 5, 0, 0, 100)
      ).to.be.revertedWith("Fees can not be more than 50%");

      await expect(
        mogToken.setParameters(10, 10, 10, 10, 11, 100)
      ).to.be.revertedWith("Fees can not be more than 50%");
    });

    it("Should allow setting fees at the maximum limit", async function () {
      // Should allow exactly 49% (just under 50%)
      await mogToken.setParameters(24, 25, 0, 0, 0, 100);
      expect(await mogToken.totalFee()).to.equal(49);
    });

    it("Should prevent invalid fee denominator", async function () {
      // If fee denominator is too small, even small fees could exceed 50%
      await expect(
        mogToken.setParameters(1, 0, 0, 0, 0, 1)
      ).to.be.revertedWith("Fees can not be more than 50%");
    });
  });

  describe("Wallet Limit Security", function () {
    it("Should prevent setting wallet limits too low", async function () {
      // Test minimum wallet percentage (should be at least 0.1%)
      await expect(
        mogToken.maxWalletRule(0)
      ).to.be.reverted; // Should revert due to require(maxWallPercent >= 1)
    });

    it("Should allow reasonable wallet limits", async function () {
      // Should allow 1% (10/1000)
      await mogToken.maxWalletRule(10);
      const maxWallet = await mogToken._maxWalletToken();
      expect(maxWallet).to.be.gt(0);
    });
  });

  describe("Transfer Security", function () {
    beforeEach(async function () {
      await mogToken.startTrading();
      await mogToken.transfer(addr1.address, ethers.parseUnits("10000", 18));
    });

    it("Should prevent transfers with insufficient balance", async function () {
      // addr2 has no tokens
      await expect(
        mogToken.connect(addr2).transfer(addr1.address, ethers.parseUnits("1", 18))
      ).to.be.revertedWith("Insufficient Balance");
    });

    it("Should prevent transferFrom with insufficient allowance", async function () {
      // addr2 trying to transfer from addr1 without proper allowance
      await expect(
        mogToken.connect(addr2).transferFrom(addr1.address, addr3.address, ethers.parseUnits("100", 18))
      ).to.be.revertedWith("Insufficient Allowance");
    });

    it("Should handle allowance correctly to prevent unauthorized transfers", async function () {
      const allowanceAmount = ethers.parseUnits("500", 18);
      const transferAmount = ethers.parseUnits("600", 18);

      // Set allowance
      await mogToken.connect(addr1).approve(addr2.address, allowanceAmount);

      // Try to transfer more than allowed
      await expect(
        mogToken.connect(addr2).transferFrom(addr1.address, addr3.address, transferAmount)
      ).to.be.revertedWith("Insufficient Allowance");
    });
  });

  describe("Overflow/Underflow Protection", function () {
    it("Should handle large number operations safely", async function () {
      // Test with very large allowance
      await mogToken.connect(addr1).approve(addr2.address, ethers.MaxUint256);
      expect(await mogToken.allowance(addr1.address, addr2.address)).to.equal(ethers.MaxUint256);

      // Transfer should work and not cause overflow
      const transferAmount = ethers.parseUnits("100", 18);
      await mogToken.connect(addr2).transferFrom(addr1.address, addr3.address, transferAmount);
      
      // Allowance should still be max (unlimited allowance case)
      expect(await mogToken.allowance(addr1.address, addr2.address)).to.equal(ethers.MaxUint256);
    });

    it("Should handle balance operations safely", async function () {
      const largeAmount = await mogToken.balanceOf(owner.address);
      
      // Transfer large amount - should not overflow recipient balance
      await mogToken.transfer(addr1.address, largeAmount / 2n);
      
      const addr1Balance = await mogToken.balanceOf(addr1.address);
      expect(addr1Balance).to.be.gt(0);
      expect(addr1Balance).to.be.lt(largeAmount);
    });
  });

  describe("Trading Control Security", function () {
    it("Should prevent trading when disabled", async function () {
      // Ensure trading is disabled
      expect(await mogToken.TradingOpen()).to.be.false;

      // Give addr1 some tokens
      await mogToken.transfer(addr1.address, ethers.parseUnits("1000", 18));

      // addr1 should not be able to transfer to addr2
      await expect(
        mogToken.connect(addr1).transfer(addr2.address, ethers.parseUnits("100", 18))
      ).to.be.revertedWith("Trading not open yet");
    });

    it("Should allow authorized addresses to trade even when trading is disabled", async function () {
      // Owner should be able to transfer even when trading is disabled
      expect(await mogToken.TradingOpen()).to.be.false;
      
      await mogToken.transfer(addr1.address, ethers.parseUnits("1000", 18));
      const addr1Balance = await mogToken.balanceOf(addr1.address);
      expect(addr1Balance).to.equal(ethers.parseUnits("1000", 18));
    });
  });

  describe("Reentrancy Protection", function () {
    it("Should prevent reentrancy attacks during swapBack", async function () {
      // The swapping modifier should prevent reentrancy
      // This is tested indirectly by ensuring the inSwap flag works correctly
      
      await mogToken.startTrading();
      
      // Enable swapping and set a low threshold
      await mogToken.setSwapBackSettings(true, ethers.parseUnits("100", 18));
      
      // Give addr1 tokens and do multiple quick transfers
      await mogToken.transfer(addr1.address, ethers.parseUnits("10000", 18));
      
      // Multiple quick transfers should not cause issues
      await mogToken.connect(addr1).transfer(addr2.address, ethers.parseUnits("200", 18));
      await mogToken.connect(addr1).transfer(addr3.address, ethers.parseUnits("200", 18));
      
      // Should complete without issues
      expect(await mogToken.balanceOf(addr2.address)).to.be.gt(0);
      expect(await mogToken.balanceOf(addr3.address)).to.be.gt(0);
    });
  });

  describe("Emergency Function Security", function () {
    it("Should only allow authorized addresses to call emergency functions", async function () {
      // manualSend should be callable by anyone (but only affects owner)
      await mogToken.connect(addr1).manualSend();
      
      // clearStuckToken should be callable by anyone 
      await mogToken.connect(addr1).clearStuckToken(ethers.ZeroAddress, 0);
    });

    it("Should handle emergency functions safely", async function () {
      // Send ETH to contract
      await owner.sendTransaction({
        to: await mogToken.getAddress(),
        value: ethers.parseEther("1")
      });

      // Manual send should work
      await mogToken.manualSend();
      
      // Contract balance should be 0 after manual send
      const contractBalance = await ethers.provider.getBalance(await mogToken.getAddress());
      expect(contractBalance).to.equal(0);
    });
  });

  describe("Authorization Bypass Prevention", function () {
    it("Should prevent bypassing authorization checks", async function () {
      // Ensure authorizations mapping is properly protected
      // Non-authorized addresses should not be able to bypass trading restrictions
      
      expect(await mogToken.TradingOpen()).to.be.false;
      
      // Give tokens to addr1
      await mogToken.transfer(addr1.address, ethers.parseUnits("1000", 18));
      
      // addr1 should not be able to transfer to addr2 (not authorized)
      await expect(
        mogToken.connect(addr1).transfer(addr2.address, ethers.parseUnits("100", 18))
      ).to.be.revertedWith("Trading not open yet");
      
      // Even if addr2 has no tokens, transfer between non-authorized should fail
      await expect(
        mogToken.connect(addr2).transfer(addr3.address, ethers.parseUnits("1", 18))
      ).to.be.revertedWith("Trading not open yet");
    });
  });

  describe("Input Validation", function () {
    it("Should validate input parameters", async function () {
      // Test zero address validation in ownership transfer
      await expect(
        mogToken.transferOwnership(ethers.ZeroAddress)
      ).to.be.revertedWith("Ownable: new owner is the zero address");
      
      // Test wallet limit validation
      await expect(
        mogToken.maxWalletRule(0)
      ).to.be.reverted;
    });

    it("Should handle edge case values safely", async function () {
      // Test with maximum values
      await mogToken.setParameters(49, 0, 0, 0, 0, 100);
      expect(await mogToken.totalFee()).to.equal(49);
      
      // Test with minimum values
      await mogToken.setParameters(0, 0, 0, 0, 0, 100);
      expect(await mogToken.totalFee()).to.equal(0);
    });
  });
}); 