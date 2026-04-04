import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

function normalizePrivateKey(value?: string) {
  if (!value?.trim()) {
    return [];
  }

  const trimmed = value.trim();
  return [trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`];
}

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    hardhat: {},
    coston2: {
      url: process.env.FLARE_RPC_URL || "",
      chainId: Number(process.env.FLARE_CHAIN_ID || 114),
      accounts: normalizePrivateKey(process.env.PRIVATE_KEY),
    },
  },
};

export default config;
