import { randomUUID } from "node:crypto";

import { ApiError } from "@/lib/server/http";
import { companyRepository } from "@/lib/server/repositories/company-repository";
import { userRepository } from "@/lib/server/repositories/user-repository";
import { verifiedInteractionRepository } from "@/lib/server/repositories/verified-interaction-repository";
import {
  worldChainVerifiedInteractionService,
  type WorldChainSubmissionResult,
} from "@/lib/server/services/world-chain-verified-interaction-service";
import { worldVerificationNullifierRepository } from "@/lib/server/repositories/world-verification-nullifier-repository";
import type { RewardStatus, UserSummary, VerifiedInteractionSummary, VerifiedInteractionType } from "@/lib/types";

type RecordVerifiedInteractionInput = {
  interactionType: VerifiedInteractionType;
  actorUserId: string;
  targetUserId?: string | null;
  authorizedByUserId?: string | null;
  companyId?: string | null;
  painPointTag?: string | null;
  matchScore?: number | null;
  transactionHash?: string | null;
  rewardStatus?: RewardStatus;
  actorVerificationLevel?: string | null;
  targetVerificationLevel?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: string | null;
};

type VerifiedInteractionServiceDependencies = {
  userRepository: {
    findById(userId: string): Promise<UserSummary | null>;
  };
  companyRepository: {
    findById(companyId: string): Promise<{ id: string } | null>;
  };
  worldVerificationNullifierRepository: {
    findLatestByUserId(userId: string): Promise<{
      action: string;
      nullifier: string;
      createdAt: string;
    } | null>;
  };
  verifiedInteractionRepository: {
    create(input: {
      id: string;
      interactionType: VerifiedInteractionType;
      actorUserId: string;
      targetUserId?: string | null;
      authorizedByUserId?: string | null;
      companyId?: string | null;
      painPointTag?: string | null;
      matchScore?: number | null;
      verified: boolean;
      actorWorldVerified: boolean;
      actorWorldNullifier?: string | null;
      actorVerificationLevel?: string | null;
      targetWorldVerified?: boolean | null;
      targetWorldNullifier?: string | null;
      targetVerificationLevel?: string | null;
      rewardStatus?: RewardStatus;
      transactionHash?: string | null;
      metadata?: Record<string, unknown> | null;
      createdAt?: string | null;
    }): Promise<VerifiedInteractionSummary>;
    findLatestByActorAndType(
      actorUserId: string,
      interactionType: VerifiedInteractionType,
    ): Promise<VerifiedInteractionSummary | null>;
    listRecentByUserId(userId: string, limit?: number): Promise<VerifiedInteractionSummary[]>;
  };
  idGenerator: {
    interactionId(): string;
  };
  worldChainVerifiedInteractionService?: {
    isReady(): boolean;
    submitInteraction(input: {
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
    }): Promise<WorldChainSubmissionResult>;
  };
};

function defaultRewardStatusForInteractionType(interactionType: VerifiedInteractionType): RewardStatus {
  if (interactionType === "INTRO_ACCEPTED" || interactionType === "COLLABORATION_COMPLETED") {
    return "REWARDABLE";
  }

  if (interactionType === "REWARD_EARNED") {
    return "EARNED";
  }

  if (interactionType === "REWARD_DISTRIBUTED") {
    return "DISTRIBUTED";
  }

  return "NOT_REWARDABLE";
}

function normalizeOptionalString(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeOptionalScore(value?: number | null) {
  if (value === null || value === undefined) {
    return null;
  }

  if (!Number.isFinite(value)) {
    throw new ApiError(400, "matchScore must be a finite number when provided.");
  }

  return value;
}

function normalizeOptionalTimestamp(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new ApiError(400, "createdAt must be a valid ISO timestamp when provided.");
  }

  return parsed.toISOString();
}

function mergeMetadata(
  metadata?: Record<string, unknown> | null,
  worldChain?: WorldChainSubmissionResult | null,
  worldChainError?: { message: string } | null,
) {
  if (!worldChain && !worldChainError) {
    return metadata ?? null;
  }

  return {
    ...(metadata ?? {}),
    ...(worldChain
      ? {
          worldChain: {
            network: worldChain.network,
            chainId: worldChain.chainId,
            contractAddress: worldChain.contractAddress,
            transactionHash: worldChain.transactionHash,
            explorerUrl: worldChain.explorerUrl,
            recorderAddress: worldChain.recorderAddress,
            blockNumber: worldChain.blockNumber,
            interactionIdHash: worldChain.interactionIdHash,
            actorHash: worldChain.actorHash,
            targetHash: worldChain.targetHash,
            companyHash: worldChain.companyHash,
            painPointHash: worldChain.painPointHash,
            metadataHash: worldChain.metadataHash,
            submittedAt: worldChain.submittedAt,
          },
        }
      : {}),
    ...(worldChainError
      ? {
          worldChainError: {
            message: worldChainError.message,
          },
        }
      : {}),
  };
}

function requiresTargetVerification(interactionType: VerifiedInteractionType) {
  return (
    interactionType !== "WORLD_ID_REGISTERED" &&
    interactionType !== "MATCH_SUGGESTED" &&
    interactionType !== "INTRO_REQUESTED"
  );
}

function isWorldBackedInteraction(input: {
  interactionType: VerifiedInteractionType;
  actorWorldVerified: boolean;
  targetWorldVerified?: boolean | null;
}) {
  if (!input.actorWorldVerified) {
    return false;
  }

  if (!requiresTargetVerification(input.interactionType)) {
    return true;
  }

  if (input.targetWorldVerified === null || input.targetWorldVerified === undefined) {
    return true;
  }

  return input.targetWorldVerified;
}

export function createVerifiedInteractionService(deps: VerifiedInteractionServiceDependencies) {
  const recordInteraction = async (input: RecordVerifiedInteractionInput) => {
      const actor = await deps.userRepository.findById(input.actorUserId);
      if (!actor) {
        throw new ApiError(404, "Actor user not found.");
      }

      const [target, authorizedBy, actorNullifier, authorizedByNullifier, targetNullifier] = await Promise.all([
        input.targetUserId ? deps.userRepository.findById(input.targetUserId) : Promise.resolve(null),
        input.authorizedByUserId ? deps.userRepository.findById(input.authorizedByUserId) : Promise.resolve(null),
        deps.worldVerificationNullifierRepository.findLatestByUserId(actor.id),
        input.authorizedByUserId
          ? deps.worldVerificationNullifierRepository.findLatestByUserId(input.authorizedByUserId)
          : Promise.resolve(null),
        input.targetUserId ? deps.worldVerificationNullifierRepository.findLatestByUserId(input.targetUserId) : Promise.resolve(null),
      ]);

      if (input.targetUserId && !target) {
        throw new ApiError(404, "Target user not found.");
      }

      if (input.authorizedByUserId && !authorizedBy) {
        throw new ApiError(404, "Authorized-by user not found.");
      }

      if (input.companyId) {
        const company = await deps.companyRepository.findById(input.companyId);
        if (!company) {
          throw new ApiError(404, "Company not found.");
        }
      }

      const authoritativeActor = authorizedBy ?? actor;
      const authoritativeActorNullifier = authorizedByNullifier ?? actorNullifier;
      const interactionId = deps.idGenerator.interactionId();
      const normalizedCompanyId = normalizeOptionalString(input.companyId);
      const normalizedPainPointTag = normalizeOptionalString(input.painPointTag);
      const normalizedMatchScore = normalizeOptionalScore(input.matchScore);
      const normalizedCreatedAt = normalizeOptionalTimestamp(input.createdAt);
      const rewardStatus = input.rewardStatus ?? defaultRewardStatusForInteractionType(input.interactionType);
      const verified = isWorldBackedInteraction({
        interactionType: input.interactionType,
        actorWorldVerified: authoritativeActor.worldVerified,
        targetWorldVerified: target?.worldVerified ?? null,
      });

      let worldChainWrite: WorldChainSubmissionResult | null = null;
      let worldChainError: { message: string } | null = null;

      if (verified && deps.worldChainVerifiedInteractionService?.isReady()) {
        try {
          worldChainWrite = await deps.worldChainVerifiedInteractionService.submitInteraction({
            interactionId,
            interactionType: input.interactionType,
            authoritativeActorId: authorizedBy?.id ?? actor.id,
            actorWorldNullifier: authoritativeActorNullifier?.nullifier ?? null,
            targetUserId: target?.id ?? null,
            targetWorldNullifier: targetNullifier?.nullifier ?? null,
            companyId: normalizedCompanyId,
            painPointTag: normalizedPainPointTag,
            matchScore: normalizedMatchScore,
            verified,
            rewardStatus,
            metadata: input.metadata ?? null,
          });
        } catch (error) {
          worldChainError = {
            message: error instanceof Error ? error.message : "World Chain write failed.",
          };
        }
      }

      return deps.verifiedInteractionRepository.create({
        id: interactionId,
        interactionType: input.interactionType,
        actorUserId: actor.id,
        targetUserId: target?.id ?? null,
        authorizedByUserId: authorizedBy?.id ?? null,
        companyId: normalizedCompanyId,
        painPointTag: normalizedPainPointTag,
        matchScore: normalizedMatchScore,
        verified,
        actorWorldVerified: authoritativeActor.worldVerified,
        actorWorldNullifier: authoritativeActorNullifier?.nullifier ?? null,
        actorVerificationLevel: normalizeOptionalString(input.actorVerificationLevel),
        targetWorldVerified: target?.worldVerified ?? null,
        targetWorldNullifier: targetNullifier?.nullifier ?? null,
        targetVerificationLevel: normalizeOptionalString(input.targetVerificationLevel),
        rewardStatus,
        transactionHash: worldChainWrite?.transactionHash ?? normalizeOptionalString(input.transactionHash),
        metadata: mergeMetadata(input.metadata ?? null, worldChainWrite, worldChainError),
        createdAt: normalizedCreatedAt,
      });
    };

  const ensureWorldRegistrationInteraction = async (userId: string) => {
    const existing = await deps.verifiedInteractionRepository.findLatestByActorAndType(userId, "WORLD_ID_REGISTERED");
    if (existing) {
      return existing;
    }

    const user = await deps.userRepository.findById(userId);
    if (!user?.worldVerified) {
      return null;
    }

    const latestNullifier = await deps.worldVerificationNullifierRepository.findLatestByUserId(userId);

    return recordInteraction({
      interactionType: "WORLD_ID_REGISTERED",
      actorUserId: userId,
      rewardStatus: "NOT_REWARDABLE",
      metadata: {
        source: "world_registration",
        worldAction: latestNullifier?.action ?? null,
      },
      createdAt: latestNullifier?.createdAt ?? null,
    });
  };

  return {
    recordInteraction,

    async ensureWorldRegistrationInteraction(userId: string) {
      return ensureWorldRegistrationInteraction(userId);
    },

    async listRecentForUser(userId: string, limit = 10) {
      return deps.verifiedInteractionRepository.listRecentByUserId(userId, limit);
    },
  };
}

export const verifiedInteractionService = createVerifiedInteractionService({
  userRepository,
  companyRepository,
  worldVerificationNullifierRepository,
  verifiedInteractionRepository,
  worldChainVerifiedInteractionService,
  idGenerator: {
    interactionId: () => `int_${randomUUID().replace(/-/g, "").slice(0, 12)}`,
  },
});
