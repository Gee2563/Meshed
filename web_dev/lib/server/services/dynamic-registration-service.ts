import { randomUUID } from "node:crypto";

import type {
  CompanySummary,
  OnboardingProfileSummary,
  UserSummary,
} from "../../types";
import { companyRepository } from "@/lib/server/repositories/company-repository";
import { onboardingRepository } from "@/lib/server/repositories/onboarding-repository";
import { userRepository } from "@/lib/server/repositories/user-repository";
import { ApiError } from "@/lib/server/http";

// Dynamic registration service is the bridge from Dynamic-authenticated identities into Meshed onboarding records.
const genericDynamicBio = "New Meshed member authenticated with Dynamic.";

type DynamicRegistrationInput = {
  dynamicUserId: string;
  walletAddress: string;
  email: string;
  name: string;
  firstName?: string | null;
  lastName?: string | null;
};

type DynamicRegistrationDependencies = {
  userRepository: {
    findByEmail(email: string): Promise<UserSummary | null>;
    findByDynamicUserId(dynamicUserId: string): Promise<UserSummary | null>;
    findByWalletAddress(walletAddress: string): Promise<UserSummary | null>;
    create(data: {
      id: string;
      name: string;
      email: string;
      role: "OPERATOR" | "INVESTOR";
      bio: string;
      skills: string[];
      sectors: string[];
      linkedinUrl?: string | null;
      outsideNetworkAccessEnabled?: boolean;
    }): Promise<UserSummary>;
    updateProfile?(
      userId: string,
      data: {
        name?: string;
        role?: "OPERATOR" | "INVESTOR";
        bio?: string;
        skills?: string[];
        sectors?: string[];
        linkedinUrl?: string | null;
        outsideNetworkAccessEnabled?: boolean;
      },
    ): Promise<UserSummary>;
    linkWallet(userId: string, walletAddress: string, dynamicUserId?: string | null): Promise<UserSummary>;
  };
  onboardingRepository: {
    findByUserId(userId: string): Promise<OnboardingProfileSummary | null>;
    upsertByUserId(
      userId: string,
      data: {
        id?: string;
        companyId?: string | null;
        vcCompanyId?: string | null;
        portfolioCompanyId?: string | null;
        mode: "COMPANY" | "INDIVIDUAL";
        title: string;
        isExecutive: boolean;
        executiveSignoffEmail?: string | null;
        currentStep?: "VC_COMPANY" | "COMPLETE";
      },
    ): Promise<OnboardingProfileSummary>;
  };
  companyRepository: {
    findById(id: string): Promise<CompanySummary | null>;
    create(data: {
      id: string;
      name: string;
      description: string;
      sector: string;
      stage: string;
      website: string;
      ownerUserId: string;
      currentPainTags: string[];
      resolvedPainTags: string[];
      companyKind?: "VC" | "PORTFOLIO";
      parentCompanyId?: string | null;
      outsideNetworkAccessEnabled?: boolean;
    }): Promise<CompanySummary>;
  };
  membershipRepository: {
    create(data: {
      id: string;
      companyId: string;
      userId: string;
      relation: string;
      title: string;
    }): Promise<unknown>;
    findByUserId(
      userId: string,
    ): Promise<Array<{ companyId: string; relation: string; title: string; company?: { name: string } }>>;
  };
  verificationRepository: {
    findWalletVerification(userId: string): Promise<unknown | null>;
    createWalletVerification(userId: string, providerRef: string, metadata: Record<string, unknown>): Promise<unknown>;
  };
  idGenerator: {
    userId(): string;
    onboardingId(): string;
    membershipId(): string;
  };
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function resolveDisplayName(input: DynamicRegistrationInput) {
  const firstName = input.firstName?.trim();
  const lastName = input.lastName?.trim();
  const combined = [firstName, lastName].filter(Boolean).join(" ").trim();
  return combined || input.name.trim();
}

async function ensureWalletVerification(
  deps: DynamicRegistrationDependencies,
  user: UserSummary,
) {
  // Registration may be retried, so only create the wallet verification record once per user.
  const existing = await deps.verificationRepository.findWalletVerification(user.id);
  if (existing) {
    return;
  }

  await deps.verificationRepository.createWalletVerification(user.id, `dynamic:auth:${user.dynamicUserId}`, {
    walletAddress: user.walletAddress ?? "",
    dynamicUserId: user.dynamicUserId ?? "",
    source: "dynamic_embedded_auth",
  });
}

async function ensureCompany(
  deps: DynamicRegistrationDependencies,
  input: {
    id: string;
    ownerUserId: string;
    name: string;
    description: string;
    sector: string;
    stage: string;
    website: string;
    currentPainTags: string[];
    companyKind: "VC" | "PORTFOLIO";
    parentCompanyId?: string | null;
    outsideNetworkAccessEnabled: boolean;
  },
) {
  // Invite-driven onboarding sometimes references companies that need to be created lazily.
  const existing = await deps.companyRepository.findById(input.id);
  if (existing) {
    return existing;
  }

  return deps.companyRepository.create({
    id: input.id,
    ownerUserId: input.ownerUserId,
    name: input.name,
    description: input.description,
    sector: input.sector,
    stage: input.stage,
    website: input.website,
    currentPainTags: input.currentPainTags,
    resolvedPainTags: [],
    companyKind: input.companyKind,
    parentCompanyId: input.parentCompanyId ?? null,
    outsideNetworkAccessEnabled: input.outsideNetworkAccessEnabled,
  });
}

export function createDynamicRegistrationService(deps: DynamicRegistrationDependencies) {
  return {
    async register(input: DynamicRegistrationInput) {
      // Normalize identifiers up front so account matching does not depend on email casing.
      const email = normalizeEmail(input.email);

      const existingUser =
        (await deps.userRepository.findByDynamicUserId(input.dynamicUserId)) ??
        (await deps.userRepository.findByEmail(email)) ??
        (await deps.userRepository.findByWalletAddress(input.walletAddress));

      // The current implementation is intentionally minimal while the invite-aware onboarding path is being rebuilt.
      const user = await deps.userRepository.linkWallet(
        input.walletAddress,
        input.dynamicUserId,
      );

    

      await ensureWalletVerification(deps, user);

      return {
        user,
        contractArtifact: null,
      };
    },
  };
}

// Default singleton used by route handlers; several dependencies are still explicit placeholders for unfinished flows.
export const dynamicRegistrationService = createDynamicRegistrationService({
  userRepository,
  onboardingRepository,
  companyRepository,
  membershipRepository: {
    create: async () => {
      throw new ApiError(500, "Membership creation not implemented in dynamic registration.");
    },
    findByUserId: async () => {
      return [];
    },
  },
  verificationRepository: {
    findWalletVerification: async () => {
      return null;
    },
    createWalletVerification: async () => {
      return null;
    },
  },
  idGenerator: {
    userId: () => `user_${randomUUID()}`,
    onboardingId: () => `onb_${randomUUID()}`,
    membershipId: () => `mem_${randomUUID()}`,
    },

  });
