import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findByLinkedinUrl: vi.fn(),
  findById: vi.fn(),
  findByEmail: vi.fn(),
  updateProfile: vi.fn(),
  create: vi.fn(),
  listDemoUsers: vi.fn(),
  recordInteraction: vi.fn(),
}));

describe("linkedin activity service", () => {
  beforeEach(() => {
    vi.resetModules();
    Object.values(mocks).forEach((mock) => mock.mockReset());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("records a LinkedIn event as a verified interaction and creates bilateral notifications", async () => {
    vi.doMock("@/lib/server/repositories/user-repository", () => ({
      userRepository: {
        findByLinkedinUrl: mocks.findByLinkedinUrl,
        findById: mocks.findById,
        findByEmail: mocks.findByEmail,
        updateProfile: mocks.updateProfile,
        create: mocks.create,
        listDemoUsers: mocks.listDemoUsers,
      },
    }));
    vi.doMock("@/lib/server/services/verified-interaction-service", () => ({
      verifiedInteractionService: {
        recordInteraction: mocks.recordInteraction,
      },
    }));

    const sender = {
      id: "usr_sender",
      name: "Alice Chen",
      linkedinUrl: "https://www.linkedin.com/in/alice",
    };
    const recipient = {
      id: "usr_recipient",
      name: "Bob Singh",
      linkedinUrl: "https://www.linkedin.com/in/bob",
    };

    mocks.findByLinkedinUrl.mockImplementation(async (url: string) => {
      if (url.includes("alice")) return sender;
      if (url.includes("bob")) return recipient;
      return null;
    });
    mocks.recordInteraction.mockResolvedValue({
      id: "int_linkedin_1",
      interactionType: "MATCH_SUGGESTED",
      actorUserId: "usr_sender",
      targetUserId: "usr_recipient",
      authorizedByUserId: null,
      companyId: null,
      painPointTag: null,
      matchScore: null,
      verified: true,
      actorWorldVerified: true,
      actorWorldNullifier: "0xactor",
      actorVerificationLevel: null,
      targetWorldVerified: true,
      targetWorldNullifier: "0xtarget",
      targetVerificationLevel: null,
      rewardStatus: "NOT_REWARDABLE",
      transactionHash: null,
      metadata: null,
      createdAt: "2026-04-01T09:00:00.000Z",
      updatedAt: "2026-04-01T09:00:00.000Z",
    });

    const { linkedinActivityService } = await import("@/lib/server/services/linkedin-activity-service");
    const result = await linkedinActivityService.ingestWebhookEvent({
      senderLinkedInUrl: "https://www.linkedin.com/in/alice",
      recipientLinkedInUrl: "https://www.linkedin.com/in/bob",
      action: "message",
      messagePreview: "Hello from LinkedIn",
    });

    expect(mocks.recordInteraction).toHaveBeenCalledWith(
      expect.objectContaining({
        interactionType: "MATCH_SUGGESTED",
        actorUserId: "usr_sender",
        targetUserId: "usr_recipient",
        metadata: expect.objectContaining({
          source: "linkedin_webhook",
          actorMode: "HUMAN",
          linkedinAction: "message",
        }),
      }),
    );
    expect(result).toMatchObject({
      status: "recorded",
      senderMeshedUserId: "usr_sender",
      recipientMeshedUserId: "usr_recipient",
      notificationsCreated: 2,
      interactionId: "int_linkedin_1",
      interactionType: "MATCH_SUGGESTED",
      verified: true,
    });

    const notifications = await linkedinActivityService.listNotificationsForUser("usr_recipient");
    expect(notifications[0]).toMatchObject({
      counterpartUserId: "usr_sender",
      interactionId: "int_linkedin_1",
      action: "message",
    });
  });

  it("bootstraps a demo counterpart when the local Meshed user pool is too sparse for simulation", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-04T12:00:00.000Z"));

    vi.doMock("@/lib/server/repositories/user-repository", () => ({
      userRepository: {
        findByLinkedinUrl: mocks.findByLinkedinUrl,
        findById: mocks.findById,
        findByEmail: mocks.findByEmail,
        updateProfile: mocks.updateProfile,
        create: mocks.create,
        listDemoUsers: mocks.listDemoUsers,
      },
    }));
    vi.doMock("@/lib/server/services/verified-interaction-service", () => ({
      verifiedInteractionService: {
        recordInteraction: mocks.recordInteraction,
      },
    }));

    const currentUser = {
      id: "usr_current",
      name: "Current User",
      email: "current@meshed.us",
      role: "operator",
      linkedinUrl: "https://www.linkedin.com/in/current-user-meshed",
    };
    const seededCounterpart = {
      id: "usr_consultant_nina",
      name: "Nina Volkov",
      email: "nina@northmesh.io",
      role: "consultant",
      linkedinUrl: "https://www.linkedin.com/in/nina-volkov-meshed",
    };

    mocks.listDemoUsers.mockResolvedValue([currentUser]);
    mocks.findByEmail.mockResolvedValue(null);
    mocks.create.mockResolvedValue(seededCounterpart);
    mocks.findById.mockImplementation(async (id: string) => {
      if (id === currentUser.id) return currentUser;
      if (id === seededCounterpart.id) return seededCounterpart;
      return null;
    });
    mocks.findByLinkedinUrl.mockImplementation(async (url: string) => {
      if (url.includes("current-user")) return currentUser;
      if (url.includes("nina-volkov")) return seededCounterpart;
      return null;
    });
    mocks.recordInteraction.mockResolvedValue({
      id: "int_seeded_1",
      interactionType: "INTRO_REQUESTED",
      actorUserId: seededCounterpart.id,
      targetUserId: currentUser.id,
      authorizedByUserId: currentUser.id,
      companyId: null,
      painPointTag: null,
      matchScore: null,
      verified: true,
      actorWorldVerified: true,
      actorWorldNullifier: "0xactor",
      actorVerificationLevel: null,
      targetWorldVerified: true,
      targetWorldNullifier: "0xtarget",
      targetVerificationLevel: null,
      rewardStatus: "NOT_REWARDABLE",
      transactionHash: null,
      metadata: null,
      createdAt: "2026-04-04T12:00:00.000Z",
      updatedAt: "2026-04-04T12:00:00.000Z",
    });

    const { linkedinActivityService } = await import("@/lib/server/services/linkedin-activity-service");
    const result = await linkedinActivityService.simulateAlertForUser("usr_current");

    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "usr_consultant_nina",
        email: "nina@northmesh.io",
        role: "CONSULTANT",
      }),
    );
    expect(mocks.recordInteraction).toHaveBeenCalledWith(
      expect.objectContaining({
        authorizedByUserId: "usr_current",
        metadata: expect.objectContaining({
          source: "linkedin_simulation",
          actorMode: "AGENT",
        }),
      }),
    );
    expect(result.counterpartName).toBe("Nina Volkov");
    expect(result.ingestion).toMatchObject({
      status: "recorded",
      notificationsCreated: 2,
      interactionId: "int_seeded_1",
    });
  });
});
