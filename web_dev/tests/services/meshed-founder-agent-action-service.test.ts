import { beforeEach, describe, expect, it, vi } from "vitest";

describe("meshedFounderAgentActionService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("queues graph-only outreach targets and records verified intro-request interactions", async () => {
    const listDemoUsers = vi.fn().mockResolvedValue([]);
    const createRequest = vi.fn();
    const recordInteraction = vi.fn().mockResolvedValue({
      id: "int_1",
      interactionType: "INTRO_REQUESTED",
      verified: true,
    });
    const listRecentForUser = vi.fn();

    const { createMeshedFounderAgentActionService } = await import("@/lib/server/services/meshed-founder-agent-action-service");
    const service = createMeshedFounderAgentActionService({
      userRepository: {
        listDemoUsers,
      },
      connectionRequestService: {
        createRequest,
      },
      verifiedInteractionService: {
        recordInteraction,
        listRecentForUser,
      },
      prisma: {
        companyMembership: {
          findMany: vi.fn(),
        },
      } as never,
    });

    const result = await service.execute(
      {
        id: "usr_founder",
        name: "George Morris",
        email: "george@example.com",
        role: "operator",
        bio: "",
        skills: ["fundraising"],
        sectors: ["music"],
        worldVerified: true,
        engagementScore: 0,
        reliabilityScore: 0,
        verificationBadges: ["world_verified"],
        createdAt: "2026-04-25T00:00:00.000Z",
      },
      {
        id: "faa_1",
        label: "Reach out to Mike Morris to discuss your music app.",
        actionType: "QUEUE_OUTREACH",
        targets: [
          {
            kind: "person",
            personName: "Mike Morris",
            companyName: "Songbird",
          },
        ],
      },
    );

    expect(createRequest).not.toHaveBeenCalled();
    expect(recordInteraction).toHaveBeenCalledWith({
      interactionType: "INTRO_REQUESTED",
      actorUserId: "usr_founder",
      companyId: null,
      metadata: expect.objectContaining({
        source: "founder_agent_action",
        actorMode: "AGENT",
        graphOnlyTarget: true,
        counterpartName: "Mike Morris",
        companyName: "Songbird",
      }),
    });
    expect(result.effects).toEqual([
      {
        type: "queue_graph_contact",
        target: {
          kind: "person",
          personName: "Mike Morris",
          companyName: "Songbird",
        },
      },
    ]);
    expect(result.message).toContain("Accepted. I queued Mike Morris");
  });

  it("drafts a concise founder brief from the current membership context", async () => {
    const { createMeshedFounderAgentActionService } = await import("@/lib/server/services/meshed-founder-agent-action-service");
    const service = createMeshedFounderAgentActionService({
      userRepository: {
        listDemoUsers: vi.fn(),
      },
      connectionRequestService: {
        createRequest: vi.fn(),
      },
      verifiedInteractionService: {
        recordInteraction: vi.fn(),
        listRecentForUser: vi.fn(),
      },
      prisma: {
        companyMembership: {
          findMany: vi.fn().mockResolvedValue([
            {
              company: {
                name: "MeshTune",
                sector: "music",
                stage: "Seed",
                currentPainTags: ["fundraising", "distribution"],
              },
            },
          ]),
        },
      } as never,
    });

    const result = await service.execute(
      {
        id: "usr_founder",
        name: "George Morris",
        email: "george@example.com",
        role: "operator",
        bio: "",
        skills: ["fundraising", "growth"],
        sectors: ["music"],
        worldVerified: true,
        engagementScore: 0,
        reliabilityScore: 0,
        verificationBadges: ["world_verified"],
        createdAt: "2026-04-25T00:00:00.000Z",
      },
      {
        id: "faa_brief",
        label: "Prepare a concise pitch for the LPs.",
        actionType: "DRAFT_FOUNDER_BRIEF",
        targets: [
          {
            kind: "partner",
            partnerName: "Alex Hunstad",
            companyName: "Alliance Ventures",
          },
        ],
      },
    );

    expect(result.message).toContain("I drafted a concise founder brief");
    expect(result.message).toContain("MeshTune");
    expect(result.message).toContain("Alex Hunstad");
    expect(result.effects).toEqual([]);
  });
});
