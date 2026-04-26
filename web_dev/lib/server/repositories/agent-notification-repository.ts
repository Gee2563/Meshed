import { Prisma } from "@/lib/server/prisma-client";
import { prisma } from "@/lib/server/prisma";
import { toAgentNotificationSummary } from "@/lib/server/repositories/mappers";
import type { AgentNotificationSummary, FounderAgentAction } from "@/lib/types";

export const agentNotificationRepository = {
  async listByUserId(
    userId: string,
    input?: {
      limit?: number;
      statuses?: Array<"UNREAD" | "READ" | "ACTED_ON" | "DISMISSED">;
    },
  ) {
    const notifications = await prisma.agentNotification.findMany({
      where: {
        userId,
        status: input?.statuses ? { in: input.statuses } : undefined,
      },
      orderBy: [{ createdAt: "desc" }],
      take: input?.limit ?? 20,
    });

    return notifications.map(toAgentNotificationSummary);
  },

  async upsertByDedupeKey(input: {
    id: string;
    userId: string;
    kind: "PAIN_POINT_MATCH" | "SOCIAL_SIGNAL" | "COORDINATION_PROMPT";
    source: "MESHED_GRAPH" | "LINKEDIN_SIGNAL" | "EXTERNAL_SOCIAL";
    dedupeKey: string;
    title: string;
    body: string;
    targetUserId?: string | null;
    targetCompanyId?: string | null;
    metadata?: Record<string, unknown> | null;
  }) {
    const notification = await prisma.agentNotification.upsert({
      where: {
        dedupeKey: input.dedupeKey,
      },
      update: {
        title: input.title,
        body: input.body,
        targetUserId: input.targetUserId ?? null,
        targetCompanyId: input.targetCompanyId ?? null,
        metadata:
          input.metadata === undefined
            ? undefined
            : input.metadata === null
              ? Prisma.JsonNull
              : (input.metadata as Prisma.InputJsonValue),
      },
      create: {
        id: input.id,
        userId: input.userId,
        kind: input.kind,
        source: input.source,
        dedupeKey: input.dedupeKey,
        title: input.title,
        body: input.body,
        targetUserId: input.targetUserId ?? null,
        targetCompanyId: input.targetCompanyId ?? null,
        metadata: input.metadata === null ? Prisma.JsonNull : ((input.metadata ?? undefined) as Prisma.InputJsonValue | undefined),
      },
    });

    return toAgentNotificationSummary(notification);
  },

  async findByIdForUser(notificationId: string, userId: string) {
    const notification = await prisma.agentNotification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    return notification ? toAgentNotificationSummary(notification) : null;
  },

  async markStatus(
    notificationId: string,
    userId: string,
    status: "UNREAD" | "READ" | "ACTED_ON" | "DISMISSED",
  ) {
    const notification = await prisma.agentNotification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      return null;
    }

    const updated = await prisma.agentNotification.update({
      where: {
        id: notificationId,
      },
      data: {
        status,
      },
    });

    return toAgentNotificationSummary(updated);
  },
};

export function notificationMetadataWithActions(
  metadata: Record<string, unknown> | null | undefined,
  actions: FounderAgentAction[],
) {
  return {
    ...(metadata ?? {}),
    agentActions: actions,
  };
}
