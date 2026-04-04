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

    const badges = [...new Set([...(currentUser.verificationBadges ?? []), "world_verified"])];

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
            verificationBadges: badges,
          },
        }),
      ]);

      return toUserSummary(user);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ApiError(409, "World verification for this action was already used.");
      }

      throw error;
    }
  },
};
