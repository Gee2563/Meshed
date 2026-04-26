import { describe, expect, it, vi } from "vitest";

import { createConnectionRequestService } from "@/lib/server/services/connection-request-service";
import type {
  ConnectionRequestSummary,
  ConnectionSummary,
  UserSummary,
  VerifiedInteractionSummary,
} from "@/lib/types";

function createUser(overrides?: Partial<UserSummary>): UserSummary {
  return {
    id: "usr_default",
    name: "Avery Collins",
    email: "avery@meshed.app",
    role: "investor",
    bio: "Meshed member",
    skills: [],
    sectors: [],
    linkedinUrl: null,
    walletAddress: "0x1111111111111111111111111111111111111111",
    worldVerified: true,
    dynamicUserId: "dyn_default",
    engagementScore: 80,
    reliabilityScore: 84,
    verificationBadges: ["world_verified", "wallet_connected"],
    outsideNetworkAccessEnabled: true,
    lastActiveAt: null,
    createdAt: "2026-04-01T09:00:00.000Z",
    ...overrides,
  };
}

function createRequest(overrides?: Partial<ConnectionRequestSummary>): ConnectionRequestSummary {
  return {
    id: "req_1",
    requesterUserId: "usr_requester",
    recipientUserId: "usr_recipient",
    requesterName: "Nina Volkov",
    requesterRole: "consultant",
    requesterCompany: "NorthMesh",
    requesterContact: "nina@northmesh.io",
    requesterLinkedinUrl: "https://www.linkedin.com/in/nina-volkov-meshed",
    type: "consulting",
    status: "pending",
    message: "Let's formalize this connection on Meshed.",
    acceptedConnectionId: null,
    contractAddress: null,
    contractNetwork: null,
    generationMode: null,
    contractTxHash: null,
    metadata: null,
    createdAt: "2026-04-01T09:00:00.000Z",
    respondedAt: null,
    ...overrides,
  };
}

function createConnection(overrides?: Partial<ConnectionSummary>): ConnectionSummary {
  return {
    id: "conn_1",
    sourceUserId: "usr_requester",
    targetUserId: "usr_recipient",
    type: "consulting",
    verified: true,
    ...overrides,
  };
}

function createInteraction(overrides?: Partial<VerifiedInteractionSummary>): VerifiedInteractionSummary {
  return {
    id: "int_1",
    interactionType: "INTRO_REQUESTED",
    actorUserId: "usr_requester",
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
    ...overrides,
  };
}

describe("connection request service", () => {
  it("creates a pending request and records an intro-requested interaction", async () => {
    const requester = createUser({
      id: "usr_requester",
      role: "investor",
    });
    const recipient = createUser({
      id: "usr_recipient",
      role: "mentor",
      name: "Theo Mercer",
    });
    const createPendingRequest = vi.fn(async () =>
      createRequest({
        requesterUserId: requester.id,
        recipientUserId: recipient.id,
        requesterName: requester.name,
        requesterRole: requester.role,
        type: "investment",
        message: "Would love to open a Meshed relationship.",
        metadata: {
          source: "connection_request",
          companyId: null,
          painPointTag: null,
          matchScore: null,
        },
      }),
    );
    const recordInteraction = vi.fn(async () =>
      createInteraction({
        id: "int_request",
        interactionType: "INTRO_REQUESTED",
        actorUserId: requester.id,
        targetUserId: recipient.id,
      }),
    );

    const service = createConnectionRequestService({
      connectionRequestRepository: {
        listIncomingPendingByUserId: vi.fn(async () => []),
        listOutgoingPendingContactIdsByUserId: vi.fn(async () => []),
        findIncomingById: vi.fn(async () => null),
        findPendingBetweenUsers: vi.fn(async () => null),
        createPendingRequest,
        acceptPendingRequest: vi.fn(async () => null),
      },
      connectionRepository: {
        listVerifiedContactIds: vi.fn(async () => []),
        findFirstBetweenUsers: vi.fn(async () => null),
        createVerifiedConnection: vi.fn(async () => createConnection()),
      },
      userRepository: {
        findById: vi.fn(async (userId: string) => (userId === requester.id ? requester : recipient)),
        listDemoUsers: vi.fn(async () => [requester, recipient]),
      },
      verifiedInteractionService: {
        recordInteraction,
      },
      idGenerator: {
        connectionId: vi.fn(() => "conn_generated"),
        requestId: vi.fn(() => "req_generated"),
      },
    });

    const created = await service.createRequest(requester.id, {
      recipientUserId: recipient.id,
      type: "investment",
      message: "Would love to open a Meshed relationship.",
    });

    expect(createPendingRequest).toHaveBeenCalledWith({
      id: "req_generated",
      requesterUserId: requester.id,
      recipientUserId: recipient.id,
      type: "investment",
      message: "Would love to open a Meshed relationship.",
      metadata: {
        source: "connection_request",
        companyId: null,
        painPointTag: null,
        matchScore: null,
      },
    });
    expect(recordInteraction).toHaveBeenCalledWith(
      expect.objectContaining({
        interactionType: "INTRO_REQUESTED",
        actorUserId: requester.id,
        targetUserId: recipient.id,
      }),
    );
    expect(created.request.id).toBe("req_1");
    expect(created.interaction.id).toBe("int_request");
  });

  it("backfills inbound demo requests even when the user already has some state", async () => {
    const currentUser = createUser({
      id: "usr_current",
      name: "Avery Collins",
      role: "operator",
    });
    const mentor = createUser({
      id: "usr_mentor",
      name: "Theo Mercer",
      role: "mentor",
      engagementScore: 99,
    });
    const consultant = createUser({
      id: "usr_consultant",
      name: "Nina Volkov",
      role: "consultant",
      engagementScore: 95,
    });
    const investor = createUser({
      id: "usr_investor",
      name: "Omar Kelley",
      role: "investor",
      engagementScore: 91,
    });
    const operator = createUser({
      id: "usr_operator",
      name: "Iris Shaw",
      role: "operator",
      engagementScore: 87,
    });

    const createPendingRequest = vi.fn(async (input: { requesterUserId: string; recipientUserId: string }) =>
      createRequest({
        id: `req_${input.requesterUserId}`,
        requesterUserId: input.requesterUserId,
        recipientUserId: input.recipientUserId,
      }),
    );

    const states = [
      {
        pendingIncomingRequests: [],
        connectedContactIds: ["usr_mentor"],
        outgoingPendingContactIds: [],
      },
      {
        pendingIncomingRequests: [
          createRequest({
            id: "req_usr_consultant",
            requesterUserId: "usr_consultant",
            recipientUserId: "usr_current",
          }),
          createRequest({
            id: "req_usr_investor",
            requesterUserId: "usr_investor",
            recipientUserId: "usr_current",
          }),
        ],
        connectedContactIds: ["usr_mentor"],
        outgoingPendingContactIds: ["usr_operator"],
      },
    ];

    const service = createConnectionRequestService({
      connectionRequestRepository: {
        listIncomingPendingByUserId: vi
          .fn()
          .mockImplementation(async () => states.shift()?.pendingIncomingRequests ?? []),
        listOutgoingPendingContactIdsByUserId: vi
          .fn()
          .mockImplementation(async () => states[0]?.outgoingPendingContactIds ?? ["usr_operator"]),
        findIncomingById: vi.fn(async () => null),
        findPendingBetweenUsers: vi.fn(async () => null),
        createPendingRequest,
        acceptPendingRequest: vi.fn(async () => null),
      },
      connectionRepository: {
        listVerifiedContactIds: vi
          .fn()
          .mockImplementation(async () => states[0]?.connectedContactIds ?? ["usr_mentor"]),
        findFirstBetweenUsers: vi.fn(async () => null),
        createVerifiedConnection: vi.fn(async () => createConnection({ id: "conn_seeded" })),
      },
      userRepository: {
        findById: vi.fn(async () => currentUser),
        listDemoUsers: vi.fn(async () => [currentUser, mentor, consultant, investor, operator]),
      },
      verifiedInteractionService: {
        recordInteraction: vi.fn(async () => createInteraction()),
      },
      idGenerator: {
        connectionId: vi.fn(() => "conn_generated"),
        requestId: vi.fn(() => "req_generated"),
      },
    });

    const result = await service.ensureDemoState(currentUser.id);

    expect(createPendingRequest).toHaveBeenCalledTimes(2);
    expect(result.pendingIncomingRequests).toHaveLength(2);
    expect(result.connectedContactIds).toContain("usr_mentor");
  });

  it("accepts a pending request and records a rewardable intro acceptance", async () => {
    const request = createRequest();
    const acceptedRequest = createRequest({
      status: "accepted",
      acceptedConnectionId: "conn_accepted",
      metadata: {
        source: "connection_request_acceptance",
        acceptedWithoutFlare: true,
      },
      respondedAt: "2026-04-01T09:05:00.000Z",
    });
    const connection = createConnection({ id: "conn_accepted" });
    const recordInteraction = vi.fn(async () =>
      createInteraction({
        id: "int_intro_accepted",
        interactionType: "INTRO_ACCEPTED",
        actorUserId: "usr_recipient",
        targetUserId: "usr_requester",
        rewardStatus: "REWARDABLE",
      }),
    );
    const acceptPendingRequest = vi.fn(async () => acceptedRequest);

    const service = createConnectionRequestService({
      connectionRequestRepository: {
        listIncomingPendingByUserId: vi.fn(async () => [request]),
        listOutgoingPendingContactIdsByUserId: vi.fn(async () => ["usr_outgoing"]),
        findIncomingById: vi.fn(async () => request),
        findPendingBetweenUsers: vi.fn(async () => null),
        createPendingRequest: vi.fn(async () => request),
        acceptPendingRequest,
      },
      connectionRepository: {
        listVerifiedContactIds: vi.fn(async () => ["usr_connected"]),
        findFirstBetweenUsers: vi.fn(async () => connection),
        createVerifiedConnection: vi.fn(async () => connection),
      },
      userRepository: {
        findById: vi.fn(async () => null),
        listDemoUsers: vi.fn(async () => []),
      },
      verifiedInteractionService: {
        recordInteraction,
      },
      idGenerator: {
        connectionId: vi.fn(() => "conn_generated"),
        requestId: vi.fn(() => "req_generated"),
      },
    });

    const result = await service.acceptRequest("usr_recipient", request.id);

    expect(acceptPendingRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: request.id,
        recipientUserId: "usr_recipient",
        metadata: {
          source: "connection_request_acceptance",
          acceptedWithoutFlare: true,
        },
      }),
    );
    expect(recordInteraction).toHaveBeenCalledWith(
      expect.objectContaining({
        interactionType: "INTRO_ACCEPTED",
        actorUserId: "usr_recipient",
        targetUserId: "usr_requester",
        rewardStatus: "REWARDABLE",
      }),
    );
    expect(result.request.status).toBe("accepted");
    expect(result.connection.id).toBe("conn_accepted");
    expect(result.interaction?.id).toBe("int_intro_accepted");
  });

  it("reuses an already accepted request without creating a second interaction", async () => {
    const acceptedRequest = createRequest({
      status: "accepted",
      acceptedConnectionId: "conn_existing",
      respondedAt: "2026-04-01T09:05:00.000Z",
    });
    const recordInteraction = vi.fn();
    const acceptPendingRequest = vi.fn();

    const service = createConnectionRequestService({
      connectionRequestRepository: {
        listIncomingPendingByUserId: vi.fn(async () => []),
        listOutgoingPendingContactIdsByUserId: vi.fn(async () => []),
        findIncomingById: vi.fn(async () => acceptedRequest),
        findPendingBetweenUsers: vi.fn(async () => null),
        createPendingRequest: vi.fn(async () => acceptedRequest),
        acceptPendingRequest,
      },
      connectionRepository: {
        listVerifiedContactIds: vi.fn(async () => []),
        findFirstBetweenUsers: vi.fn(async () => createConnection({ id: "conn_existing" })),
        createVerifiedConnection: vi.fn(async () => createConnection({ id: "conn_existing" })),
      },
      userRepository: {
        findById: vi.fn(async () => null),
        listDemoUsers: vi.fn(async () => []),
      },
      verifiedInteractionService: {
        recordInteraction,
      },
      idGenerator: {
        connectionId: vi.fn(() => "conn_generated"),
        requestId: vi.fn(() => "req_generated"),
      },
    });

    const result = await service.acceptRequest("usr_recipient", acceptedRequest.id);

    expect(acceptPendingRequest).not.toHaveBeenCalled();
    expect(recordInteraction).not.toHaveBeenCalled();
    expect(result.connection.id).toBe("conn_existing");
    expect(result.interaction).toBeNull();
  });
});
