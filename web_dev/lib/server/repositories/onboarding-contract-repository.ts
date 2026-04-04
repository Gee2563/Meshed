import { prisma } from "@/lib/server/prisma";
import type { OnboardingContractArtifactSummary } from "@/lib/types";

function toSummary(
  artifact: Awaited<ReturnType<typeof prisma.onboardingContractArtifact.findFirstOrThrow>>,
): OnboardingContractArtifactSummary {
  return {
    id: artifact.id,
    userId: artifact.userId,
    companyId: artifact.companyId,
    contractStep: artifact.contractStep.toLowerCase() as OnboardingContractArtifactSummary["contractStep"],
    contractName: artifact.contractName,
    contractAddress: artifact.contractAddress,
    network: artifact.network,
    generationMode: artifact.generationMode.toLowerCase() as OnboardingContractArtifactSummary["generationMode"],
    metadata: (artifact.metadata ?? null) as OnboardingContractArtifactSummary["metadata"],
    createdAt: artifact.createdAt.toISOString(),
  };
}

export const onboardingContractRepository = {
  async listByUserId(userId: string) {
    const artifacts = await prisma.onboardingContractArtifact.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });

    return artifacts.map(toSummary);
  },

  async create(data: {
    id: string;
    userId: string;
    companyId?: string | null;
    contractStep: "WORLD_VERIFIED";
    contractName: string;
    contractAddress: string;
    network: string;
    generationMode?: "MOCK" | "REAL";
    metadata?: Record<string, unknown> | null;
  }) {
    const artifact = await prisma.onboardingContractArtifact.create({
      data: {
        id: data.id,
        userId: data.userId,
        companyId: data.companyId ?? null,
        contractStep: data.contractStep,
        contractName: data.contractName,
        contractAddress: data.contractAddress,
        network: data.network,
        generationMode: data.generationMode ?? "MOCK",
        metadata: data.metadata ?? null,
      },
    });

    return toSummary(artifact);
  },
};
