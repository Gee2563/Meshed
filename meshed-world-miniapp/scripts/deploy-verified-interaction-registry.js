const hre = require("hardhat");

const { ethers } = hre;

async function main() {
  const [deployer] = await ethers.getSigners();
  if (!deployer) {
    throw new Error("A funded deployer signer is required to deploy VerifiedInteractionRegistry.");
  }

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer address:", deployer.address);
  console.log("Deployer balance:", `${ethers.formatEther(balance)} ETH`);
  if (balance === 0n) {
    throw new Error(
      `Deployer ${deployer.address} has 0 World Chain Sepolia ETH. Fund this exact address and retry.`,
    );
  }

  const chainId = Number(process.env.WORLD_CHAIN_CHAIN_ID || 4801);
  const explorerTxBaseUrl =
    process.env.WORLD_CHAIN_EXPLORER_TX_BASE_URL || "https://worldchain-sepolia.explorer.alchemy.com/tx/";

  const factory = await ethers.getContractFactory("VerifiedInteractionRegistry");
  const contract = await factory.deploy(deployer.address);
  await contract.waitForDeployment();

  const deploymentTx = contract.deploymentTransaction();
  const contractAddress = await contract.getAddress();

  console.log("VerifiedInteractionRegistry deployed by:", deployer.address);
  console.log("VerifiedInteractionRegistry address:", contractAddress);
  console.log("Chain ID:", chainId);
  console.log("Deployment transaction:", deploymentTx?.hash ?? "unavailable");
  if (deploymentTx?.hash) {
    console.log("Explorer:", `${explorerTxBaseUrl}${deploymentTx.hash}`);
  }
  console.log(
    "Add this to .env.local:",
    `WORLD_CHAIN_VERIFIED_INTERACTION_REGISTRY_ADDRESS=${contractAddress}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
