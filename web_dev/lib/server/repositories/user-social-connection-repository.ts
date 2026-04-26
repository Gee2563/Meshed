import { prisma } from "@/lib/server/prisma";
import { Prisma } from "@/lib/server/prisma-client";
import { toUserSocialConnectionSummary } from "@/lib/server/repositories/mappers";
import type { UserSocialConnectionSummary } from "@/lib/types";

export const userSocialConnectionRepository = {
  async listByUserId(userId: string) {
    const connections = await prisma.userSocialConnection.findMany({
      where: { userId },
      orderBy: [{ provider: "asc" }],
    });

    return connections.map(toUserSocialConnectionSummary);
  },

  async upsertMany(
    userId: string,
    entries: Array<{
      id: string;
      provider: "LINKEDIN" | "EMAIL" | "SLACK" | "MICROSOFT_TEAMS" | "TWITTER" | "CALENDAR" | "INSTAGRAM";
      status: "CONNECTED" | "SKIPPED";
      accountLabel?: string | null;
      metadata?: Record<string, unknown> | null;
    }>,
  ) {
    const results: UserSocialConnectionSummary[] = [];

    for (const entry of entries) {
      const connection = await prisma.userSocialConnection.upsert({
        where: {
          userId_provider: {
            userId,
            provider: entry.provider,
          },
        },
        update: {
          status: entry.status,
          accountLabel: entry.accountLabel ?? null,
          metadata:
            entry.metadata === undefined
              ? undefined
              : entry.metadata === null
                ? Prisma.JsonNull
                : (entry.metadata as Prisma.InputJsonValue),
        },
        create: {
          id: entry.id,
          userId,
          provider: entry.provider,
          status: entry.status,
          accountLabel: entry.accountLabel ?? null,
          metadata: entry.metadata === null ? Prisma.JsonNull : ((entry.metadata ?? undefined) as Prisma.InputJsonValue | undefined),
        },
      });

      results.push(toUserSocialConnectionSummary(connection));
    }

    return results;
  },
};
