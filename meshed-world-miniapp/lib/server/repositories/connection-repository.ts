import { prisma } from "@/lib/server/prisma";
import type { ConnectionSummary } from "@/lib/types";

const connectionType = {
  intro: "INTRO",
  consulting: "CONSULTING",
  mentorship: "MENTORSHIP",
  investment: "INVESTMENT",
  endorsement: "ENDORSEMENT",
} as const;

function toConnectionSummary(
  connection: Awaited<ReturnType<typeof prisma.connection.findFirstOrThrow>>,
): ConnectionSummary {
  return {
    id: connection.id,
    sourceUserId: connection.sourceUserId,
    targetUserId: connection.targetUserId,
    type: connection.type.toLowerCase() as ConnectionSummary["type"],
    verified: connection.verified,
  };
}

export const connectionRepository = {
  async listVerifiedContactIds(userId: string): Promise<string[]> {
    const connections = await prisma.connection.findMany({
      where: {
        verified: true,
        OR: [{ sourceUserId: userId }, { targetUserId: userId }],
      },
      select: {
        sourceUserId: true,
        targetUserId: true,
      },
    });

    return Array.from(
      new Set(
        connections.map((connection: { sourceUserId: string; targetUserId: string }) =>
          connection.sourceUserId === userId ? connection.targetUserId : connection.sourceUserId,
        ),
      ),
    );
  },

  async findFirstBetweenUsers(userAId: string, userBId: string): Promise<ConnectionSummary | null> {
    const connection = await prisma.connection.findFirst({
      where: {
        OR: [
          {
            sourceUserId: userAId,
            targetUserId: userBId,
          },
          {
            sourceUserId: userBId,
            targetUserId: userAId,
          },
        ],
      },
      orderBy: [{ verified: "desc" }, { createdAt: "asc" }],
    });

    return connection ? toConnectionSummary(connection) : null;
  },

  async createVerifiedConnection(input: {
    id: string;
    sourceUserId: string;
    targetUserId: string;
    type: ConnectionSummary["type"];
    note?: string | null;
  }): Promise<ConnectionSummary> {
    const connection = await prisma.connection.create({
      data: {
        id: input.id,
        sourceUserId: input.sourceUserId,
        targetUserId: input.targetUserId,
        type: connectionType[input.type],
        verified: true,
        note: input.note ?? null,
      },
    });

    return toConnectionSummary(connection);
  },
};
