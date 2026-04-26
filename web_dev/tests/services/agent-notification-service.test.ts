import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAgentNotificationService } from "@/lib/server/services/agent-notification-service";
import type { AgentNotificationSummary, FounderAgentAction, UserSummary } from "@/lib/types";

function buildUser(overrides: Partial<UserSummary> = {}): UserSummary {
  return {
    id: "usr_current",
    name: "George Morris",
    email: "george@flexpointford.com",
    role: "operator",
    bio: "Founder",
    skills: ["pricing", "ops"],
    sectors: ["fintech"],
    linkedinUrl: "https://www.linkedin.com/in/george-morris",
    walletAddress: null,
    worldVerified: true,
    dynamicUserId: null,
    engagementScore: 70,
    reliabilityScore: 72,
    verificationBadges: ["world_verified"],
    outsideNetworkAccessEnabled: false,
    createdAt: new Date().toISOString(),
    lastActiveAt: null,
    ...overrides,
  };
}

describe("agent notification service", () => {
  const deps = {
    prisma: {
      onboardingProfile: {
        findUnique: vi.fn(),
      },
      companyMembership: {
        findMany: vi.fn(),
      },
      userSocialConnection: {
        findMany: vi.fn(),
      },
    },
    userRepository: {
      findById: vi.fn(),
      listDemoUsers: vi.fn(),
    },
    verifiedInteractionService: {
      listRecentForUser: vi.fn(),
    },
    linkedinActivityService: {
      listNotificationsForUser: vi.fn(),
    },
    meshedFounderAgentActionService: {
      execute: vi.fn(),
    },
    agentNotificationRepository: {
      upsertByDedupeKey: vi.fn(),
      listByUserId: vi.fn(),
      findByIdForUser: vi.fn(),
      markStatus: vi.fn(),
    },
    loadDashboardData: vi.fn(),
  };

  beforeEach(() => {
    deps.prisma.onboardingProfile.findUnique.mockReset();
    deps.prisma.companyMembership.findMany.mockReset();
    deps.prisma.userSocialConnection.findMany.mockReset();
    deps.userRepository.findById.mockReset();
    deps.userRepository.listDemoUsers.mockReset();
    deps.verifiedInteractionService.listRecentForUser.mockReset();
    deps.linkedinActivityService.listNotificationsForUser.mockReset();
    deps.meshedFounderAgentActionService.execute.mockReset();
    deps.agentNotificationRepository.upsertByDedupeKey.mockReset();
    deps.agentNotificationRepository.listByUserId.mockReset();
    deps.agentNotificationRepository.findByIdForUser.mockReset();
    deps.agentNotificationRepository.markStatus.mockReset();
    deps.loadDashboardData.mockReset();
  });

  it("generates Meshed-native notifications from pain points, social signals, and connected channels", async () => {
    const currentUser = buildUser();
    deps.userRepository.findById.mockResolvedValue(currentUser);
    deps.prisma.onboardingProfile.findUnique.mockResolvedValue({
      vcCompanyId: "co_vc",
    });
    deps.prisma.companyMembership.findMany.mockResolvedValue([
      {
        id: "mem_1",
        companyId: "co_member",
        relation: "member",
        company: {
          id: "co_member",
          name: "Ecoverse",
          website: "https://flexpointford.com",
          currentPainTags: ["pricing"],
          resolvedPainTags: [],
        },
      },
    ]);
    deps.prisma.userSocialConnection.findMany.mockResolvedValue([
      { provider: "LINKEDIN" },
      { provider: "EMAIL" },
    ]);
    deps.verifiedInteractionService.listRecentForUser.mockResolvedValue([]);
    deps.linkedinActivityService.listNotificationsForUser.mockResolvedValue([
      {
        id: "notif_li_1",
        counterpartUserId: "usr_theo",
        counterpartName: "Theo Mercer",
        action: "message",
        direction: "incoming",
        messagePreview: "Theo reached out about pricing support.",
        receivedAt: new Date().toISOString(),
        title: "Theo is active",
        body: "body",
      },
    ]);
    deps.userRepository.listDemoUsers.mockResolvedValue([
      currentUser,
      buildUser({
        id: "usr_theo",
        name: "Theo Mercer",
        email: "theo@example.com",
        skills: ["pricing", "go-to-market"],
        sectors: ["fintech"],
        engagementScore: 88,
        reliabilityScore: 91,
      }),
    ]);
    deps.loadDashboardData.mockResolvedValue({
      companyGraph: {
        nodes: [
          {
            companyId: "co_bridge",
            companyName: "Bridgewise",
            degree: 8,
            currentPainPointTags: [],
            resolvedPainPointTags: ["pricing"],
            people: [
              {
                id: "person_1",
                name: "Jordan Patel",
                currentPainPointLabel: null,
                resolvedPainPointsLabel: "pricing",
                networkImportanceScore: 90,
              },
            ],
          },
        ],
      },
    });
    deps.agentNotificationRepository.upsertByDedupeKey.mockImplementation(async (input) => ({
      id: input.id,
      userId: input.userId,
      kind: input.kind.toLowerCase(),
      source: input.source.toLowerCase(),
      status: "unread",
      title: input.title,
      body: input.body,
      targetUserId: input.targetUserId ?? null,
      targetCompanyId: input.targetCompanyId ?? null,
      metadata: input.metadata ?? null,
      agentActions: Array.isArray((input.metadata as { agentActions?: FounderAgentAction[] } | null)?.agentActions)
        ? ((input.metadata as { agentActions?: FounderAgentAction[] }).agentActions ?? [])
        : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    deps.agentNotificationRepository.listByUserId.mockResolvedValue([
      {
        id: "notif_1",
        userId: "usr_current",
        kind: "pain_point_match",
        source: "meshed_graph",
        status: "unread",
        title: "pricing opportunity in Bridgewise",
        body: "body",
        targetUserId: null,
        targetCompanyId: "co_bridge",
        metadata: null,
        agentActions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ] satisfies AgentNotificationSummary[]);

    const service = createAgentNotificationService(deps as never);
    const result = await service.syncForUser("usr_current");

    expect(deps.agentNotificationRepository.upsertByDedupeKey).toHaveBeenCalledTimes(5);
    expect(result).toHaveLength(1);
    expect(deps.agentNotificationRepository.upsertByDedupeKey).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "PAIN_POINT_MATCH",
      }),
    );
    expect(deps.agentNotificationRepository.upsertByDedupeKey).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "SOCIAL_SIGNAL",
      }),
    );
    expect(deps.agentNotificationRepository.upsertByDedupeKey).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "COORDINATION_PROMPT",
      }),
    );
    expect(deps.agentNotificationRepository.upsertByDedupeKey).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining("timely Meshed opportunity"),
      }),
    );
  });

  it("still backfills graph-native opportunities when no socials are connected yet", async () => {
    const currentUser = buildUser();
    deps.userRepository.findById.mockResolvedValue(currentUser);
    deps.prisma.onboardingProfile.findUnique.mockResolvedValue({
      vcCompanyId: "co_vc",
    });
    deps.prisma.companyMembership.findMany.mockResolvedValue([
      {
        id: "mem_1",
        companyId: "co_member",
        relation: "member",
        company: {
          id: "co_member",
          name: "Ecoverse",
          website: "https://flexpointford.com",
          currentPainTags: ["pricing"],
          resolvedPainTags: [],
        },
      },
    ]);
    deps.prisma.userSocialConnection.findMany.mockResolvedValue([]);
    deps.verifiedInteractionService.listRecentForUser.mockResolvedValue([]);
    deps.linkedinActivityService.listNotificationsForUser.mockResolvedValue([]);
    deps.userRepository.listDemoUsers.mockResolvedValue([currentUser]);
    deps.loadDashboardData.mockResolvedValue({
      companyGraph: {
        nodes: [
          {
            companyId: "co_bridge",
            companyName: "Bridgewise",
            degree: 8,
            currentPainPointTags: [],
            resolvedPainPointTags: ["pricing"],
            people: [
              {
                id: "person_1",
                name: "Jordan Patel",
                currentPainPointLabel: null,
                resolvedPainPointsLabel: "pricing",
                networkImportanceScore: 90,
              },
            ],
          },
          {
            companyId: "co_orbit",
            companyName: "Orbitflow",
            degree: 7,
            currentPainPointTags: ["pricing"],
            resolvedPainPointTags: [],
            people: [
              {
                id: "person_2",
                name: "Mina Chen",
                currentPainPointLabel: "pricing",
                resolvedPainPointsLabel: null,
                networkImportanceScore: 74,
              },
            ],
          },
        ],
      },
    });
    deps.agentNotificationRepository.upsertByDedupeKey.mockResolvedValue(null);
    deps.agentNotificationRepository.listByUserId.mockResolvedValue([
      {
        id: "notif_1",
        userId: "usr_current",
        kind: "pain_point_match",
        source: "meshed_graph",
        status: "unread",
        title: "pricing opportunity in Bridgewise",
        body: "body",
        targetUserId: null,
        targetCompanyId: "co_bridge",
        metadata: null,
        agentActions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ] satisfies AgentNotificationSummary[]);

    const service = createAgentNotificationService(deps as never);
    const result = await service.syncForUser("usr_current");

    expect(deps.agentNotificationRepository.upsertByDedupeKey).toHaveBeenCalled();
    expect(deps.agentNotificationRepository.upsertByDedupeKey).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "MESHED_GRAPH",
      }),
    );
    expect(result).toHaveLength(1);
  });

  it("executes the stored founder-agent action and marks the notification acted_on", async () => {
    const currentUser = buildUser();
    deps.agentNotificationRepository.findByIdForUser.mockResolvedValue({
      id: "notif_1",
      userId: currentUser.id,
      kind: "social_signal",
      source: "linkedin_signal",
      status: "unread",
      title: "Theo is active in Meshed",
      body: "body",
      targetUserId: "usr_theo",
      targetCompanyId: null,
      metadata: null,
      agentActions: [
        {
          id: "act_1",
          label: "Let my agent follow up with Theo",
          actionType: "QUEUE_OUTREACH",
          description: null,
          targets: [{ kind: "person", personId: "usr_theo", personName: "Theo Mercer" }],
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } satisfies AgentNotificationSummary);
    deps.meshedFounderAgentActionService.execute.mockResolvedValue({
      message: "Accepted. I queued Theo Mercer for agent outreach.",
      effects: [],
      interactions: [],
      requests: [],
    });
    deps.agentNotificationRepository.markStatus.mockResolvedValue({
      id: "notif_1",
      userId: currentUser.id,
      kind: "social_signal",
      source: "linkedin_signal",
      status: "acted_on",
      title: "Theo is active in Meshed",
      body: "body",
      targetUserId: "usr_theo",
      targetCompanyId: null,
      metadata: null,
      agentActions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } satisfies AgentNotificationSummary);

    const service = createAgentNotificationService(deps as never);
    const result = await service.acceptNotification(currentUser, {
      notificationId: "notif_1",
      actionId: "act_1",
    });

    expect(deps.meshedFounderAgentActionService.execute).toHaveBeenCalledWith(
      currentUser,
      expect.objectContaining({
        id: "act_1",
      }),
    );
    expect(deps.agentNotificationRepository.markStatus).toHaveBeenCalledWith("notif_1", currentUser.id, "ACTED_ON");
    expect(result.notification.status).toBe("acted_on");
  });
});
