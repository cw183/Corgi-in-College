const hre = require("hardhat");

async function main() {
  console.log("Deploying Voting contract...");

  // get contract factory
  const Voting = await hre.ethers.getContractFactory("Voting");

  // deploy contract (Voting has no constructor parameters)
  const voting = await Voting.deploy();

  // wait for deployment
  await voting.deployed();

  console.log("Voting deployed to:", voting.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error deploying Voting:", error);
    process.exit(1);
  });
