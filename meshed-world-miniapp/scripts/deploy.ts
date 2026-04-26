import hre from "hardhat";

const { ethers } = hre;

async function main() {
  const [deployer, participantB] = await ethers.getSigners();
  if (!participantB) {
    throw new Error("A second signer is required to deploy ConnectionAgreement for smoke testing.");
  }
  const factory = await ethers.getContractFactory("ConnectionAgreement");
  const contract = await factory.deploy(
    deployer.address,
    participantB.address,
    "demo",
    "Meshed connection deployment smoke test",
  );
  await contract.waitForDeployment();

  console.log("ConnectionAgreement deployed by:", deployer.address);
  console.log("ConnectionAgreement address:", await contract.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
