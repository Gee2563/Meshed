import { describe, expect, it, vi } from "vitest";

import { createConnectionRequestService } from "@/lib/server/services/connection-request-service";
import type { ConnectionRequestSummary, ConnectionSummary, UserSummary } from "@/lib/types";

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

describe("connection request service", () => {
  it("creates a pending request for an available Meshed member", async () => {
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
      managedWalletService: {
        ensureWalletForUser: vi.fn(async () => createUser()),
      },
      connectionContractService: {
        deployConnectionAgreement: vi.fn(async () => ({
          contractAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          network: "flare-coston2",
          generationMode: "REAL" as const,
        })),
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
    });
    expect(created.id).toBe("req_1");
    expect(created.recipientUserId).toBe("usr_recipient");
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
      managedWalletService: {
        ensureWalletForUser: vi.fn(async () => currentUser),
      },
      connectionContractService: {
        deployConnectionAgreement: vi.fn(async () => ({
          contractAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          network: "flare-coston2",
          generationMode: "REAL" as const,
        })),
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

  it("accepts a pending request and returns the Flare-backed connection details", async () => {
    const request = createRequest();
    const requester = createUser({
      id: "usr_requester",
      name: "Nina Volkov",
      email: "nina@northmesh.io",
      role: "consultant",
      walletAddress: "0x2222222222222222222222222222222222222222",
    });
    const recipient = createUser({
      id: "usr_recipient",
      name: "Maya Sterling",
      email: "maya@northstar.vc",
      role: "company",
      walletAddress: "0x3333333333333333333333333333333333333333",
    });
    const deployConnectionAgreement = vi.fn(async () => ({
      contractAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      network: "flare-coston2",
      generationMode: "REAL" as const,
      transactionHash: "0xflaretx",
      metadata: {
        chainId: 114,
      },
    }));
    const acceptPendingRequest = vi.fn(async () =>
      createRequest({
        status: "accepted",
        acceptedConnectionId: "conn_accepted",
        contractAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        contractNetwork: "flare-coston2",
        generationMode: "real",
        contractTxHash: "0xflaretx",
        metadata: {
          source: "connection_request",
        },
        respondedAt: "2026-04-01T09:05:00.000Z",
      }),
    );
    const findFirstBetweenUsers = vi.fn(async () => createConnection({ id: "conn_accepted" }));

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
        findFirstBetweenUsers,
        createVerifiedConnection: vi.fn(async () => createConnection()),
      },
      userRepository: {
        findById: vi.fn(async () => null),
        listDemoUsers: vi.fn(async () => []),
      },
      managedWalletService: {
        ensureWalletForUser: vi.fn(async (userId: string) => (userId === requester.id ? requester : recipient)),
      },
      connectionContractService: {
        deployConnectionAgreement,
      },
      idGenerator: {
        connectionId: vi.fn(() => "conn_generated"),
        requestId: vi.fn(() => "req_generated"),
      },
    });

    const result = await service.acceptRequest("usr_recipient", request.id);

    expect(deployConnectionAgreement).toHaveBeenCalledOnce();
    expect(acceptPendingRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: request.id,
        recipientUserId: "usr_recipient",
        contractAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        contractTxHash: "0xflaretx",
      }),
    );
    expect(result.request.status).toBe("accepted");
    expect(result.request.contractAddress).toBe("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    expect(result.connection.id).toBe("conn_accepted");
  });

  it("reuses an already accepted request without deploying a second contract", async () => {
    const acceptedRequest = createRequest({
      status: "accepted",
      acceptedConnectionId: "conn_existing",
      contractAddress: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      contractNetwork: "flare-coston2",
      generationMode: "real",
      respondedAt: "2026-04-01T09:05:00.000Z",
    });
    const deployConnectionAgreement = vi.fn();

    const service = createConnectionRequestService({
      connectionRequestRepository: {
        listIncomingPendingByUserId: vi.fn(async () => []),
        listOutgoingPendingContactIdsByUserId: vi.fn(async () => []),
        findIncomingById: vi.fn(async () => acceptedRequest),
        findPendingBetweenUsers: vi.fn(async () => null),
        createPendingRequest: vi.fn(async () => acceptedRequest),
        acceptPendingRequest: vi.fn(async () => acceptedRequest),
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
      managedWalletService: {
        ensureWalletForUser: vi.fn(async () => createUser()),
      },
      connectionContractService: {
        deployConnectionAgreement,
      },
      idGenerator: {
        connectionId: vi.fn(() => "conn_generated"),
        requestId: vi.fn(() => "req_generated"),
      },
    });

    const result = await service.acceptRequest("usr_recipient", acceptedRequest.id);

    expect(deployConnectionAgreement).not.toHaveBeenCalled();
    expect(result.request.contractAddress).toBe("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
    expect(result.connection.id).toBe("conn_existing");
  });
});
