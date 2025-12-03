const hre = require("hardhat");

async function main() {
  console.log("Deploying Voting contract...");

  // 取得合約工廠
  const Voting = await hre.ethers.getContractFactory("Voting");

  // 部署合約（Voting 沒有 constructor 參數）
  const voting = await Voting.deploy();

  // 等待部署完成
  await voting.deployed();

  console.log("Voting deployed to:", voting.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error deploying Voting:", error);
    process.exit(1);
  });
