import { randomUUID } from "node:crypto";

import { ApiError } from "@/lib/server/http";
import { connectionRepository } from "@/lib/server/repositories/connection-repository";
import { connectionRequestRepository } from "@/lib/server/repositories/connection-request-repository";
import { userRepository } from "@/lib/server/repositories/user-repository";
import { connectionContractService } from "@/lib/server/services/connection-contract-service";
import { managedWalletService } from "@/lib/server/services/managed-wallet-service";
import type { ConnectionRequestSummary, ConnectionSummary, UserSummary } from "@/lib/types";

export type ConnectionDashboardState = {
  pendingIncomingRequests: ConnectionRequestSummary[];
  connectedContactIds: string[];
  outgoingPendingContactIds: string[];
};

export type AcceptConnectionRequestResult = {
  request: ConnectionRequestSummary;
  connection: ConnectionSummary;
};

export type CreateConnectionRequestInput = {
  recipientUserId: string;
  type: ConnectionSummary["type"];
  message?: string | null;
};

type ConnectionRequestServiceDependencies = {
  connectionRequestRepository: {
    listIncomingPendingByUserId(userId: string): Promise<ConnectionRequestSummary[]>;
    listOutgoingPendingContactIdsByUserId(userId: string): Promise<string[]>;
    findIncomingById(recipientUserId: string, requestId: string): Promise<ConnectionRequestSummary | null>;
    findPendingBetweenUsers(userAId: string, userBId: string): Promise<ConnectionRequestSummary | null>;
    createPendingRequest(input: {
      id: string;
      requesterUserId: string;
      recipientUserId: string;
      type: ConnectionSummary["type"];
      message?: string | null;
    }): Promise<ConnectionRequestSummary>;
    acceptPendingRequest(input: {
      requestId: string;
      recipientUserId: string;
      connectionId: string;
      contractAddress: string;
      contractNetwork: string;
      generationMode: "MOCK" | "REAL";
      contractTxHash?: string | null;
      metadata?: Record<string, unknown> | null;
    }): Promise<ConnectionRequestSummary | null>;
  };
  connectionRepository: {
    listVerifiedContactIds(userId: string): Promise<string[]>;
    findFirstBetweenUsers(userAId: string, userBId: string): Promise<ConnectionSummary | null>;
    createVerifiedConnection(input: {
      id: string;
      sourceUserId: string;
      targetUserId: string;
      type: ConnectionSummary["type"];
      note?: string | null;
    }): Promise<ConnectionSummary>;
  };
  userRepository: {
    findById(userId: string): Promise<UserSummary | null>;
    listDemoUsers(): Promise<UserSummary[]>;
  };
  managedWalletService: {
    ensureWalletForUser(userId: string): Promise<UserSummary>;
  };
  connectionContractService: {
    deployConnectionAgreement(input: {
      requester: UserSummary;
      recipient: UserSummary;
      request: ConnectionRequestSummary;
    }): Promise<{
      contractAddress: string;
      network: string;
      generationMode: "MOCK" | "REAL";
      transactionHash?: string | null;
      metadata?: Record<string, unknown> | null;
    }>;
  };
  idGenerator: {
    connectionId(): string;
    requestId(): string;
  };
};

function seedRequestMessage(role: UserSummary["role"], currentUserName: string) {
  if (role === "mentor") {
    return `I'd like to formalize a Meshed mentorship line with ${currentUserName} so the support path can move onto Flare.`;
  }
  if (role === "investor") {
    return `Let's open a contract-backed Meshed relationship with ${currentUserName} for the next portfolio support workflow.`;
  }
  if (role === "consultant") {
    return `Would love to connect directly with ${currentUserName} on Meshed and turn this into a verified consulting thread.`;
  }
  if (role === "operator") {
    return `I'm available to connect with ${currentUserName} on Meshed for the next redeployment and onboarding sprint.`;
  }
  return `Let's connect directly on Meshed so this relationship can be recorded on Flare.`;
}

function connectionTypeForRole(role: UserSummary["role"]): ConnectionSummary["type"] {
  if (role === "mentor") {
    return "mentorship";
  }
  if (role === "investor") {
    return "investment";
  }
  if (role === "consultant") {
    return "consulting";
  }
  if (role === "admin") {
    return "endorsement";
  }
  return "intro";
}

function seededDashboardTargets(user: UserSummary) {
  if (user.email.trim().toLowerCase() === "georgegds92@gmail.com") {
    return {
      connected: 3,
      inbound: 3,
      outgoing: 2,
    };
  }

  return {
    connected: 1,
    inbound: 2,
    outgoing: 1,
  };
}

export function createConnectionRequestService(deps: ConnectionRequestServiceDependencies) {
  return {
    async getDashboardState(userId: string): Promise<ConnectionDashboardState> {
      const [pendingIncomingRequests, connectedContactIds, outgoingPendingContactIds] = await Promise.all([
        deps.connectionRequestRepository.listIncomingPendingByUserId(userId),
        deps.connectionRepository.listVerifiedContactIds(userId),
        deps.connectionRequestRepository.listOutgoingPendingContactIdsByUserId(userId),
      ]);

      return {
        pendingIncomingRequests,
        connectedContactIds,
        outgoingPendingContactIds,
      };
    },

    async createRequest(requesterUserId: string, input: CreateConnectionRequestInput) {
      if (requesterUserId === input.recipientUserId) {
        throw new ApiError(400, "You cannot send a Meshed connection request to yourself.");
      }

      const [requester, recipient, existingConnection, existingPendingRequest] = await Promise.all([
        deps.userRepository.findById(requesterUserId),
        deps.userRepository.findById(input.recipientUserId),
        deps.connectionRepository.findFirstBetweenUsers(requesterUserId, input.recipientUserId),
        deps.connectionRequestRepository.findPendingBetweenUsers(requesterUserId, input.recipientUserId),
      ]);

      if (!requester || !recipient) {
        throw new ApiError(404, "The selected Meshed member could not be found.");
      }

      if (existingConnection?.verified) {
        throw new ApiError(409, "This Meshed connection is already verified.");
      }

      if (existingPendingRequest) {
        if (existingPendingRequest.requesterUserId === requesterUserId) {
          throw new ApiError(409, "A Meshed connection request is already pending for this member.");
        }
        throw new ApiError(409, "This member already sent you a connection request. Accept it instead.");
      }

      return deps.connectionRequestRepository.createPendingRequest({
        id: deps.idGenerator.requestId(),
        requesterUserId,
        recipientUserId: input.recipientUserId,
        type: input.type,
        message: input.message,
      });
    },

    async ensureDemoState(userId: string): Promise<ConnectionDashboardState> {
      const currentUser = await deps.userRepository.findById(userId);
      const state = await this.getDashboardState(userId);
      if (!currentUser) {
        return state;
      }

      const targets = seededDashboardTargets(currentUser);
      const demoUsers = await deps.userRepository.listDemoUsers();
      const candidates = demoUsers
        .filter((user) => user.id !== userId)
        .filter((user) => user.role !== "company" && user.role !== "admin")
        .sort((left, right) => right.engagementScore - left.engagementScore);

      const existingIncomingIds = new Set(state.pendingIncomingRequests.map((request) => request.requesterUserId));
      const existingConnectedIds = new Set(state.connectedContactIds);
      const existingOutgoingIds = new Set(state.outgoingPendingContactIds);

      for (const connectedCandidate of candidates) {
        if (existingConnectedIds.size >= targets.connected) {
          break;
        }

        if (existingConnectedIds.has(connectedCandidate.id) || existingIncomingIds.has(connectedCandidate.id)) {
          continue;
        }

        const existingConnection = await deps.connectionRepository.findFirstBetweenUsers(userId, connectedCandidate.id);
        if (!existingConnection) {
          await deps.connectionRepository.createVerifiedConnection({
            id: deps.idGenerator.connectionId(),
            sourceUserId: connectedCandidate.id,
            targetUserId: userId,
            type: connectionTypeForRole(connectedCandidate.role),
            note: "Seeded Meshed demo connection",
          });
        }
        existingConnectedIds.add(connectedCandidate.id);
      }

      for (const candidate of candidates) {
        if (existingIncomingIds.size >= targets.inbound) {
          break;
        }

        if (
          existingIncomingIds.has(candidate.id) ||
          existingConnectedIds.has(candidate.id) ||
          existingOutgoingIds.has(candidate.id)
        ) {
          continue;
        }

        const [existingConnection, existingPending] = await Promise.all([
          deps.connectionRepository.findFirstBetweenUsers(userId, candidate.id),
          deps.connectionRequestRepository.findPendingBetweenUsers(userId, candidate.id),
        ]);

        if (!existingConnection && !existingPending) {
          await deps.connectionRequestRepository.createPendingRequest({
            id: deps.idGenerator.requestId(),
            requesterUserId: candidate.id,
            recipientUserId: userId,
            type: connectionTypeForRole(candidate.role),
            message: seedRequestMessage(candidate.role, currentUser.name),
          });
          existingIncomingIds.add(candidate.id);
        }
      }

      for (const outgoingCandidate of candidates) {
        if (existingOutgoingIds.size >= targets.outgoing) {
          break;
        }

        if (
          existingIncomingIds.has(outgoingCandidate.id) ||
          existingConnectedIds.has(outgoingCandidate.id) ||
          existingOutgoingIds.has(outgoingCandidate.id)
        ) {
          continue;
        }

        const [existingConnection, existingPending] = await Promise.all([
          deps.connectionRepository.findFirstBetweenUsers(userId, outgoingCandidate.id),
          deps.connectionRequestRepository.findPendingBetweenUsers(userId, outgoingCandidate.id),
        ]);

        if (!existingConnection && !existingPending) {
          await deps.connectionRequestRepository.createPendingRequest({
            id: deps.idGenerator.requestId(),
            requesterUserId: userId,
            recipientUserId: outgoingCandidate.id,
            type: connectionTypeForRole(outgoingCandidate.role),
            message: `I'd like to open a direct Meshed connection with ${outgoingCandidate.name} for the next portfolio workflow.`,
          });
          existingOutgoingIds.add(outgoingCandidate.id);
        }
      }

      return this.getDashboardState(userId);
    },

    async acceptRequest(recipientUserId: string, requestId: string): Promise<AcceptConnectionRequestResult> {
      const request = await deps.connectionRequestRepository.findIncomingById(recipientUserId, requestId);
      if (!request) {
        throw new ApiError(404, "Connection request not found.");
      }

      if (request.status === "accepted") {
        const existingConnection = await deps.connectionRepository.findFirstBetweenUsers(
          request.requesterUserId,
          request.recipientUserId,
        );
        if (!existingConnection) {
          throw new ApiError(409, "Connection request was already accepted, but the linked connection record is missing.");
        }

        return {
          request,
          connection: existingConnection,
        };
      }

      if (request.status !== "pending") {
        throw new ApiError(409, "Connection request is no longer pending.");
      }

      const [requester, recipient] = await Promise.all([
        deps.managedWalletService.ensureWalletForUser(request.requesterUserId),
        deps.managedWalletService.ensureWalletForUser(request.recipientUserId),
      ]);

      const deployment = await deps.connectionContractService.deployConnectionAgreement({
        requester,
        recipient,
        request,
      });

      const acceptedRequest = await deps.connectionRequestRepository.acceptPendingRequest({
        requestId,
        recipientUserId,
        connectionId: deps.idGenerator.connectionId(),
        contractAddress: deployment.contractAddress,
        contractNetwork: deployment.network,
        generationMode: deployment.generationMode,
        contractTxHash: deployment.transactionHash ?? null,
        metadata: {
          source: "connection_request",
          requesterWallet: requester.walletAddress ?? null,
          recipientWallet: recipient.walletAddress ?? null,
          transactionHash: deployment.transactionHash ?? null,
          ...(deployment.metadata ?? {}),
        },
      });

      if (!acceptedRequest) {
        throw new ApiError(404, "Connection request not found.");
      }

      if (acceptedRequest.status !== "accepted") {
        throw new ApiError(409, "Connection request is no longer pending.");
      }

      const connection = await deps.connectionRepository.findFirstBetweenUsers(
        acceptedRequest.requesterUserId,
        acceptedRequest.recipientUserId,
      );

      if (!connection) {
        throw new ApiError(500, "The connection request was accepted, but the verified connection could not be loaded.");
      }

      return {
        request: acceptedRequest,
        connection,
      };
    },
  };
}

export const connectionRequestService = createConnectionRequestService({
  connectionRequestRepository,
  connectionRepository,
  userRepository,
  managedWalletService,
  connectionContractService,
  idGenerator: {
    connectionId: () => `conn_${randomUUID().replace(/-/g, "").slice(0, 12)}`,
    requestId: () => `req_${randomUUID().replace(/-/g, "").slice(0, 12)}`,
  },
});
