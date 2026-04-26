import { Prisma } from "@/lib/server/prisma-client";
import { prisma } from "@/lib/server/prisma";
import { normalizeUserRole } from "@/lib/roles";
import type { ConnectionRequestSummary, ContractGenerationMode, UserRole } from "@/lib/types";

const connectionType = {
  intro: "INTRO",
  consulting: "CONSULTING",
  mentorship: "MENTORSHIP",
  investment: "INVESTMENT",
  endorsement: "ENDORSEMENT",
} as const;

const connectionRequestStatus = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  DECLINED: "DECLINED",
} as const;

type ConnectionRequestRecord = Awaited<
  ReturnType<typeof prisma.connectionRequest.findFirstOrThrow>
> & {
  requester: {
    id: string;
    name: string;
    email: string;
    role: string;
    linkedinUrl: string | null;
    memberships: Array<{
      company: {
        name: string;
      };
    }>;
  };
};

function toConnectionRequestSummary(request: ConnectionRequestRecord): ConnectionRequestSummary {
  return {
    id: request.id,
    requesterUserId: request.requesterUserId,
    recipientUserId: request.recipientUserId,
    requesterName: request.requester.name,
    requesterRole: normalizeUserRole(request.requester.role) as UserRole,
    requesterCompany: request.requester.memberships[0]?.company.name ?? null,
    requesterContact: request.requester.email,
    requesterLinkedinUrl: request.requester.linkedinUrl ?? null,
    type: request.type.toLowerCase() as ConnectionRequestSummary["type"],
    status: request.status.toLowerCase() as ConnectionRequestSummary["status"],
    message: request.message ?? null,
    acceptedConnectionId: request.acceptedConnectionId ?? null,
    contractAddress: request.contractAddress ?? null,
    contractNetwork: request.contractNetwork ?? null,
    generationMode: request.generationMode?.toLowerCase() as ContractGenerationMode | null,
    contractTxHash: request.contractTxHash ?? null,
    metadata: (request.metadata as Record<string, unknown> | null | undefined) ?? null,
    createdAt: request.createdAt.toISOString(),
    respondedAt: request.respondedAt?.toISOString() ?? null,
  };
}

export const connectionRequestRepository = {
  async listIncomingPendingByUserId(userId: string): Promise<ConnectionRequestSummary[]> {
    const requests = await prisma.connectionRequest.findMany({
      where: {
        recipientUserId: userId,
        status: connectionRequestStatus.PENDING,
      },
      include: {
        requester: {
          include: {
            memberships: {
              include: {
                company: true,
              },
              orderBy: { createdAt: "asc" },
              take: 1,
            },
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
    });

    return requests.map(toConnectionRequestSummary);
  },

  async listOutgoingPendingContactIdsByUserId(userId: string): Promise<string[]> {
    const requests = await prisma.connectionRequest.findMany({
      where: {
        requesterUserId: userId,
        status: connectionRequestStatus.PENDING,
      },
      select: {
        recipientUserId: true,
      },
    });

    return Array.from(
      new Set(requests.map((request: { recipientUserId: string }) => request.recipientUserId)),
    );
  },

  async findIncomingById(recipientUserId: string, requestId: string): Promise<ConnectionRequestSummary | null> {
    const request = await prisma.connectionRequest.findFirst({
      where: {
        id: requestId,
        recipientUserId,
      },
      include: {
        requester: {
          include: {
            memberships: {
              include: {
                company: true,
              },
              orderBy: { createdAt: "asc" },
              take: 1,
            },
          },
        },
      },
    });

    return request ? toConnectionRequestSummary(request) : null;
  },

  async findPendingBetweenUsers(userAId: string, userBId: string): Promise<ConnectionRequestSummary | null> {
    const request = await prisma.connectionRequest.findFirst({
      where: {
        status: connectionRequestStatus.PENDING,
        OR: [
          {
            requesterUserId: userAId,
            recipientUserId: userBId,
          },
          {
            requesterUserId: userBId,
            recipientUserId: userAId,
          },
        ],
      },
      include: {
        requester: {
          include: {
            memberships: {
              include: {
                company: true,
              },
              orderBy: { createdAt: "asc" },
              take: 1,
            },
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
    });

    return request ? toConnectionRequestSummary(request) : null;
  },

  async createPendingRequest(input: {
    id: string;
    requesterUserId: string;
    recipientUserId: string;
    type: ConnectionRequestSummary["type"];
    message?: string | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<ConnectionRequestSummary> {
    const request = await prisma.connectionRequest.create({
      data: {
        id: input.id,
        requesterUserId: input.requesterUserId,
        recipientUserId: input.recipientUserId,
        type: connectionType[input.type],
        status: connectionRequestStatus.PENDING,
        message: input.message?.trim() ? input.message.trim() : null,
        metadata: input.metadata === null ? Prisma.JsonNull : ((input.metadata ?? undefined) as Prisma.InputJsonValue | undefined),
      },
      include: {
        requester: {
          include: {
            memberships: {
              include: {
                company: true,
              },
              orderBy: { createdAt: "asc" },
              take: 1,
            },
          },
        },
      },
    });

    return toConnectionRequestSummary(request);
  },

  async acceptPendingRequest(input: {
    requestId: string;
    recipientUserId: string;
    connectionId: string;
    contractAddress?: string | null;
    contractNetwork?: string | null;
    generationMode?: "MOCK" | "REAL" | null;
    contractTxHash?: string | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<ConnectionRequestSummary | null> {
    const existingRequest = await prisma.connectionRequest.findFirst({
      where: {
        id: input.requestId,
        recipientUserId: input.recipientUserId,
      },
      include: {
        requester: {
          include: {
            memberships: {
              include: {
                company: true,
              },
              orderBy: { createdAt: "asc" },
              take: 1,
            },
          },
        },
      },
    });

    if (!existingRequest) {
      return null;
    }

    if (existingRequest.status === connectionRequestStatus.ACCEPTED) {
      return toConnectionRequestSummary(existingRequest);
    }

    if (existingRequest.status !== connectionRequestStatus.PENDING) {
      return toConnectionRequestSummary(existingRequest);
    }

    const existingConnection = await prisma.connection.findFirst({
      where: {
        OR: [
          {
            sourceUserId: existingRequest.requesterUserId,
            targetUserId: existingRequest.recipientUserId,
          },
          {
            sourceUserId: existingRequest.recipientUserId,
            targetUserId: existingRequest.requesterUserId,
          },
        ],
      },
      orderBy: [{ verified: "desc" }, { createdAt: "asc" }],
    });

    const connectionId = existingConnection?.id ?? input.connectionId;

    if (!existingConnection) {
      await prisma.connection.create({
        data: {
          id: connectionId,
          sourceUserId: existingRequest.requesterUserId,
          targetUserId: existingRequest.recipientUserId,
          type: existingRequest.type,
          verified: true,
          note: existingRequest.message ?? "Accepted Meshed connection request",
        },
      });
    } else if (!existingConnection.verified) {
      await prisma.connection.update({
        where: { id: existingConnection.id },
        data: {
          verified: true,
          note: existingConnection.note ?? existingRequest.message ?? "Accepted Meshed connection request",
        },
      });
    }

    const updateResult = await prisma.connectionRequest.updateMany({
      where: {
        id: existingRequest.id,
        status: connectionRequestStatus.PENDING,
      },
      data: {
        status: connectionRequestStatus.ACCEPTED,
        acceptedConnectionId: connectionId,
        contractAddress: input.contractAddress ?? null,
        contractNetwork: input.contractNetwork ?? null,
        generationMode: input.generationMode ?? null,
        contractTxHash: input.contractTxHash ?? null,
        metadata: ({
          ...((existingRequest.metadata as Record<string, unknown> | null | undefined) ?? {}),
          ...((input.metadata ?? {}) as Record<string, unknown>),
        }) as Prisma.InputJsonValue,
        respondedAt: new Date(),
      },
    });

    if (updateResult.count === 0) {
      const latestRequest = await prisma.connectionRequest.findFirst({
        where: {
          id: input.requestId,
          recipientUserId: input.recipientUserId,
        },
        include: {
          requester: {
            include: {
              memberships: {
                include: {
                  company: true,
                },
                orderBy: { createdAt: "asc" },
                take: 1,
              },
            },
          },
        },
      });

      return latestRequest ? toConnectionRequestSummary(latestRequest) : null;
    }

    const request = await prisma.connectionRequest.findFirst({
      where: {
        id: existingRequest.id,
      },
      include: {
        requester: {
          include: {
            memberships: {
              include: {
                company: true,
              },
              orderBy: { createdAt: "asc" },
              take: 1,
            },
          },
        },
      },
    });

    return request ? toConnectionRequestSummary(request) : null;
  },
};
