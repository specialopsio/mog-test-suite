const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying MOG Token...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Deploy the MOG token
  const MOGToken = await ethers.getContractFactory("MOG");
  const mogToken = await MOGToken.deploy();
  
  console.log("MOG Token deployed to:", await mogToken.getAddress());
  console.log("Transaction hash:", mogToken.deploymentTransaction().hash);

  // Wait for deployment to be mined
  await mogToken.waitForDeployment();
  
  // Display deployment info
  console.log("\n=== Deployment Summary ===");
  console.log("Contract Address:", await mogToken.getAddress());
  console.log("Owner:", await mogToken.owner());
  console.log("Total Supply:", ethers.formatUnits(await mogToken.totalSupply(), 18));
  console.log("Name:", await mogToken.name());
  console.log("Symbol:", await mogToken.symbol());
  console.log("Decimals:", await mogToken.decimals());
  console.log("Trading Open:", await mogToken.TradingOpen());
  
  // Display initial limits
  console.log("\n=== Initial Configuration ===");
  console.log("Max TX Amount:", ethers.formatUnits(await mogToken._maxTxAmount(), 18));
  console.log("Max Wallet Amount:", ethers.formatUnits(await mogToken._maxWalletToken(), 18));
  console.log("Total Fee:", await mogToken.totalFee());
  console.log("Swap Enabled:", await mogToken.swapEnabled());
  console.log("Swap Threshold:", ethers.formatUnits(await mogToken.swapThreshold(), 18));

  console.log("\nDeployment completed successfully!");
  
  // If on a public network, remind about verification
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("\nTo verify the contract, run:");
    console.log(`npx hardhat verify --network ${network.name} ${await mogToken.getAddress()}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 