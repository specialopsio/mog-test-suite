const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("MOG Token - Gas Optimization Tests", function () {
  let mogToken;
  let owner;
  let addr1;
  let addr2;
  let addr3;

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
    
    // Start trading to enable all features
    await mogToken.startTrading();
    await mogToken.transfer(addr1.address, ethers.parseUnits("100000", 18));
  });

  describe("Transfer Gas Efficiency", function () {
    it("Should use optimal gas for basic transfers", async function () {
      const transferAmount = ethers.parseUnits("1000", 18);
      
      const tx = await mogToken.connect(addr1).transfer(addr2.address, transferAmount);
      const receipt = await tx.wait();
      
      console.log(`Basic transfer gas used: ${receipt.gasUsed}`);
      
      // Transfer should use less than 150k gas (reasonable for tokens with fees)
      expect(receipt.gasUsed).to.be.lt(150000);
    });

    it("Should use optimal gas for transferFrom", async function () {
      const transferAmount = ethers.parseUnits("1000", 18);
      const allowanceAmount = ethers.parseUnits("5000", 18);
      
      // Set up allowance
      await mogToken.connect(addr1).approve(addr2.address, allowanceAmount);
      
      const tx = await mogToken.connect(addr2).transferFrom(addr1.address, addr3.address, transferAmount);
      const receipt = await tx.wait();
      
      console.log(`TransferFrom gas used: ${receipt.gasUsed}`);
      
      // TransferFrom should use less than 180k gas
      expect(receipt.gasUsed).to.be.lt(180000);
    });

    it("Should use optimal gas for exempt addresses", async function () {
      // Owner transfers should be more gas efficient (no fees)
      const transferAmount = ethers.parseUnits("1000", 18);
      
      const tx = await mogToken.transfer(addr1.address, transferAmount);
      const receipt = await tx.wait();
      
      console.log(`Exempt transfer gas used: ${receipt.gasUsed}`);
      
      // Exempt transfers should be more efficient
      expect(receipt.gasUsed).to.be.lt(100000);
    });
  });

  describe("Approval Gas Efficiency", function () {
    it("Should use optimal gas for approve", async function () {
      const approvalAmount = ethers.parseUnits("1000000", 18);
      
      const tx = await mogToken.connect(addr1).approve(addr2.address, approvalAmount);
      const receipt = await tx.wait();
      
      console.log(`Approve gas used: ${receipt.gasUsed}`);
      
      // Approve should use less than 50k gas
      expect(receipt.gasUsed).to.be.lt(50000);
    });

    it("Should use optimal gas for approveMax", async function () {
      const tx = await mogToken.connect(addr1).approveMax(addr2.address);
      const receipt = await tx.wait();
      
      console.log(`ApproveMax gas used: ${receipt.gasUsed}`);
      
      // ApproveMax should be efficient
      expect(receipt.gasUsed).to.be.lt(60000);
    });
  });

  describe("Owner Function Gas Efficiency", function () {
    it("Should use optimal gas for setParameters", async function () {
      const tx = await mogToken.setParameters(1, 1, 1, 1, 1, 100);
      const receipt = await tx.wait();
      
      console.log(`SetParameters gas used: ${receipt.gasUsed}`);
      
      // Should be reasonably efficient for admin function
      expect(receipt.gasUsed).to.be.lt(100000);
    });

    it("Should use optimal gas for setStructure", async function () {
      const tx = await mogToken.setStructure(150, 200, 125);
      const receipt = await tx.wait();
      
      console.log(`SetStructure gas used: ${receipt.gasUsed}`);
      
      // Should be efficient
      expect(receipt.gasUsed).to.be.lt(50000);
    });

    it("Should use optimal gas for maxWalletRule", async function () {
      const tx = await mogToken.maxWalletRule(50); // 5%
      const receipt = await tx.wait();
      
      console.log(`MaxWalletRule gas used: ${receipt.gasUsed}`);
      
      // Should be efficient
      expect(receipt.gasUsed).to.be.lt(50000);
    });

    it("Should use optimal gas for removeLimits", async function () {
      const tx = await mogToken.removeLimits();
      const receipt = await tx.wait();
      
      console.log(`RemoveLimits gas used: ${receipt.gasUsed}`);
      
      // Should be efficient
      expect(receipt.gasUsed).to.be.lt(50000);
    });
  });

  describe("View Function Gas Efficiency", function () {
    it("Should use minimal gas for view functions", async function () {
      // View functions should use minimal gas
      const name = await mogToken.name();
      const symbol = await mogToken.symbol();
      const decimals = await mogToken.decimals();
      const totalSupply = await mogToken.totalSupply();
      const balance = await mogToken.balanceOf(addr1.address);
      const allowance = await mogToken.allowance(addr1.address, addr2.address);
      
      // These are view functions, so they don't actually consume gas in practice
      expect(name).to.equal("Mog Coin");
      expect(symbol).to.equal("Mog");
      expect(decimals).to.equal(18);
      expect(totalSupply).to.be.gt(0);
      expect(balance).to.be.gt(0);
      expect(allowance).to.be.gte(0);
    });

    it("Should efficiently calculate showBacking", async function () {
      const backing = await mogToken.showBacking(100);
      expect(backing).to.be.a("bigint");
    });

    it("Should efficiently calculate showSupply", async function () {
      const supply = await mogToken.showSupply();
      expect(supply).to.be.gt(0);
    });

    it("Should efficiently check ratio", async function () {
      const result = await mogToken.checkRatio(30, 100);
      expect(result).to.be.a("boolean");
    });
  });

  describe("Fee Calculation Gas Efficiency", function () {
    it("Should efficiently calculate fees during transfers", async function () {
      // Test multiple transfers to measure fee calculation efficiency
      const transferAmount = ethers.parseUnits("100", 18);
      
      const tx1 = await mogToken.connect(addr1).transfer(addr2.address, transferAmount);
      const receipt1 = await tx1.wait();
      
      const tx2 = await mogToken.connect(addr1).transfer(addr3.address, transferAmount);
      const receipt2 = await tx2.wait();
      
      console.log(`Fee transfer 1 gas: ${receipt1.gasUsed}`);
      console.log(`Fee transfer 2 gas: ${receipt2.gasUsed}`);
      
      // Both transfers should use similar gas (consistent fee calculation)
      const gasDifference = Math.abs(Number(receipt1.gasUsed - receipt2.gasUsed));
      expect(gasDifference).to.be.lt(5000); // Should be very consistent
    });

    it("Should handle burn mechanism efficiently", async function () {
      // Transfers that trigger burn should still be efficient
      const transferAmount = ethers.parseUnits("1000", 18);
      
      const initialSupply = await mogToken.totalSupply();
      
      const tx = await mogToken.connect(addr1).transfer(addr2.address, transferAmount);
      const receipt = await tx.wait();
      
      const finalSupply = await mogToken.totalSupply();
      
      console.log(`Transfer with burn gas used: ${receipt.gasUsed}`);
      
      // Should burn some tokens
      expect(finalSupply).to.be.lt(initialSupply);
      
      // Should still be efficient
      expect(receipt.gasUsed).to.be.lt(200000);
    });
  });

  describe("Batch Operations Gas Efficiency", function () {
    it("Should handle multiple approvals efficiently", async function () {
      const approvalAmount = ethers.parseUnits("1000", 18);
      
      // Multiple approvals
      const tx1 = await mogToken.connect(addr1).approve(addr2.address, approvalAmount);
      const tx2 = await mogToken.connect(addr1).approve(addr3.address, approvalAmount);
      const tx3 = await mogToken.connect(addr1).approve(owner.address, approvalAmount);
      
      const receipt1 = await tx1.wait();
      const receipt2 = await tx2.wait();
      const receipt3 = await tx3.wait();
      
      console.log(`Approval 1 gas: ${receipt1.gasUsed}`);
      console.log(`Approval 2 gas: ${receipt2.gasUsed}`);
      console.log(`Approval 3 gas: ${receipt3.gasUsed}`);
      
      // All approvals should use similar gas
      expect(receipt1.gasUsed).to.be.lt(50000);
      expect(receipt2.gasUsed).to.be.lt(50000);
      expect(receipt3.gasUsed).to.be.lt(50000);
    });

    it("Should handle multiple transfers efficiently", async function () {
      const transferAmount = ethers.parseUnits("100", 18);
      
      // Multiple transfers
      const transactions = [];
      for (let i = 0; i < 5; i++) {
        const tx = await mogToken.connect(addr1).transfer(addr2.address, transferAmount);
        const receipt = await tx.wait();
        transactions.push(receipt);
      }
      
      // All transfers should use similar gas
      for (let i = 0; i < transactions.length; i++) {
        console.log(`Transfer ${i + 1} gas: ${transactions[i].gasUsed}`);
        expect(transactions[i].gasUsed).to.be.lt(200000);
      }
      
      // Gas usage should be consistent
      const gasUsages = transactions.map(tx => Number(tx.gasUsed));
      const avgGas = gasUsages.reduce((a, b) => a + b) / gasUsages.length;
      
      gasUsages.forEach(gas => {
        expect(Math.abs(gas - avgGas)).to.be.lt(10000); // Within 10k gas of average
      });
    });
  });

  describe("Emergency Function Gas Efficiency", function () {
    it("Should use optimal gas for manualSend", async function () {
      // Send some ETH to contract first
      await owner.sendTransaction({
        to: await mogToken.getAddress(),
        value: ethers.parseEther("0.1")
      });
      
      const tx = await mogToken.manualSend();
      const receipt = await tx.wait();
      
      console.log(`ManualSend gas used: ${receipt.gasUsed}`);
      
      // Should be efficient
      expect(receipt.gasUsed).to.be.lt(50000);
    });

    it("Should use optimal gas for clearStuckToken", async function () {
      const tx = await mogToken.clearStuckToken(ethers.ZeroAddress, 0);
      const receipt = await tx.wait();
      
      console.log(`ClearStuckToken gas used: ${receipt.gasUsed}`);
      
      // Should be efficient even if it fails
      expect(receipt.gasUsed).to.be.lt(100000);
    });
  });

  describe("Gas Regression Tests", function () {
    it("Should maintain gas efficiency over time", async function () {
      // This test ensures gas usage doesn't regress
      const baselineGas = {
        transfer: 150000,
        transferFrom: 180000,
        approve: 50000,
        setParameters: 100000
      };
      
      // Test transfer
      const transferTx = await mogToken.connect(addr1).transfer(addr2.address, ethers.parseUnits("100", 18));
      const transferReceipt = await transferTx.wait();
      expect(transferReceipt.gasUsed).to.be.lte(baselineGas.transfer);
      
      // Test approve
      const approveTx = await mogToken.connect(addr1).approve(addr2.address, ethers.parseUnits("1000", 18));
      const approveReceipt = await approveTx.wait();
      expect(approveReceipt.gasUsed).to.be.lte(baselineGas.approve);
      
      // Test transferFrom
      const transferFromTx = await mogToken.connect(addr2).transferFrom(addr1.address, addr3.address, ethers.parseUnits("50", 18));
      const transferFromReceipt = await transferFromTx.wait();
      expect(transferFromReceipt.gasUsed).to.be.lte(baselineGas.transferFrom);
      
      // Test admin function
      const setParamsTx = await mogToken.setParameters(2, 1, 1, 1, 1, 100);
      const setParamsReceipt = await setParamsTx.wait();
      expect(setParamsReceipt.gasUsed).to.be.lte(baselineGas.setParameters);
    });
  });
}); 