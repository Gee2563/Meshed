import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findByLinkedinUrl: vi.fn(),
  findById: vi.fn(),
  findByEmail: vi.fn(),
  updateProfile: vi.fn(),
  create: vi.fn(),
  listDemoUsers: vi.fn(),
  verifyExternalEvent: vi.fn(),
  recordRelationship: vi.fn(),
}));

describe("linkedin activity service", () => {
  beforeEach(() => {
    vi.resetModules();
    Object.values(mocks).forEach((mock) => mock.mockReset());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("attests a LinkedIn event, writes the relationship, and creates bilateral notifications", async () => {
    vi.doMock("@/lib/config/env", () => ({
      env: {
        USE_MOCK_FLARE: false,
        USE_MOCK_MESHING: false,
      },
    }));
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
    vi.doMock("@/lib/server/adapters/flare", () => ({
      getFlareAdapters: () => ({
        external: {
          verifyExternalEvent: mocks.verifyExternalEvent,
        },
      }),
    }));
    vi.doMock("@/lib/server/services/meshing-contract-service", () => ({
      getRealMeshingConfig: () => ({
        rpcUrl: "https://coston2.example",
        privateKey: "0x1234",
        relationshipRegistryAddress: "0x1111111111111111111111111111111111111111",
        portfolioRegistryAddress: "0x2222222222222222222222222222222222222222",
        opportunityAlertAddress: "0x3333333333333333333333333333333333333333",
      }),
      getMeshingContractsService: () => ({
        recordRelationship: mocks.recordRelationship,
      }),
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
    mocks.verifyExternalEvent.mockResolvedValue({
      verified: true,
      providerRef: "flare:oracle-signature:abc",
    });
    mocks.recordRelationship.mockResolvedValue({
      relationship: {
        relationshipId: "0xrelationship",
      },
      contractCall: {
        network: "flare-coston2",
        contractAddress: "0x1111111111111111111111111111111111111111",
        contract: "RelationshipRegistry",
        method: "recordRelationship",
        args: ["Alice Chen", "Bob Singh", "LINKEDIN_MESSAGE"],
        txHash: "0xflaretx",
        blockNumber: 123,
      },
    });

    const { linkedinActivityService } = await import("@/lib/server/services/linkedin-activity-service");
    const result = await linkedinActivityService.ingestWebhookEvent({
      senderLinkedInUrl: "https://www.linkedin.com/in/alice",
      recipientLinkedInUrl: "https://www.linkedin.com/in/bob",
      action: "message",
      messagePreview: "Hello from LinkedIn",
    });

    expect(mocks.verifyExternalEvent).toHaveBeenCalledOnce();
    expect(mocks.recordRelationship).toHaveBeenCalledWith({
      entityA: "Alice Chen",
      entityB: "Bob Singh",
      relationshipType: "LINKEDIN_MESSAGE",
    });
    expect(result).toMatchObject({
      status: "attested",
      senderMeshedUserId: "usr_sender",
      recipientMeshedUserId: "usr_recipient",
      notificationsCreated: 2,
      relationshipId: "0xrelationship",
      attestationRef: "flare:oracle-signature:abc",
    });

    const notifications = await linkedinActivityService.listNotificationsForUser("usr_recipient");
    expect(notifications[0]).toMatchObject({
      counterpartUserId: "usr_sender",
      attestationRef: "flare:oracle-signature:abc",
      action: "message",
    });
  });

  it("bootstraps a demo counterpart when the local Meshed user pool is too sparse for simulation", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-04T12:00:00.000Z"));

    vi.doMock("@/lib/config/env", () => ({
      env: {
        USE_MOCK_FLARE: false,
        USE_MOCK_MESHING: false,
      },
    }));
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
    vi.doMock("@/lib/server/adapters/flare", () => ({
      getFlareAdapters: () => ({
        external: {
          verifyExternalEvent: mocks.verifyExternalEvent,
        },
      }),
    }));
    vi.doMock("@/lib/server/services/meshing-contract-service", () => ({
      getRealMeshingConfig: () => ({
        rpcUrl: "https://coston2.example",
        privateKey: "0x1234",
        relationshipRegistryAddress: "0x1111111111111111111111111111111111111111",
        portfolioRegistryAddress: "0x2222222222222222222222222222222222222222",
        opportunityAlertAddress: "0x3333333333333333333333333333333333333333",
      }),
      getMeshingContractsService: () => ({
        recordRelationship: mocks.recordRelationship,
      }),
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
    mocks.verifyExternalEvent.mockResolvedValue({
      verified: true,
      providerRef: "flare:oracle-signature:seeded",
    });
    mocks.recordRelationship.mockResolvedValue({
      relationship: {
        relationshipId: "0xseededrelationship",
      },
      contractCall: {
        network: "flare-coston2",
        contractAddress: "0x1111111111111111111111111111111111111111",
        contract: "RelationshipRegistry",
        method: "recordRelationship",
        args: ["Nina Volkov", "Current User", "LINKEDIN_CONNECT_REQUEST"],
        txHash: "0xflaretxseeded",
        blockNumber: 456,
      },
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
    expect(result.counterpartName).toBe("Nina Volkov");
    expect(result.ingestion).toMatchObject({
      status: "attested",
      notificationsCreated: 2,
      relationshipId: "0xseededrelationship",
    });

  });
});
