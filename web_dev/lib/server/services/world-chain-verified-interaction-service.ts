import {
  Contract,
  JsonRpcProvider,
  Wallet,
  ZeroHash,
  isAddress,
  keccak256,
  toUtf8Bytes,
} from "ethers";

import { env } from "@/lib/config/env";
import { verifiedInteractionRegistryAbi } from "@/lib/server/contracts/verified-interaction-registry-abi";
import { ApiError } from "@/lib/server/http";
import type { RewardStatus, VerifiedInteractionType } from "@/lib/types";

type WorldChainSubmissionInput = {
  interactionId: string;
  interactionType: VerifiedInteractionType;
  authoritativeActorId: string;
  actorWorldNullifier?: string | null;
  targetUserId?: string | null;
  targetWorldNullifier?: string | null;
  companyId?: string | null;
  painPointTag?: string | null;
  matchScore?: number | null;
  verified: boolean;
  rewardStatus: RewardStatus;
  metadata?: Record<string, unknown> | null;
};

export type WorldChainSubmissionResult = {
  network: string;
  chainId: number;
  contractAddress: string;
  transactionHash: string;
  blockNumber: number;
  explorerUrl: string;
  recorderAddress: string;
  interactionIdHash: string;
  actorHash: string;
  targetHash: string | null;
  companyHash: string | null;
  painPointHash: string | null;
  metadataHash: string;
  submittedAt: string;
};

type RuntimeConfig = {
  rpcUrl: string;
  privateKey: string | null;
  chainId: number;
  contractAddress: string | null;
  explorerTxBaseUrl: string;
};

const NETWORK_NAME = "worldchain-sepolia";

const interactionTypeIndex: Record<VerifiedInteractionType, number> = {
  MATCH_SUGGESTED: 0,
  INTRO_REQUESTED: 1,
  INTRO_ACCEPTED: 2,
  COLLABORATION_STARTED: 3,
  COLLABORATION_COMPLETED: 4,
  REWARD_EARNED: 5,
  REWARD_DISTRIBUTED: 6,
};

const rewardStatusIndex: Record<RewardStatus, number> = {
  NOT_REWARDABLE: 0,
  REWARDABLE: 1,
  EARNED: 2,
  DISTRIBUTED: 3,
};

function normalizePrivateKey(privateKey: string) {
  return privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
}

function normalizeString(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function stableSortJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableSortJson);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nestedValue]) => [key, stableSortJson(nestedValue)]),
    );
  }

  return value;
}

function hashUtf8(value: string) {
  return keccak256(toUtf8Bytes(value));
}

function hashNullable(value?: string | null) {
  const normalized = normalizeString(value);
  return normalized ? hashUtf8(normalized) : ZeroHash;
}

function denormalizeZeroHash(value: string) {
  return value === ZeroHash ? null : value;
}

function normalizeMatchScore(value?: number | null) {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return 0;
  }

  const scaled = Math.round(value * 100);
  return Math.max(0, Math.min(scaled, 4_294_967_295));
}

function getRuntimeConfig(): RuntimeConfig {
  return {
    rpcUrl: env.WORLD_CHAIN_RPC_URL || "https://worldchain-sepolia.g.alchemy.com/public",
    privateKey: normalizeString(env.WORLD_CHAIN_PRIVATE_KEY) ?? normalizeString(env.PRIVATE_KEY),
    chainId: env.WORLD_CHAIN_CHAIN_ID,
    contractAddress: normalizeString(env.WORLD_CHAIN_VERIFIED_INTERACTION_REGISTRY_ADDRESS),
    explorerTxBaseUrl: env.WORLD_CHAIN_EXPLORER_TX_BASE_URL,
  };
}

export const worldChainVerifiedInteractionService = {
  isReady() {
    const config = getRuntimeConfig();
    return Boolean(config.privateKey && config.contractAddress);
  },

  async submitInteraction(input: WorldChainSubmissionInput): Promise<WorldChainSubmissionResult> {
    const config = getRuntimeConfig();

    if (!config.contractAddress) {
      throw new ApiError(
        503,
        "WORLD_CHAIN_VERIFIED_INTERACTION_REGISTRY_ADDRESS is not configured for World Chain writes.",
      );
    }

    if (!isAddress(config.contractAddress)) {
      throw new ApiError(500, "WORLD_CHAIN_VERIFIED_INTERACTION_REGISTRY_ADDRESS is invalid.");
    }

    if (!config.privateKey) {
      throw new ApiError(503, "WORLD_CHAIN_PRIVATE_KEY is not configured for World Chain writes.");
    }

    const provider = new JsonRpcProvider(config.rpcUrl, config.chainId);
    const signer = new Wallet(normalizePrivateKey(config.privateKey), provider);
    const registry = new Contract(config.contractAddress, verifiedInteractionRegistryAbi, signer);

    const interactionIdHash = hashUtf8(input.interactionId);
    const actorHash = hashUtf8(
      [input.authoritativeActorId, normalizeString(input.actorWorldNullifier)].filter(Boolean).join(":"),
    );
    const targetHash = input.targetUserId
      ? hashUtf8([input.targetUserId, normalizeString(input.targetWorldNullifier)].filter(Boolean).join(":"))
      : ZeroHash;
    const companyHash = hashNullable(input.companyId);
    const painPointHash = hashNullable(input.painPointTag);
    const metadataHash = hashUtf8(
      JSON.stringify(
        stableSortJson({
          ...(input.metadata ?? {}),
          interactionType: input.interactionType,
          rewardStatus: input.rewardStatus,
          verified: input.verified,
        }),
      ),
    );

    const tx = await registry.recordInteraction({
      interactionId: interactionIdHash,
      interactionType: interactionTypeIndex[input.interactionType],
      actorRef: actorHash,
      targetRef: targetHash,
      companyRef: companyHash,
      painPointRef: painPointHash,
      matchScoreBps: normalizeMatchScore(input.matchScore),
      verified: input.verified,
      rewardStatus: rewardStatusIndex[input.rewardStatus],
      metadataHash,
    });

    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) {
      throw new ApiError(502, "World Chain interaction transaction did not finalize successfully.");
    }

    return {
      network: NETWORK_NAME,
      chainId: config.chainId,
      contractAddress: config.contractAddress,
      transactionHash: tx.hash,
      blockNumber: receipt.blockNumber,
      explorerUrl: `${config.explorerTxBaseUrl}${tx.hash}`,
      recorderAddress: signer.address,
      interactionIdHash,
      actorHash,
      targetHash: denormalizeZeroHash(targetHash),
      companyHash: denormalizeZeroHash(companyHash),
      painPointHash: denormalizeZeroHash(painPointHash),
      metadataHash,
      submittedAt: new Date().toISOString(),
    };
  },
};
