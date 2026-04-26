import { prisma } from "@/lib/server/prisma";
import { Prisma } from "@/lib/server/prisma-client";
import { toNetworkPreparationJobSummary } from "@/lib/server/repositories/mappers";

export const networkPreparationJobRepository = {
  async create(data: {
    id: string;
    userId: string;
    vcCompanyId?: string | null;
    sourceWebsite: string;
    status?: "QUEUED" | "RUNNING" | "READY" | "FAILED";
    statusMessage?: string | null;
  }) {
    const job = await prisma.networkPreparationJob.create({
      data: {
        id: data.id,
        userId: data.userId,
        vcCompanyId: data.vcCompanyId ?? null,
        sourceWebsite: data.sourceWebsite,
        status: data.status ?? "QUEUED",
        statusMessage: data.statusMessage ?? null,
      },
    });

    return toNetworkPreparationJobSummary(job);
  },

  async findLatestByUserId(userId: string) {
    const job = await prisma.networkPreparationJob.findFirst({
      where: { userId },
      orderBy: [{ createdAt: "desc" }],
    });

    return job ? toNetworkPreparationJobSummary(job) : null;
  },

  async findById(id: string) {
    const job = await prisma.networkPreparationJob.findUnique({
      where: { id },
    });

    return job ? toNetworkPreparationJobSummary(job) : null;
  },

  async updateStatus(
    id: string,
    data: {
      status: "QUEUED" | "RUNNING" | "READY" | "FAILED";
      statusMessage?: string | null;
      outputPath?: string | null;
      result?: Record<string, unknown> | null;
      errorMessage?: string | null;
      startedAt?: Date | null;
      completedAt?: Date | null;
    },
  ) {
    const job = await prisma.networkPreparationJob.update({
      where: { id },
      data: {
        status: data.status,
        statusMessage: data.statusMessage,
        outputPath: data.outputPath,
        result:
          data.result === undefined
            ? undefined
            : data.result === null
              ? Prisma.JsonNull
              : (data.result as Prisma.InputJsonValue),
        errorMessage: data.errorMessage,
        startedAt: data.startedAt === undefined ? undefined : data.startedAt,
        completedAt: data.completedAt === undefined ? undefined : data.completedAt,
      },
    });

    return toNetworkPreparationJobSummary(job);
  },
};
