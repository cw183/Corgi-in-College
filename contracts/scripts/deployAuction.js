const hre = require("hardhat");

async function main() {
  console.log("Deploying Auction contract...");

  const Auction = await hre.ethers.getContractFactory("Auction");
  const auction = await Auction.deploy();

  await auction.deployed();

  console.log("Auction deployed to:", auction.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error deploying Auction:", error);
    process.exit(1);
  });
