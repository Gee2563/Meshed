import { Prisma } from "@/lib/server/prisma-client";
import { prisma } from "@/lib/server/prisma";
import type { RewardStatus, VerifiedInteractionSummary, VerifiedInteractionType } from "@/lib/types";

function toVerifiedInteractionSummary(
  interaction: Awaited<ReturnType<typeof prisma.verifiedInteraction.findFirstOrThrow>>,
): VerifiedInteractionSummary {
  return {
    id: interaction.id,
    interactionType: interaction.interactionType,
    actorUserId: interaction.actorUserId,
    targetUserId: interaction.targetUserId ?? null,
    authorizedByUserId: interaction.authorizedByUserId ?? null,
    companyId: interaction.companyId ?? null,
    painPointTag: interaction.painPointTag ?? null,
    matchScore: interaction.matchScore ?? null,
    verified: interaction.verified,
    actorWorldVerified: interaction.actorWorldVerified,
    actorWorldNullifier: interaction.actorWorldNullifier ?? null,
    actorVerificationLevel: interaction.actorVerificationLevel ?? null,
    targetWorldVerified: interaction.targetWorldVerified ?? null,
    targetWorldNullifier: interaction.targetWorldNullifier ?? null,
    targetVerificationLevel: interaction.targetVerificationLevel ?? null,
    rewardStatus: interaction.rewardStatus,
    transactionHash: interaction.transactionHash ?? null,
    metadata: (interaction.metadata as Record<string, unknown> | null | undefined) ?? null,
    createdAt: interaction.createdAt.toISOString(),
    updatedAt: interaction.updatedAt.toISOString(),
  };
}

export const verifiedInteractionRepository = {
  async create(input: {
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
  }) {
    const interaction = await prisma.verifiedInteraction.create({
      data: {
        id: input.id,
        interactionType: input.interactionType,
        actorUserId: input.actorUserId,
        targetUserId: input.targetUserId ?? null,
        authorizedByUserId: input.authorizedByUserId ?? null,
        companyId: input.companyId ?? null,
        painPointTag: input.painPointTag ?? null,
        matchScore: input.matchScore ?? null,
        verified: input.verified,
        actorWorldVerified: input.actorWorldVerified,
        actorWorldNullifier: input.actorWorldNullifier ?? null,
        actorVerificationLevel: input.actorVerificationLevel ?? null,
        targetWorldVerified: input.targetWorldVerified ?? null,
        targetWorldNullifier: input.targetWorldNullifier ?? null,
        targetVerificationLevel: input.targetVerificationLevel ?? null,
        rewardStatus: input.rewardStatus ?? "NOT_REWARDABLE",
        transactionHash: input.transactionHash ?? null,
        createdAt: input.createdAt ? new Date(input.createdAt) : undefined,
        metadata:
          input.metadata === null
            ? Prisma.JsonNull
            : ((input.metadata ?? undefined) as Prisma.InputJsonValue | undefined),
      },
    });

    return toVerifiedInteractionSummary(interaction);
  },

  async findById(id: string) {
    const interaction = await prisma.verifiedInteraction.findUnique({
      where: { id },
    });

    return interaction ? toVerifiedInteractionSummary(interaction) : null;
  },

  async findLatestByActorAndType(actorUserId: string, interactionType: VerifiedInteractionType) {
    const interaction = await prisma.verifiedInteraction.findFirst({
      where: {
        actorUserId,
        interactionType,
      },
      orderBy: [{ createdAt: "desc" }],
    });

    return interaction ? toVerifiedInteractionSummary(interaction) : null;
  },

  async updateRewardStatus(id: string, rewardStatus: RewardStatus) {
    const interaction = await prisma.verifiedInteraction.update({
      where: { id },
      data: {
        rewardStatus,
      },
    });

    return toVerifiedInteractionSummary(interaction);
  },

  async listRecentByUserId(userId: string, limit = 10) {
    const interactions = await prisma.verifiedInteraction.findMany({
      where: {
        OR: [
          { actorUserId: userId },
          { targetUserId: userId },
          { authorizedByUserId: userId },
        ],
      },
      orderBy: [{ createdAt: "desc" }],
      take: Math.max(limit, 1),
    });

    return interactions.map(toVerifiedInteractionSummary);
  },
};
