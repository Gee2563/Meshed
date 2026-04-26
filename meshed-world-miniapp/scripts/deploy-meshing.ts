import hre from "hardhat";

const { ethers } = hre;

async function main() {
  const [deployer] = await ethers.getSigners();
  const oracleAddress = process.env.FLARE_ATTESTATION_ORACLE_ADDRESS || deployer.address;

  const relationshipFactory = await ethers.getContractFactory("RelationshipRegistry");
  const relationshipRegistry = await relationshipFactory.deploy(deployer.address, oracleAddress);
  await relationshipRegistry.waitForDeployment();

  const portfolioFactory = await ethers.getContractFactory("PortfolioRegistry");
  const portfolioRegistry = await portfolioFactory.deploy();
  await portfolioRegistry.waitForDeployment();

  const alertFactory = await ethers.getContractFactory("OpportunityAlert");
  const opportunityAlert = await alertFactory.deploy(
    await relationshipRegistry.getAddress(),
    await portfolioRegistry.getAddress(),
  );
  await opportunityAlert.waitForDeployment();

  console.log("Meshing contracts deployed by:", deployer.address);
  console.log("Attestation oracle:", oracleAddress);
  console.log("RelationshipRegistry:", await relationshipRegistry.getAddress());
  console.log("PortfolioRegistry:", await portfolioRegistry.getAddress());
  console.log("OpportunityAlert:", await opportunityAlert.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
