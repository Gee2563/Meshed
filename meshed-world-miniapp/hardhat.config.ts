import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function normalizeEnvValue(value: string) {
  const trimmed = value.trim();
  if (
    trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'")))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function loadEnvFile(relativePath: string) {
  const envPath = path.join(process.cwd(), relativePath);
  if (!existsSync(envPath)) {
    return;
  }

  const contents = readFileSync(envPath, "utf8");
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const normalizedLine = line.startsWith("export ") ? line.slice("export ".length) : line;
    const separatorIndex = normalizedLine.indexOf("=");
    if (separatorIndex < 0) {
      continue;
    }

    const key = normalizedLine.slice(0, separatorIndex).trim();
    const value = normalizedLine.slice(separatorIndex + 1);

    if (!key || process.env[key] !== undefined) {
      continue;
    }

    process.env[key] = normalizeEnvValue(value);
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

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
    worldchainSepolia: {
      url: process.env.WORLD_CHAIN_RPC_URL || "https://worldchain-sepolia.g.alchemy.com/public",
      chainId: Number(process.env.WORLD_CHAIN_CHAIN_ID || 4801),
      accounts: normalizePrivateKey(process.env.WORLD_CHAIN_PRIVATE_KEY || process.env.PRIVATE_KEY),
    },
  },
};

export default config;
