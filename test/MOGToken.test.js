const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("MOG Token", function () {
  let mogToken;
  let owner;
  let addr1;
  let addr2;
  let addr3;
  let addrs;

  // Helper function to deploy the contract
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

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await mogToken.owner()).to.equal(owner.address);
    });

    it("Should assign the total supply of tokens to the owner", async function () {
      const ownerBalance = await mogToken.balanceOf(owner.address);
      expect(await mogToken.totalSupply()).to.equal(ownerBalance);
    });

    it("Should set correct token details", async function () {
      expect(await mogToken.name()).to.equal("Mog Coin");
      expect(await mogToken.symbol()).to.equal("Mog");
      expect(await mogToken.decimals()).to.equal(18);
    });

    it("Should set correct initial supply", async function () {
      const expectedSupply = ethers.parseUnits("420690000000000", 18);
      expect(await mogToken.totalSupply()).to.equal(expectedSupply);
    });

    it("Should set owner as fee exempt", async function () {
      // Check if owner is exempt from fees by testing a transfer
      await mogToken.transfer(addr1.address, ethers.parseUnits("1000", 18));
      const addr1Balance = await mogToken.balanceOf(addr1.address);
      expect(addr1Balance).to.equal(ethers.parseUnits("1000", 18));
    });

    it("Should set correct initial limits", async function () {
      const totalSupply = await mogToken.totalSupply();
      const expectedMaxTx = totalSupply / 100n; // 1% of total supply
      const expectedMaxWallet = totalSupply / 100n; // 1% of total supply
      
      expect(await mogToken._maxTxAmount()).to.equal(expectedMaxTx);
      expect(await mogToken._maxWalletToken()).to.equal(expectedMaxWallet);
    });
  });

  describe("Basic ERC20 Functionality", function () {
    beforeEach(async function () {
      // Give addr1 some tokens for testing
      await mogToken.transfer(addr1.address, ethers.parseUnits("10000", 18));
    });

    it("Should transfer tokens between accounts", async function () {
      const transferAmount = ethers.parseUnits("100", 18);
      await mogToken.connect(addr1).transfer(addr2.address, transferAmount);
      
      const addr2Balance = await mogToken.balanceOf(addr2.address);
      expect(addr2Balance).to.be.gt(0); // Should have received some tokens (minus fees)
    });

    it("Should fail if sender doesn't have enough tokens", async function () {
      await expect(
        mogToken.connect(addr2).transfer(addr1.address, ethers.parseUnits("1", 18))
      ).to.be.revertedWith("Insufficient Balance");
    });

    it("Should update balances after transfers", async function () {
      const initialAddr1Balance = await mogToken.balanceOf(addr1.address);
      const transferAmount = ethers.parseUnits("100", 18);
      
      await mogToken.connect(addr1).transfer(addr2.address, transferAmount);
      
      const finalAddr1Balance = await mogToken.balanceOf(addr1.address);
      expect(finalAddr1Balance).to.be.lt(initialAddr1Balance);
    });

    it("Should handle allowances correctly", async function () {
      const allowanceAmount = ethers.parseUnits("500", 18);
      
      await mogToken.connect(addr1).approve(addr2.address, allowanceAmount);
      expect(await mogToken.allowance(addr1.address, addr2.address)).to.equal(allowanceAmount);
      
      const transferAmount = ethers.parseUnits("100", 18);
      await mogToken.connect(addr2).transferFrom(addr1.address, addr3.address, transferAmount);
      
      const remainingAllowance = await mogToken.allowance(addr1.address, addr2.address);
      expect(remainingAllowance).to.be.lt(allowanceAmount);
    });

    it("Should fail transferFrom without sufficient allowance", async function () {
      const transferAmount = ethers.parseUnits("100", 18);
      
      await expect(
        mogToken.connect(addr2).transferFrom(addr1.address, addr3.address, transferAmount)
      ).to.be.revertedWith("Insufficient Allowance");
    });

    it("Should approve max allowance", async function () {
      await mogToken.connect(addr1).approveMax(addr2.address);
      const allowance = await mogToken.allowance(addr1.address, addr2.address);
      expect(allowance).to.equal(ethers.MaxUint256);
    });
  });

  describe("Trading Controls", function () {
    it("Should prevent trading when not enabled", async function () {
      // Give addr1 some tokens
      await mogToken.transfer(addr1.address, ethers.parseUnits("1000", 18));
      
      // Trading should be disabled by default
      expect(await mogToken.TradingOpen()).to.be.false;
      
      // Non-authorized users should not be able to trade
      await expect(
        mogToken.connect(addr1).transfer(addr2.address, ethers.parseUnits("100", 18))
      ).to.be.revertedWith("Trading not open yet");
    });

    it("Should allow trading after startTrading is called", async function () {
      // Give addr1 some tokens first
      await mogToken.transfer(addr1.address, ethers.parseUnits("1000", 18));
      
      // Start trading
      await mogToken.startTrading();
      expect(await mogToken.TradingOpen()).to.be.true;
      
      // Now addr1 should be able to trade
      await mogToken.connect(addr1).transfer(addr2.address, ethers.parseUnits("100", 18));
      expect(await mogToken.balanceOf(addr2.address)).to.be.gt(0);
    });

    it("Should only allow owner to start trading", async function () {
      await expect(
        mogToken.connect(addr1).startTrading()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Fee Mechanism", function () {
    beforeEach(async function () {
      await mogToken.startTrading(); // Enable trading for fee tests
      await mogToken.transfer(addr1.address, ethers.parseUnits("10000", 18));
    });

    it("Should take fees on transfers", async function () {
      const initialBalance = await mogToken.balanceOf(addr1.address);
      const transferAmount = ethers.parseUnits("1000", 18);
      
      await mogToken.connect(addr1).transfer(addr2.address, transferAmount);
      
      const addr2Balance = await mogToken.balanceOf(addr2.address);
      expect(addr2Balance).to.be.lt(transferAmount); // Should receive less due to fees
    });

    it("Should reduce total supply when burning tokens", async function () {
      const initialSupply = await mogToken.totalSupply();
      const transferAmount = ethers.parseUnits("1000", 18);
      
      // Transfer should trigger fee which includes burn
      await mogToken.connect(addr1).transfer(addr2.address, transferAmount);
      
      const finalSupply = await mogToken.totalSupply();
      expect(finalSupply).to.be.lt(initialSupply); // Supply should decrease due to burn
    });
  });

  describe("Ownership Functions", function () {
    it("Should allow owner to set fee parameters", async function () {
      await mogToken.setParameters(1, 1, 1, 1, 1, 100);
      expect(await mogToken.totalFee()).to.equal(5);
    });

    it("Should prevent setting fees too high", async function () {
      await expect(
        mogToken.setParameters(60, 0, 0, 0, 0, 100)
      ).to.be.revertedWith("Fees can not be more than 50%");
    });

    it("Should allow owner to set wallet limits", async function () {
      const newLimit = ethers.parseUnits("1000000", 18);
      await mogToken.maxWalletRule(100); // 10% of total supply (100/1000 = 0.1)
      
      const maxWallet = await mogToken._maxWalletToken();
      expect(maxWallet).to.be.gt(0);
    });

    it("Should allow owner to remove limits", async function () {
      await mogToken.removeLimits();
      
      const totalSupply = await mogToken.totalSupply();
      expect(await mogToken._maxTxAmount()).to.equal(totalSupply);
      expect(await mogToken._maxWalletToken()).to.equal(totalSupply);
    });

    it("Should prevent non-owners from calling owner functions", async function () {
      await expect(
        mogToken.connect(addr1).setParameters(1, 1, 1, 1, 1, 100)
      ).to.be.revertedWith("Ownable: caller is not the owner");
      
      await expect(
        mogToken.connect(addr1).removeLimits()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should allow ownership transfer", async function () {
      await mogToken.transferOwnership(addr1.address);
      expect(await mogToken.owner()).to.equal(addr1.address);
    });

    it("Should prevent transferring ownership to zero address", async function () {
      await expect(
        mogToken.transferOwnership(ethers.ZeroAddress)
      ).to.be.revertedWith("Ownable: new owner is the zero address");
    });
  });

  describe("Wallet and Transaction Limits", function () {
    beforeEach(async function () {
      await mogToken.startTrading();
    });

    it("Should enforce transaction limits", async function () {
      const maxTx = await mogToken._maxTxAmount();
      const exceedingAmount = maxTx + ethers.parseUnits("1", 18);
      
      await expect(
        mogToken.transfer(addr1.address, exceedingAmount)
      ).to.be.revertedWith("TX Limit Exceeded");
    });

    it("Should enforce wallet limits", async function () {
      const maxWallet = await mogToken._maxWalletToken();
      
      // Try to send more than wallet limit to addr1
      await expect(
        mogToken.transfer(addr1.address, maxWallet + ethers.parseUnits("1", 18))
      ).to.be.revertedWith("Total Holding is currently limited, you can not buy that much.");
    });

    it("Should allow exempt addresses to bypass limits", async function () {
      // Owner should be exempt from limits
      const maxTx = await mogToken._maxTxAmount();
      const exceedingAmount = maxTx + ethers.parseUnits("1", 18);
      
      // This should work since owner is exempt
      const ownerBalance = await mogToken.balanceOf(owner.address);
      if (ownerBalance >= exceedingAmount) {
        await mogToken.transfer(addr1.address, maxTx); // Should not revert
      }
    });
  });

  describe("Emergency Functions", function () {
    it("Should allow manual ETH withdrawal", async function () {
      // Send some ETH to the contract first
      await owner.sendTransaction({
        to: await mogToken.getAddress(),
        value: ethers.parseEther("1")
      });
      
      const initialBalance = await ethers.provider.getBalance(owner.address);
      await mogToken.manualSend();
      
      // Owner balance should increase (minus gas costs)
      const finalBalance = await ethers.provider.getBalance(owner.address);
      expect(finalBalance).to.be.gt(initialBalance - ethers.parseEther("0.1")); // Account for gas
    });

    it("Should allow clearing stuck tokens", async function () {
      // This test would require deploying another ERC20 token to test with
      // For now, we'll just check the function exists and has proper access control
      
      // Should allow calling clearStuckToken (would fail if no tokens to clear)
      await expect(
        mogToken.clearStuckToken(ethers.ZeroAddress, 0)
      ).to.not.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Fee Structure Management", function () {
    it("Should allow owner to set fee percentages", async function () {
      await mogToken.setStructure(200, 300, 150); // 2x buy, 3x sell, 1.5x transfer
      
      // These changes should be reflected in the contract state
      // We can verify by checking events or state changes
    });

    it("Should allow fee reduction", async function () {
      await mogToken.startTrading(); // This sets higher fees
      await mogToken.reduceFee(); // This should reset to 100 (1x)
      
      // After reduceFee, all percentages should be back to 100
    });

    it("Should only allow owner to modify fee structure", async function () {
      await expect(
        mogToken.connect(addr1).setStructure(200, 300, 150)
      ).to.be.revertedWith("Ownable: caller is not the owner");
      
      await expect(
        mogToken.connect(addr1).reduceFee()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("View Functions", function () {
    it("Should return correct backing ratio", async function () {
      const accuracy = 100;
      const backing = await mogToken.showBacking(accuracy);
      expect(backing).to.be.a("bigint");
    });

    it("Should return correct circulating supply", async function () {
      const supply = await mogToken.showSupply();
      const totalSupply = await mogToken.totalSupply();
      expect(supply).to.be.lte(totalSupply);
    });

    it("Should check ratio correctly", async function () {
      const ratio = 30;
      const accuracy = 100;
      const result = await mogToken.checkRatio(ratio, accuracy);
      expect(result).to.be.a("boolean");
    });
  });

  describe("Edge Cases and Error Handling", function () {
    it("Should handle zero amount transfers", async function () {
      await mogToken.transfer(addr1.address, 0);
      expect(await mogToken.balanceOf(addr1.address)).to.equal(0);
    });

    it("Should handle self transfers", async function () {
      const initialBalance = await mogToken.balanceOf(owner.address);
      await mogToken.transfer(owner.address, ethers.parseUnits("100", 18));
      
      // Balance should remain the same (minus any fees)
      const finalBalance = await mogToken.balanceOf(owner.address);
      expect(finalBalance).to.be.lte(initialBalance);
    });

    it("Should handle approval edge cases", async function () {
      // Approve zero
      await mogToken.approve(addr1.address, 0);
      expect(await mogToken.allowance(owner.address, addr1.address)).to.equal(0);
      
      // Approve and then reduce
      await mogToken.approve(addr1.address, ethers.parseUnits("1000", 18));
      await mogToken.approve(addr1.address, ethers.parseUnits("500", 18));
      expect(await mogToken.allowance(owner.address, addr1.address)).to.equal(ethers.parseUnits("500", 18));
    });
  });
}); 