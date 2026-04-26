import { describe, expect, it, vi } from "vitest";

import { createVerifiedInteractionService } from "@/lib/server/services/verified-interaction-service";
import type { UserSummary, VerifiedInteractionSummary } from "@/lib/types";

function createUser(overrides?: Partial<UserSummary>): UserSummary {
  return {
    id: "usr_default",
    name: "Avery Collins",
    email: "avery@meshed.app",
    role: "operator",
    bio: "Meshed member",
    skills: [],
    sectors: [],
    linkedinUrl: null,
    walletAddress: null,
    worldVerified: true,
    dynamicUserId: null,
    engagementScore: 80,
    reliabilityScore: 82,
    verificationBadges: ["world_verified"],
    outsideNetworkAccessEnabled: true,
    lastActiveAt: null,
    createdAt: "2026-04-01T09:00:00.000Z",
    ...overrides,
  };
}

function createInteraction(overrides?: Partial<VerifiedInteractionSummary>): VerifiedInteractionSummary {
  return {
    id: "int_1",
    interactionType: "MATCH_SUGGESTED",
    actorUserId: "usr_actor",
    targetUserId: "usr_target",
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

describe("verifiedInteractionService", () => {
  it("records a match suggestion as verified when the acting human is World verified", async () => {
    const actor = createUser({ id: "usr_actor", worldVerified: true });
    const target = createUser({ id: "usr_target", worldVerified: false });
    const create = vi.fn(async (input) =>
      createInteraction({
        id: input.id,
        interactionType: input.interactionType,
        actorUserId: input.actorUserId,
        targetUserId: input.targetUserId ?? null,
        verified: input.verified,
        actorWorldVerified: input.actorWorldVerified,
        actorWorldNullifier: input.actorWorldNullifier ?? null,
        targetWorldVerified: input.targetWorldVerified ?? null,
        targetWorldNullifier: input.targetWorldNullifier ?? null,
        rewardStatus: input.rewardStatus ?? "NOT_REWARDABLE",
      }),
    );

    const service = createVerifiedInteractionService({
      userRepository: {
        findById: vi.fn(async (userId: string) => (userId === actor.id ? actor : target)),
      },
      companyRepository: {
        findById: vi.fn(async () => null),
      },
      worldVerificationNullifierRepository: {
        findLatestByUserId: vi.fn(async (userId: string) => ({
          action: "meshed-network-access",
          nullifier: userId === actor.id ? "0xactor" : "0xtarget",
          createdAt: "2026-04-01T09:00:00.000Z",
        })),
      },
      verifiedInteractionRepository: {
        create,
        listRecentByUserId: vi.fn(async () => []),
      },
      idGenerator: {
        interactionId: vi.fn(() => "int_generated"),
      },
    });

    const interaction = await service.recordInteraction({
      interactionType: "MATCH_SUGGESTED",
      actorUserId: actor.id,
      targetUserId: target.id,
      metadata: {
        source: "dashboard",
      },
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "int_generated",
        interactionType: "MATCH_SUGGESTED",
        verified: true,
        actorWorldVerified: true,
        actorWorldNullifier: "0xactor",
        rewardStatus: "NOT_REWARDABLE",
      }),
    );
    expect(interaction.verified).toBe(true);
  });

  it("uses the authorizing verified human snapshot for agent-backed actions", async () => {
    const agent = createUser({ id: "usr_agent", worldVerified: false, verificationBadges: [] });
    const owner = createUser({ id: "usr_owner", worldVerified: true });
    const target = createUser({ id: "usr_target", worldVerified: true });
    const create = vi.fn(async (input) =>
      createInteraction({
        id: input.id,
        interactionType: input.interactionType,
        actorUserId: input.actorUserId,
        targetUserId: input.targetUserId ?? null,
        authorizedByUserId: input.authorizedByUserId ?? null,
        verified: input.verified,
        actorWorldVerified: input.actorWorldVerified,
        actorWorldNullifier: input.actorWorldNullifier ?? null,
        rewardStatus: input.rewardStatus ?? "NOT_REWARDABLE",
      }),
    );

    const service = createVerifiedInteractionService({
      userRepository: {
        findById: vi.fn(async (userId: string) => {
          if (userId === agent.id) return agent;
          if (userId === owner.id) return owner;
          return target;
        }),
      },
      companyRepository: {
        findById: vi.fn(async () => null),
      },
      worldVerificationNullifierRepository: {
        findLatestByUserId: vi.fn(async (userId: string) => {
          if (userId === owner.id) {
            return {
              action: "meshed-network-access",
              nullifier: "0xowner",
              createdAt: "2026-04-01T09:00:00.000Z",
            };
          }

          if (userId === target.id) {
            return {
              action: "meshed-network-access",
              nullifier: "0xtarget",
              createdAt: "2026-04-01T09:00:00.000Z",
            };
          }

          return {
            action: "meshed-network-access",
            nullifier: "0xagent",
            createdAt: "2026-04-01T09:00:00.000Z",
          };
        }),
      },
      verifiedInteractionRepository: {
        create,
        listRecentByUserId: vi.fn(async () => []),
      },
      idGenerator: {
        interactionId: vi.fn(() => "int_agent"),
      },
    });

    const interaction = await service.recordInteraction({
      interactionType: "INTRO_ACCEPTED",
      actorUserId: agent.id,
      authorizedByUserId: owner.id,
      targetUserId: target.id,
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "usr_agent",
        authorizedByUserId: "usr_owner",
        verified: true,
        actorWorldVerified: true,
        actorWorldNullifier: "0xowner",
        rewardStatus: "REWARDABLE",
      }),
    );
    expect(interaction.actorWorldNullifier).toBe("0xowner");
  });

  it("marks collaboration events as not fully verified when the target human is not verified", async () => {
    const actor = createUser({ id: "usr_actor", worldVerified: true });
    const target = createUser({ id: "usr_target", worldVerified: false, verificationBadges: [] });
    const create = vi.fn(async (input) =>
      createInteraction({
        id: input.id,
        interactionType: input.interactionType,
        actorUserId: input.actorUserId,
        targetUserId: input.targetUserId ?? null,
        verified: input.verified,
        rewardStatus: input.rewardStatus ?? "NOT_REWARDABLE",
      }),
    );

    const service = createVerifiedInteractionService({
      userRepository: {
        findById: vi.fn(async (userId: string) => (userId === actor.id ? actor : target)),
      },
      companyRepository: {
        findById: vi.fn(async () => null),
      },
      worldVerificationNullifierRepository: {
        findLatestByUserId: vi.fn(async () => null),
      },
      verifiedInteractionRepository: {
        create,
        listRecentByUserId: vi.fn(async () => []),
      },
      idGenerator: {
        interactionId: vi.fn(() => "int_collab"),
      },
    });

    const interaction = await service.recordInteraction({
      interactionType: "COLLABORATION_COMPLETED",
      actorUserId: actor.id,
      targetUserId: target.id,
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        verified: false,
        rewardStatus: "REWARDABLE",
      }),
    );
    expect(interaction.verified).toBe(false);
  });

  it("submits verified interactions to World Chain when the signer and registry are configured", async () => {
    const actor = createUser({ id: "usr_actor", worldVerified: true });
    const target = createUser({ id: "usr_target", worldVerified: true });
    const submitInteraction = vi.fn(async () => ({
      network: "worldchain-sepolia",
      chainId: 4801,
      contractAddress: "0x1234567890123456789012345678901234567890",
      transactionHash: "0xworldtx",
      blockNumber: 12345,
      explorerUrl: "https://worldchain-sepolia.explorer.alchemy.com/tx/0xworldtx",
      recorderAddress: "0x9876543210987654321098765432109876543210",
      interactionIdHash: "0xint",
      actorHash: "0xactorhash",
      targetHash: "0xtargethash",
      companyHash: "0xcompanyhash",
      painPointHash: "0xpainhash",
      metadataHash: "0xmetahash",
      submittedAt: "2026-04-01T09:00:00.000Z",
    }));
    const create = vi.fn(async (input) =>
      createInteraction({
        id: input.id,
        interactionType: input.interactionType,
        actorUserId: input.actorUserId,
        targetUserId: input.targetUserId ?? null,
        verified: input.verified,
        transactionHash: input.transactionHash ?? null,
        metadata: input.metadata ?? null,
      }),
    );

    const service = createVerifiedInteractionService({
      userRepository: {
        findById: vi.fn(async (userId: string) => (userId === actor.id ? actor : target)),
      },
      companyRepository: {
        findById: vi.fn(async () => ({ id: "co_1" })),
      },
      worldVerificationNullifierRepository: {
        findLatestByUserId: vi.fn(async (userId: string) => ({
          action: "meshed-network-access",
          nullifier: userId === actor.id ? "0xactor" : "0xtarget",
          createdAt: "2026-04-01T09:00:00.000Z",
        })),
      },
      verifiedInteractionRepository: {
        create,
        listRecentByUserId: vi.fn(async () => []),
      },
      worldChainVerifiedInteractionService: {
        isReady: vi.fn(() => true),
        submitInteraction,
      },
      idGenerator: {
        interactionId: vi.fn(() => "int_world"),
      },
    });

    const interaction = await service.recordInteraction({
      interactionType: "INTRO_ACCEPTED",
      actorUserId: actor.id,
      targetUserId: target.id,
      companyId: "co_1",
      painPointTag: "pricing",
      matchScore: 93,
      metadata: {
        source: "dashboard",
      },
    });

    expect(submitInteraction).toHaveBeenCalledWith({
      interactionId: "int_world",
      interactionType: "INTRO_ACCEPTED",
      authoritativeActorId: "usr_actor",
      actorWorldNullifier: "0xactor",
      targetUserId: "usr_target",
      targetWorldNullifier: "0xtarget",
      companyId: "co_1",
      painPointTag: "pricing",
      matchScore: 93,
      verified: true,
      rewardStatus: "REWARDABLE",
      metadata: {
        source: "dashboard",
      },
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "int_world",
        transactionHash: "0xworldtx",
        metadata: expect.objectContaining({
          source: "dashboard",
          worldChain: expect.objectContaining({
            contractAddress: "0x1234567890123456789012345678901234567890",
            transactionHash: "0xworldtx",
            explorerUrl: "https://worldchain-sepolia.explorer.alchemy.com/tx/0xworldtx",
          }),
        }),
      }),
    );
    expect(interaction.transactionHash).toBe("0xworldtx");
    expect(interaction.metadata).toEqual(
      expect.objectContaining({
        source: "dashboard",
        worldChain: expect.objectContaining({
          contractAddress: "0x1234567890123456789012345678901234567890",
          transactionHash: "0xworldtx",
          explorerUrl: "https://worldchain-sepolia.explorer.alchemy.com/tx/0xworldtx",
          metadataHash: "0xmetahash",
        }),
      }),
    );
  });
});
