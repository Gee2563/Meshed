import { describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/server/http";
import { createWorldOnboardingContractService } from "@/lib/server/services/world-onboarding-contract-service";
import type { OnboardingContractArtifactSummary, UserSummary } from "@/lib/types";

function createUser(overrides?: Partial<UserSummary>): UserSummary {
  return {
    id: "usr_world",
    name: "Avery Collins",
    email: "avery@meshed.app",
    role: "investor",
    bio: "Investor profile",
    skills: [],
    sectors: [],
    linkedinUrl: null,
    walletAddress: "0x1234567890123456789012345678901234567890",
    worldVerified: true,
    dynamicUserId: "dyn_123",
    engagementScore: 0,
    reliabilityScore: 0,
    verificationBadges: ["wallet_connected", "world_verified"],
    outsideNetworkAccessEnabled: false,
    lastActiveAt: null,
    createdAt: "2026-04-01T09:00:00.000Z",
    ...overrides,
  };
}

describe("world onboarding contract service", () => {
  it("creates the world_verified onboarding artifact on first verification", async () => {
    const artifacts: OnboardingContractArtifactSummary[] = [];
    const deployWorldVerifiedContract = vi.fn(async () => ({
      contractAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      network: "flare-coston2",
      generationMode: "REAL" as const,
      metadata: {
        transactionHash: "0xdeadbeef",
      },
    }));

    const service = createWorldOnboardingContractService({
      onboardingContractRepository: {
        async listByUserId(userId: string) {
          return artifacts.filter((artifact) => artifact.userId === userId);
        },
        async create(data) {
          const artifact: OnboardingContractArtifactSummary = {
            id: data.id,
            userId: data.userId,
            companyId: data.companyId ?? null,
            contractStep: "world_verified",
            contractName: data.contractName,
            contractAddress: data.contractAddress,
            network: data.network,
            generationMode: (data.generationMode ?? "MOCK").toLowerCase() as OnboardingContractArtifactSummary["generationMode"],
            metadata: (data.metadata as Record<string, unknown> | null | undefined) ?? null,
            createdAt: "2026-04-01T09:00:00.000Z",
          };
          artifacts.push(artifact);
          return artifact;
        },
      },
      idGenerator: {
        contractArtifactId: vi.fn(() => "con_world"),
      },
      deployWorldVerifiedContract,
    });

    const artifact = await service.ensureWorldVerifiedContract(createUser());

    expect(deployWorldVerifiedContract).toHaveBeenCalledOnce();
    expect(artifact.contractStep).toBe("world_verified");
    expect(artifact.generationMode).toBe("real");
    expect(artifact.metadata).toMatchObject({
      accessScope: "verified_member",
      entityName: "Avery Collins",
      source: "world_verification",
      stepKey: "world_verified",
      transactionHash: "0xdeadbeef",
    });
  });

  it("reuses the existing world_verified artifact instead of creating twice", async () => {
    const existingArtifact: OnboardingContractArtifactSummary = {
      id: "con_existing",
      userId: "usr_world",
      companyId: null,
      contractStep: "world_verified",
      contractName: "OnboardingStepAgreement",
      contractAddress: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      network: "flare-coston2",
      generationMode: "real",
      metadata: {
        source: "world_verification",
      },
      createdAt: "2026-04-01T09:00:00.000Z",
    };
    const deployWorldVerifiedContract = vi.fn();

    const service = createWorldOnboardingContractService({
      onboardingContractRepository: {
        async listByUserId() {
          return [existingArtifact];
        },
        async create() {
          throw new Error("create should not be called");
        },
      },
      idGenerator: {
        contractArtifactId: vi.fn(() => "con_world"),
      },
      deployWorldVerifiedContract,
    });

    const artifact = await service.ensureWorldVerifiedContract(createUser());

    expect(artifact).toEqual(existingArtifact);
    expect(deployWorldVerifiedContract).not.toHaveBeenCalled();
  });

  it("surfaces deployment errors such as live Flare not being wired yet", async () => {
    const service = createWorldOnboardingContractService({
      onboardingContractRepository: {
        async listByUserId() {
          return [];
        },
        async create() {
          throw new Error("create should not be called");
        },
      },
      idGenerator: {
        contractArtifactId: vi.fn(() => "con_world"),
      },
      deployWorldVerifiedContract: async () => {
        throw new ApiError(
          501,
          "Live Flare onboarding contract deployment is not wired in this repo yet. Re-enable USE_MOCK_FLARE or add the live deployment slice next.",
        );
      },
    });

    await expect(service.ensureWorldVerifiedContract(createUser())).rejects.toMatchObject({
      message:
        "Live Flare onboarding contract deployment is not wired in this repo yet. Re-enable USE_MOCK_FLARE or add the live deployment slice next.",
      status: 501,
    });
  });
});
