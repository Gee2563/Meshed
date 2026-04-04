import { createHash, randomUUID } from "node:crypto";

import { env } from "@/lib/config/env";
import { ApiError } from "@/lib/server/http";
import { onboardingContractRepository } from "@/lib/server/repositories/onboarding-contract-repository";
import type { OnboardingContractArtifactSummary, UserSummary } from "@/lib/types";

type WorldVerifiedContractDeploymentInput = {
  user: UserSummary;
  stepKey: "world_verified";
  entityName: string;
  accessScope: string;
};

type WorldVerifiedContractDeploymentResult = {
  contractAddress: string;
  network: string;
  generationMode: "MOCK" | "REAL";
  metadata?: Record<string, unknown> | null;
};

type WorldOnboardingContractServiceDependencies = {
  onboardingContractRepository: {
    listByUserId(userId: string): Promise<OnboardingContractArtifactSummary[]>;
    create(data: {
      id: string;
      userId: string;
      companyId?: string | null;
      contractStep: "WORLD_VERIFIED";
      contractName: string;
      contractAddress: string;
      network: string;
      generationMode?: "MOCK" | "REAL";
      metadata?: Record<string, unknown> | null;
    }): Promise<OnboardingContractArtifactSummary>;
  };
  idGenerator: {
    contractArtifactId(): string;
  };
  deployWorldVerifiedContract(
    input: WorldVerifiedContractDeploymentInput,
  ): Promise<WorldVerifiedContractDeploymentResult>;
};

function buildMockContractAddress(seed: string) {
  return `0x${createHash("sha256").update(seed).digest("hex").slice(0, 40)}`;
}

function getWorldAccessScope(user: UserSummary) {
  return user.outsideNetworkAccessEnabled ? "outside_network_enabled" : "verified_member";
}

export async function deployWorldVerifiedContract(
  input: WorldVerifiedContractDeploymentInput,
): Promise<WorldVerifiedContractDeploymentResult> {
  const network = "flare-coston2";

  if (env.USE_MOCK_FLARE) {
    return {
      contractAddress: buildMockContractAddress(
        `${input.user.id}:${input.user.walletAddress ?? "unlinked"}:${input.stepKey}:${input.accessScope}`,
      ),
      network,
      generationMode: "MOCK",
      metadata: {
        mode: "mock",
      },
    };
  }

  if (!input.user.walletAddress) {
    throw new ApiError(400, "A linked wallet is required before creating the World onboarding contract.");
  }

  throw new ApiError(
    501,
    "Live Flare onboarding contract deployment is not wired in this repo yet. Re-enable USE_MOCK_FLARE or add the live deployment slice next.",
  );
}

export function createWorldOnboardingContractService(
  deps: WorldOnboardingContractServiceDependencies,
) {
  return {
    async ensureWorldVerifiedContract(user: UserSummary) {
      const existingContracts = await deps.onboardingContractRepository.listByUserId(user.id);
      const existing = existingContracts.find((contract) => contract.contractStep === "world_verified") ?? null;
      if (existing) {
        return existing;
      }

      const entityName = user.name.trim() || user.email;
      const accessScope = getWorldAccessScope(user);
      const deployment = await deps.deployWorldVerifiedContract({
        user,
        stepKey: "world_verified",
        entityName,
        accessScope,
      });

      return deps.onboardingContractRepository.create({
        id: deps.idGenerator.contractArtifactId(),
        userId: user.id,
        companyId: null,
        contractStep: "WORLD_VERIFIED",
        contractName: "OnboardingStepAgreement",
        contractAddress: deployment.contractAddress,
        network: deployment.network,
        generationMode: deployment.generationMode,
        metadata: {
          accessScope,
          entityName,
          ownerAddress: user.walletAddress ?? null,
          source: "world_verification",
          stepKey: "world_verified",
          ...(deployment.metadata ?? {}),
        },
      });
    },
  };
}

export const worldOnboardingContractService = createWorldOnboardingContractService({
  onboardingContractRepository,
  idGenerator: {
    contractArtifactId: () => `con_${randomUUID().replace(/-/g, "").slice(0, 12)}`,
  },
  deployWorldVerifiedContract,
});
