import { randomUUID } from "node:crypto";

import { ApiError } from "@/lib/server/http";
import { connectionRepository } from "@/lib/server/repositories/connection-repository";
import { connectionRequestRepository } from "@/lib/server/repositories/connection-request-repository";
import { userRepository } from "@/lib/server/repositories/user-repository";
import { verifiedInteractionService } from "@/lib/server/services/verified-interaction-service";
import type {
  ConnectionRequestSummary,
  ConnectionSummary,
  UserSummary,
  VerifiedInteractionSummary,
} from "@/lib/types";

export type ConnectionDashboardState = {
  pendingIncomingRequests: ConnectionRequestSummary[];
  connectedContactIds: string[];
  outgoingPendingContactIds: string[];
};

export type CreateConnectionRequestInput = {
  recipientUserId: string;
  type: ConnectionSummary["type"];
  message?: string | null;
  companyId?: string | null;
  painPointTag?: string | null;
  matchScore?: number | null;
  metadata?: Record<string, unknown> | null;
};

export type CreateConnectionRequestResult = {
  request: ConnectionRequestSummary;
  interaction: VerifiedInteractionSummary;
};

export type AcceptConnectionRequestResult = {
  request: ConnectionRequestSummary;
  connection: ConnectionSummary;
  interaction: VerifiedInteractionSummary | null;
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
      metadata?: Record<string, unknown> | null;
    }): Promise<ConnectionRequestSummary>;
    acceptPendingRequest(input: {
      requestId: string;
      recipientUserId: string;
      connectionId: string;
      contractAddress?: string | null;
      contractNetwork?: string | null;
      generationMode?: "MOCK" | "REAL" | null;
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
  verifiedInteractionService: {
    recordInteraction(input: {
      interactionType: VerifiedInteractionSummary["interactionType"];
      actorUserId: string;
      targetUserId?: string | null;
      companyId?: string | null;
      painPointTag?: string | null;
      matchScore?: number | null;
      rewardStatus?: VerifiedInteractionSummary["rewardStatus"];
      metadata?: Record<string, unknown> | null;
    }): Promise<VerifiedInteractionSummary>;
  };
  idGenerator: {
    connectionId(): string;
    requestId(): string;
  };
};

function seedRequestMessage(role: UserSummary["role"], currentUserName: string) {
  if (role === "mentor") {
    return `I'd like to open a World-backed mentorship thread with ${currentUserName} on Meshed.`;
  }
  if (role === "investor") {
    return `Let's open a verified intro with ${currentUserName} for the next portfolio support workflow.`;
  }
  if (role === "consultant") {
    return `Would love to connect directly with ${currentUserName} on Meshed and continue this as a verified consulting thread.`;
  }
  if (role === "operator") {
    return `I'm available to connect with ${currentUserName} on Meshed for the next redeployment and onboarding sprint.`;
  }
  return `Let's connect directly on Meshed through the World-backed trust layer.`;
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

    async createRequest(requesterUserId: string, input: CreateConnectionRequestInput): Promise<CreateConnectionRequestResult> {
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

      const request = await deps.connectionRequestRepository.createPendingRequest({
        id: deps.idGenerator.requestId(),
        requesterUserId,
        recipientUserId: input.recipientUserId,
        type: input.type,
        message: input.message,
        metadata: {
          source: "connection_request",
          companyId: input.companyId ?? null,
          painPointTag: input.painPointTag ?? null,
          matchScore: input.matchScore ?? null,
          ...(input.metadata ?? {}),
        },
      });

      const interaction = await deps.verifiedInteractionService.recordInteraction({
        interactionType: "INTRO_REQUESTED",
        actorUserId: requester.id,
        targetUserId: recipient.id,
        companyId: input.companyId ?? null,
        painPointTag: input.painPointTag ?? null,
        matchScore: input.matchScore ?? null,
        metadata: {
          source: "connection_request",
          requestId: request.id,
          connectionType: request.type,
          message: request.message ?? null,
          ...(request.metadata ?? {}),
        },
      });

      return {
        request,
        interaction,
      };
    },

    async ensureDemoState(userId: string): Promise<ConnectionDashboardState> {
      const currentUser = await deps.userRepository.findById(userId);
      const state = await this.getDashboardState(userId);
      if (!currentUser) {
        return state;
      }

      const demoUsers = await deps.userRepository.listDemoUsers();
      const candidates = demoUsers
        .filter((user) => user.id !== userId)
        .filter((user) => user.role !== "company" && user.role !== "admin")
        .sort((left, right) => right.engagementScore - left.engagementScore);

      const existingIncomingIds = new Set(state.pendingIncomingRequests.map((request) => request.requesterUserId));
      const existingConnectedIds = new Set(state.connectedContactIds);
      const existingOutgoingIds = new Set(state.outgoingPendingContactIds);

      if (existingConnectedIds.size < 1) {
        const connectedCandidate = candidates.find((candidate) => !existingConnectedIds.has(candidate.id));

        if (connectedCandidate) {
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
      }

      const inboundTargetCount = 2;
      for (const candidate of candidates) {
        if (existingIncomingIds.size >= inboundTargetCount) {
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
            metadata: {
              source: "seeded_demo_request",
            },
          });
          existingIncomingIds.add(candidate.id);
        }
      }

      if (existingOutgoingIds.size < 1) {
        const outgoingCandidate = candidates.find(
          (candidate) =>
            !existingIncomingIds.has(candidate.id) &&
            !existingConnectedIds.has(candidate.id) &&
            !existingOutgoingIds.has(candidate.id),
        );

        if (outgoingCandidate) {
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
              message: `I'd like to open a verified Meshed connection with ${outgoingCandidate.name} for the next portfolio workflow.`,
              metadata: {
                source: "seeded_demo_request",
              },
            });
            existingOutgoingIds.add(outgoingCandidate.id);
          }
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
          interaction: null,
        };
      }

      if (request.status !== "pending") {
        throw new ApiError(409, "Connection request is no longer pending.");
      }

      const acceptedRequest = await deps.connectionRequestRepository.acceptPendingRequest({
        requestId,
        recipientUserId,
        connectionId: deps.idGenerator.connectionId(),
        metadata: {
          source: "connection_request_acceptance",
          acceptedWithoutFlare: true,
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

      const interaction = await deps.verifiedInteractionService.recordInteraction({
        interactionType: "INTRO_ACCEPTED",
        actorUserId: acceptedRequest.recipientUserId,
        targetUserId: acceptedRequest.requesterUserId,
        rewardStatus: "REWARDABLE",
        metadata: {
          source: "connection_request_acceptance",
          requestId: acceptedRequest.id,
          acceptedConnectionId: connection.id,
          message: acceptedRequest.message ?? null,
          ...(acceptedRequest.metadata ?? {}),
        },
      });

      return {
        request: acceptedRequest,
        connection,
        interaction,
      };
    },
  };
}

export const connectionRequestService = createConnectionRequestService({
  connectionRequestRepository,
  connectionRepository,
  userRepository,
  verifiedInteractionService,
  idGenerator: {
    connectionId: () => `conn_${randomUUID().replace(/-/g, "").slice(0, 12)}`,
    requestId: () => `req_${randomUUID().replace(/-/g, "").slice(0, 12)}`,
  },
});
