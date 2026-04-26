import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/server/http";
import { createWorldRegistrationService } from "@/lib/server/services/world-registration-service";
import type { OnboardingProfileSummary, UserSummary } from "@/lib/types";

function createUserSummary(overrides?: Partial<UserSummary>): UserSummary {
  return {
    id: "usr_world",
    name: "George Morris",
    email: "george@meshed.local",
    role: "operator",
    bio: "New Meshed member authenticated and registered with World ID.",
    skills: [],
    sectors: [],
    linkedinUrl: null,
    walletAddress: null,
    worldVerified: false,
    dynamicUserId: null,
    engagementScore: 0,
    reliabilityScore: 0,
    verificationBadges: [],
    outsideNetworkAccessEnabled: false,
    lastActiveAt: null,
    createdAt: "2026-04-25T00:00:00.000Z",
    ...overrides,
  };
}

function createOnboardingProfileSummary(
  overrides?: Partial<OnboardingProfileSummary>,
): OnboardingProfileSummary {
  return {
    id: "onb_world",
    userId: "usr_world",
    companyId: null,
    vcCompanyId: null,
    portfolioCompanyId: null,
    mode: "individual",
    title: "Operator",
    isExecutive: false,
    executiveSignoffEmail: null,
    currentStep: "vc_company",
    teamCsvUploadedAt: null,
    createdAt: "2026-04-25T00:00:00.000Z",
    updatedAt: "2026-04-25T00:00:00.000Z",
    ...overrides,
  };
}

describe("world registration service", () => {
  const mocks = {
    findById: vi.fn(),
    findByEmail: vi.fn(),
    createUser: vi.fn(),
    upsertByUserId: vi.fn(),
    findUserIdByReplayKey: vi.fn(),
    reserveAndMarkVerified: vi.fn(),
    verifyPayload: vi.fn(),
    ensureWorldRegistrationInteraction: vi.fn(),
    userId: vi.fn(),
    onboardingId: vi.fn(),
  };

  beforeEach(() => {
    mocks.findById.mockReset();
    mocks.findByEmail.mockReset();
    mocks.createUser.mockReset();
    mocks.upsertByUserId.mockReset();
    mocks.findUserIdByReplayKey.mockReset();
    mocks.reserveAndMarkVerified.mockReset();
    mocks.verifyPayload.mockReset();
    mocks.ensureWorldRegistrationInteraction.mockReset();
    mocks.userId.mockReset();
    mocks.onboardingId.mockReset();

    mocks.userId.mockReturnValue("usr_generated");
    mocks.onboardingId.mockReturnValue("onb_generated");
  });

  function createService() {
    return createWorldRegistrationService({
      userRepository: {
        findById: mocks.findById,
        findByEmail: mocks.findByEmail,
        create: mocks.createUser,
      },
      onboardingRepository: {
        upsertByUserId: mocks.upsertByUserId,
      },
      worldVerificationNullifierRepository: {
        findUserIdByReplayKey: mocks.findUserIdByReplayKey,
        reserveAndMarkVerified: mocks.reserveAndMarkVerified,
      },
      worldVerificationService: {
        verifyPayload: mocks.verifyPayload,
      },
      verifiedInteractionService: {
        ensureWorldRegistrationInteraction: mocks.ensureWorldRegistrationInteraction,
      },
      idGenerator: {
        userId: mocks.userId,
        onboardingId: mocks.onboardingId,
      },
    });
  }

  it("signs an existing World-verified member back into the same Meshed account", async () => {
    const existingUser = createUserSummary({
      id: "usr_existing",
      role: "investor",
      worldVerified: true,
      verificationBadges: ["world_verified"],
    });
    const onboardingProfile = createOnboardingProfileSummary({
      id: "onb_existing",
      userId: existingUser.id,
      title: "Investor",
      isExecutive: true,
    });

    mocks.verifyPayload.mockResolvedValue({
      replayKey: {
        action: "meshed-network-access",
        nullifier: "0xabc123",
      },
    });
    mocks.findUserIdByReplayKey.mockResolvedValue(existingUser.id);
    mocks.findById.mockResolvedValue(existingUser);
    mocks.upsertByUserId.mockResolvedValue(onboardingProfile);

    const service = createService();
    const result = await service.register({
      name: "George Morris",
      email: "george@example.com",
      role: "operator",
      verification: {
        protocol_version: "3.0",
        nonce: "0xnonce",
        action: "meshed-network-access",
        environment: "staging",
        responses: [{ identifier: "orb" }],
      },
    });

    expect(mocks.verifyPayload).toHaveBeenCalled();
    expect(mocks.findUserIdByReplayKey).toHaveBeenCalledWith({
      action: "meshed-network-access",
      nullifier: "0xabc123",
    });
    expect(mocks.reserveAndMarkVerified).not.toHaveBeenCalled();
    expect(mocks.upsertByUserId).toHaveBeenCalledWith(existingUser.id, {
      id: "onb_generated",
      mode: "INDIVIDUAL",
      title: "Investor",
      isExecutive: true,
      currentStep: "VC_COMPANY",
    });
    expect(mocks.ensureWorldRegistrationInteraction).toHaveBeenCalledWith(existingUser.id);
    expect(result).toEqual({
      user: existingUser,
      onboardingProfile,
      nextRoute: "/agent",
      isNewUser: false,
    });
  });

  it("creates a new Meshed account with a placeholder email when the member leaves email blank", async () => {
    const createdUser = createUserSummary({
      id: "usr_generated",
      email: "world-0xfeedface@meshed.local",
      name: "George Morris",
      role: "operator",
      worldVerified: false,
    });
    const verifiedUser = {
      ...createdUser,
      worldVerified: true,
      verificationBadges: ["world_verified"],
    } satisfies UserSummary;
    const onboardingProfile = createOnboardingProfileSummary({
      id: "onb_generated",
      userId: createdUser.id,
      title: "Operator",
    });

    mocks.verifyPayload.mockResolvedValue({
      replayKey: {
        action: "meshed-network-access",
        nullifier: "0xfeedface",
      },
    });
    mocks.findUserIdByReplayKey.mockResolvedValue(null);
    mocks.findByEmail.mockResolvedValue(null);
    mocks.createUser.mockResolvedValue(createdUser);
    mocks.reserveAndMarkVerified.mockResolvedValue(verifiedUser);
    mocks.upsertByUserId.mockResolvedValue(onboardingProfile);

    const service = createService();
    const result = await service.register({
      name: "  George   Morris  ",
      email: "",
      role: "operator",
      verification: {
        protocol_version: "3.0",
        nonce: "0xnonce",
        action: "meshed-network-access",
        environment: "staging",
        responses: [{ identifier: "orb" }],
      },
    });

    expect(mocks.createUser).toHaveBeenCalledWith({
      id: "usr_generated",
      name: "George Morris",
      email: "world-0xfeedface@meshed.local",
      role: "OPERATOR",
      bio: "New Meshed member authenticated and registered with World ID.",
      skills: [],
      sectors: [],
      outsideNetworkAccessEnabled: false,
    });
    expect(mocks.reserveAndMarkVerified).toHaveBeenCalledWith({
      userId: "usr_generated",
      action: "meshed-network-access",
      nullifier: "0xfeedface",
    });
    expect(mocks.ensureWorldRegistrationInteraction).toHaveBeenCalledWith("usr_generated");
    expect(result).toEqual({
      user: verifiedUser,
      onboardingProfile,
      nextRoute: "/agent",
      isNewUser: true,
    });
  });

  it("explains when the same World identity is reused with a different typed name", async () => {
    const existingUser = createUserSummary({
      id: "usr_existing",
      name: "George Morris",
      worldVerified: true,
      verificationBadges: ["world_verified"],
    });

    mocks.verifyPayload.mockResolvedValue({
      replayKey: {
        action: "meshed-network-access",
        nullifier: "0xabc123",
      },
    });
    mocks.findUserIdByReplayKey.mockResolvedValue(existingUser.id);
    mocks.findById.mockResolvedValue(existingUser);

    const service = createService();

    await expect(
      service.register({
        name: "Alicia Rivers",
        email: "alicia@example.com",
        role: "operator",
        verification: {
          protocol_version: "3.0",
          nonce: "0xnonce",
          action: "meshed-network-access",
          environment: "staging",
          responses: [{ identifier: "orb" }],
        },
      }),
    ).rejects.toMatchObject({
      status: 409,
      message: expect.stringContaining("already linked to George Morris"),
    });
  });

  it("rejects a new registration when the requested email already belongs to another member", async () => {
    mocks.verifyPayload.mockResolvedValue({
      replayKey: {
        action: "meshed-network-access",
        nullifier: "0xabc123",
      },
    });
    mocks.findUserIdByReplayKey.mockResolvedValue(null);
    mocks.findByEmail.mockResolvedValue(
      createUserSummary({
        id: "usr_taken",
        email: "taken@example.com",
      }),
    );

    const service = createService();

    await expect(
      service.register({
        name: "George Morris",
        email: "taken@example.com",
        role: "operator",
        verification: {
          protocol_version: "3.0",
          nonce: "0xnonce",
          action: "meshed-network-access",
          environment: "staging",
          responses: [{ identifier: "orb" }],
        },
      }),
    ).rejects.toMatchObject({
      status: 409,
      message:
        "That email is already attached to another Meshed account. Use World ID to sign back into that account or choose a different email.",
    } satisfies Pick<ApiError, "status" | "message">);

    expect(mocks.createUser).not.toHaveBeenCalled();
    expect(mocks.reserveAndMarkVerified).not.toHaveBeenCalled();
  });
});
