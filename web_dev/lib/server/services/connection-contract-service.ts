import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { ContractFactory, JsonRpcProvider, Wallet, isAddress, type InterfaceAbi } from "ethers";

import { env } from "@/lib/config/env";
import { ApiError } from "@/lib/server/http";
import type { ConnectionRequestSummary, UserSummary } from "@/lib/types";

type ConnectionAgreementArtifact = {
  abi: InterfaceAbi;
  bytecode: string;
};

type ConnectionContractDeploymentInput = {
  requester: UserSummary;
  recipient: UserSummary;
  request: ConnectionRequestSummary;
};

type ConnectionContractDeploymentResult = {
  contractAddress: string;
  network: string;
  generationMode: "MOCK" | "REAL";
  transactionHash?: string | null;
  metadata?: Record<string, unknown> | null;
};

async function loadConnectionAgreementArtifact(): Promise<ConnectionAgreementArtifact> {
  const artifactPath = path.join(
    process.cwd(),
    "artifacts",
    "contracts",
    "ConnectionAgreement.sol",
    "ConnectionAgreement.json",
  );

  try {
    const artifact = await readFile(artifactPath, "utf8");
    return JSON.parse(artifact) as ConnectionAgreementArtifact;
  } catch (error) {
    throw new ApiError(
      500,
      [
        "Missing Hardhat artifact for ConnectionAgreement.",
        "Restore `contracts/ConnectionAgreement.sol` if it was moved, then run `npm run hardhat:compile`.",
        "For local demo setup, you can also set `USE_MOCK_FLARE=true`.",
      ].join(" "),
      error,
    );
  }
}

function normalizePrivateKey(privateKey: string) {
  return privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
}

function buildMockContractAddress(seed: string) {
  return `0x${createHash("sha256").update(seed).digest("hex").slice(0, 40)}`;
}

export async function deployConnectionAgreement(
  input: ConnectionContractDeploymentInput,
): Promise<ConnectionContractDeploymentResult> {
  const network = "flare-coston2";

  if (env.USE_MOCK_FLARE) {
    return {
      contractAddress: buildMockContractAddress(
        `${input.request.id}:${input.requester.walletAddress}:${input.recipient.walletAddress}:${input.request.type}`,
      ),
      network,
      generationMode: "MOCK",
      metadata: {
        mode: "mock",
      },
    };
  }

  if (!input.requester.walletAddress || !input.recipient.walletAddress) {
    throw new ApiError(400, "Both Meshed members need linked wallets before a Flare connection contract can be deployed.");
  }

  if (!isAddress(input.requester.walletAddress) || !isAddress(input.recipient.walletAddress)) {
    throw new ApiError(400, "One of the linked wallet addresses is invalid for Flare deployment.");
  }

  if (!env.FLARE_RPC_URL) {
    throw new ApiError(500, "FLARE_RPC_URL is not configured for live Flare deployment.");
  }

  if (!env.PRIVATE_KEY) {
    throw new ApiError(500, "PRIVATE_KEY is not configured for live Flare deployment.");
  }

  const provider = new JsonRpcProvider(env.FLARE_RPC_URL, env.FLARE_CHAIN_ID);
  const deployer = new Wallet(normalizePrivateKey(env.PRIVATE_KEY), provider);
  const artifact = await loadConnectionAgreementArtifact();
  const factory = new ContractFactory(artifact.abi, artifact.bytecode, deployer);
  const contract = await factory.deploy(
    input.requester.walletAddress,
    input.recipient.walletAddress,
    input.request.type,
    input.request.message ?? "",
  );

  await contract.waitForDeployment();

  return {
    contractAddress: await contract.getAddress(),
    network,
    generationMode: "REAL",
    transactionHash: contract.deploymentTransaction()?.hash ?? null,
    metadata: {
      chainId: env.FLARE_CHAIN_ID,
      deployerAddress: deployer.address,
      requesterWallet: input.requester.walletAddress,
      recipientWallet: input.recipient.walletAddress,
      requestType: input.request.type,
    },
  };
}

export const connectionContractService = {
  deployConnectionAgreement,
};
