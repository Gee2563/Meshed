import { ApiError } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";
import { toUserSummary } from "@/lib/server/repositories/mappers";

function isUniqueConstraintError(error: unknown): error is { code: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string" &&
    (error as { code: string }).code === "P2002"
  );
}

async function markUserAsWorldVerified(userId: string, worldVerificationBadges: string[]) {
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!currentUser) {
    throw new ApiError(404, "User not found.");
  }

  if (currentUser.worldVerified) {
    return toUserSummary(currentUser);
  }

  const badges = [...new Set([...(worldVerificationBadges ?? []), "world_verified"])];

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      worldVerified: true,
      verificationBadges: badges,
    },
  });

  return toUserSummary(user);
}

export const worldVerificationNullifierRepository = {
  async reserveAndMarkVerified(input: {
    userId: string;
    action: string;
    nullifier: string;
  }) {
    const currentUser = await prisma.user.findUnique({
      where: { id: input.userId },
    });

    if (!currentUser) {
      throw new ApiError(404, "User not found.");
    }

    const currentBadges = currentUser.verificationBadges ?? [];
    const replayKey = {
      action: input.action,
      nullifier: input.nullifier,
    };

    const alreadyReserved = await prisma.worldVerificationNullifier.findUnique({
      where: {
        action_nullifier: replayKey,
      },
      select: {
        userId: true,
      },
    });

    if (alreadyReserved) {
      if (alreadyReserved.userId !== input.userId) {
        throw new ApiError(409, "World verification for this action was already used.");
      }

      return markUserAsWorldVerified(input.userId, currentBadges);
    }

    try {
      const [, user] = await prisma.$transaction([
        prisma.worldVerificationNullifier.create({
          data: {
            userId: input.userId,
            action: input.action,
            nullifier: input.nullifier,
          },
        }),
        prisma.user.update({
          where: { id: input.userId },
          data: {
            worldVerified: true,
            verificationBadges: [...new Set([...(currentUser.verificationBadges ?? []), "world_verified"])],
          },
        }),
      ]);

      return toUserSummary(user);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        const alreadyReserved = await prisma.worldVerificationNullifier.findUnique({
          where: {
            action_nullifier: replayKey,
          },
          select: {
            userId: true,
          },
        });

        if (alreadyReserved && alreadyReserved.userId === input.userId) {
          return markUserAsWorldVerified(input.userId, currentBadges);
        }

        throw new ApiError(409, "World verification for this action was already used.");
      }

      throw error;
    }
  },
};
