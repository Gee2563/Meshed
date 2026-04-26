import { randomUUID } from "node:crypto";

import { ApiError } from "@/lib/server/http";
import { onboardingRepository } from "@/lib/server/repositories/onboarding-repository";
import { userRepository } from "@/lib/server/repositories/user-repository";
import { worldVerificationNullifierRepository } from "@/lib/server/repositories/world-verification-nullifier-repository";
import { worldVerificationService } from "@/lib/server/services/world-verification-service";
import type { OnboardingProfileSummary, UserSummary } from "@/lib/types";

type WorldRegisterInput = {
  name: string;
  email?: string | null;
  role: "consultant" | "mentor" | "operator" | "investor";
  verification: {
    protocol_version: "3.0" | "4.0";
    nonce: string;
    environment: "production" | "staging";
    responses: Array<{ identifier: string }>;
    action?: string;
  } & Record<string, unknown>;
};

type WorldRegisterResult = {
  user: UserSummary;
  onboardingProfile: OnboardingProfileSummary;
  nextRoute: "/agent";
  isNewUser: boolean;
};

type WorldRegistrationServiceDependencies = {
  userRepository: {
    findById(userId: string): Promise<UserSummary | null>;
    findByEmail(email: string): Promise<UserSummary | null>;
    create(data: {
      id: string;
      name: string;
      email: string;
      role: "CONSULTANT" | "MENTOR" | "OPERATOR" | "INVESTOR";
      bio: string;
      skills: string[];
      sectors: string[];
      linkedinUrl?: string | null;
      outsideNetworkAccessEnabled?: boolean;
    }): Promise<UserSummary>;
  };
  onboardingRepository: {
    upsertByUserId(
      userId: string,
        data: {
          id?: string;
          mode: "COMPANY" | "INDIVIDUAL";
          title: string;
          isExecutive: boolean;
          currentStep?:
            | "VC_COMPANY"
            | "PORTFOLIO_COMPANY"
            | "COMPANY_ACCESS"
            | "INDIVIDUAL_PROFILE"
            | "SOCIALS"
            | "NETWORK_PREPARING"
            | "READY"
            | "COMPLETE";
        },
    ): Promise<OnboardingProfileSummary>;
  };
  worldVerificationNullifierRepository: {
    findUserIdByReplayKey(input: { action: string; nullifier: string }): Promise<string | null>;
    reserveAndMarkVerified(input: { userId: string; action: string; nullifier: string }): Promise<UserSummary>;
  };
  worldVerificationService: {
    verifyPayload(
      payload: WorldRegisterInput["verification"],
      input?: {
        fetch?: typeof fetch;
      },
    ): Promise<{
      verification: {
        success?: boolean;
        environment?: string;
      } | null;
      replayKey: {
        action: string;
        nullifier: string;
      };
    }>;
  };
  idGenerator: {
    userId(): string;
    onboardingId(): string;
  };
};

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function sameNormalizedName(left: string, right: string) {
  return normalizeName(left).toLowerCase() === normalizeName(right).toLowerCase();
}

function normalizeEmail(value?: string | null) {
  const trimmed = value?.trim().toLowerCase() ?? "";
  return trimmed || null;
}

function placeholderEmailFromNullifier(nullifier: string) {
  const safeSuffix = nullifier.replace(/[^a-z0-9]/gi, "").slice(0, 18).toLowerCase();
  return `world-${safeSuffix || "member"}@meshed.local`;
}

function titleForRole(role: WorldRegisterInput["role"]) {
  switch (role) {
    case "investor":
      return "Investor";
    case "mentor":
      return "Mentor";
    case "consultant":
      return "Consultant";
    default:
      return "Operator";
  }
}

function roleForPersistence(role: WorldRegisterInput["role"]): "CONSULTANT" | "MENTOR" | "OPERATOR" | "INVESTOR" {
  return role.toUpperCase() as "CONSULTANT" | "MENTOR" | "OPERATOR" | "INVESTOR";
}

const genericWorldBio = "New Meshed member authenticated and registered with World ID.";

export function createWorldRegistrationService(deps: WorldRegistrationServiceDependencies) {
  return {
    async register(input: WorldRegisterInput): Promise<WorldRegisterResult> {
      const name = normalizeName(input.name);
      if (!name) {
        throw new ApiError(400, "Name is required to create a Meshed account.");
      }

      const { replayKey } = await deps.worldVerificationService.verifyPayload(input.verification);
      const existingUserId = await deps.worldVerificationNullifierRepository.findUserIdByReplayKey(replayKey);

      if (existingUserId) {
        const existingUser = await deps.userRepository.findById(existingUserId);
        if (!existingUser) {
          throw new ApiError(404, "World-verified Meshed member not found.");
        }

        if (!sameNormalizedName(name, existingUser.name)) {
          throw new ApiError(
            409,
            `This World ID is already linked to ${existingUser.name}. Use that account or switch to a different World Simulator identity to test a new Meshed member.`,
          );
        }

        const verifiedUser = existingUser.worldVerified
          ? existingUser
          : await deps.worldVerificationNullifierRepository.reserveAndMarkVerified({
              userId: existingUser.id,
              action: replayKey.action,
              nullifier: replayKey.nullifier,
            });

        const onboardingProfile = await deps.onboardingRepository.upsertByUserId(existingUser.id, {
          id: deps.idGenerator.onboardingId(),
          mode: "INDIVIDUAL",
          title: titleForRole((existingUser.role as WorldRegisterInput["role"]) ?? input.role),
          isExecutive: existingUser.role === "investor",
          currentStep: "VC_COMPANY",
        });

        return {
          user: verifiedUser,
          onboardingProfile,
          nextRoute: "/agent",
          isNewUser: false,
        };
      }

      const normalizedEmail = normalizeEmail(input.email) ?? placeholderEmailFromNullifier(replayKey.nullifier);
      const existingByEmail = await deps.userRepository.findByEmail(normalizedEmail);
      if (existingByEmail) {
        throw new ApiError(
          409,
          "That email is already attached to another Meshed account. Use World ID to sign back into that account or choose a different email.",
        );
      }

      const createdUser = await deps.userRepository.create({
        id: deps.idGenerator.userId(),
        name,
        email: normalizedEmail,
        role: roleForPersistence(input.role),
        bio: genericWorldBio,
        skills: [],
        sectors: [],
        outsideNetworkAccessEnabled: false,
      });

      const verifiedUser = await deps.worldVerificationNullifierRepository.reserveAndMarkVerified({
        userId: createdUser.id,
        action: replayKey.action,
        nullifier: replayKey.nullifier,
      });

      const onboardingProfile = await deps.onboardingRepository.upsertByUserId(createdUser.id, {
        id: deps.idGenerator.onboardingId(),
        mode: "INDIVIDUAL",
        title: titleForRole(input.role),
        isExecutive: input.role === "investor",
        currentStep: "VC_COMPANY",
      });

      return {
        user: verifiedUser,
        onboardingProfile,
        nextRoute: "/agent",
        isNewUser: true,
      };
    },
  };
}

export const worldRegistrationService = createWorldRegistrationService({
  userRepository,
  onboardingRepository,
  worldVerificationNullifierRepository,
  worldVerificationService,
  idGenerator: {
    userId: () => `usr_world_${randomUUID().replace(/-/g, "").slice(0, 12)}`,
    onboardingId: () => `onb_world_${randomUUID().replace(/-/g, "").slice(0, 12)}`,
  },
});
