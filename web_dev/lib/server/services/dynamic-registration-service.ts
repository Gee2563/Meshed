import { randomUUID } from "node:crypto";

import type {
  CompanySummary,
  OnboardingProfileSummary,
  UserSummary,
} from "@/lib/types";
import { getDynamicInvitationAccess } from "@/lib/auth/invitation-access";
import { ApiError } from "@/lib/server/http";

const genericDynamicBio = "New Meshed member authenticated with Dynamic.";

type DynamicRegistrationInput = {
  dynamicUserId: string;
  walletAddress: string;
  email: string;
  name: string;
  firstName?: string | null;
  lastName?: string | null;
};

type DynamicRegistrationResult = {
  user: UserSummary;
  onboardingProfile: OnboardingProfileSummary;
  nextRoute: "/human-idv" | "/onboarding";
  contractArtifact: null;
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
        currentStep?: "VC_COMPANY" | "PORTFOLIO_COMPANY" | "COMPANY_ACCESS" | "INDIVIDUAL_PROFILE" | "COMPLETE";
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
    companyKind: "VC" | "PORTFOLIO";
    parentCompanyId?: string | null;
    outsideNetworkAccessEnabled: boolean;
  },
) {
  const existing = await deps.companyRepository.findById(input.id);
  if (existing) {
    return existing;
  }

  return deps.companyRepository.create({
    id: input.id,
    ownerUserId: input.ownerUserId,
    name: input.name,
    description: `${input.name} onboarding shell`,
    sector: "General",
    stage: "Active",
    website: "https://meshed.local",
    currentPainTags: [],
    resolvedPainTags: [],
    companyKind: input.companyKind,
    parentCompanyId: input.parentCompanyId ?? null,
    outsideNetworkAccessEnabled: input.outsideNetworkAccessEnabled,
  });
}

async function ensurePortfolioInviteScaffold(
  deps: DynamicRegistrationDependencies,
  user: UserSummary,
  invite: NonNullable<ReturnType<typeof getDynamicInvitationAccess>>,
) {
  if (!invite.vcCompanyId || !invite.vcCompanyName || !invite.portfolioCompanyId || !invite.portfolioCompanyName) {
    throw new ApiError(500, "Portfolio invite is missing company metadata.");
  }

  await ensureCompany(deps, {
    id: invite.vcCompanyId,
    ownerUserId: user.id,
    name: invite.vcCompanyName,
    companyKind: "VC",
    outsideNetworkAccessEnabled: true,
  });

  await ensureCompany(deps, {
    id: invite.portfolioCompanyId,
    ownerUserId: user.id,
    name: invite.portfolioCompanyName,
    companyKind: "PORTFOLIO",
    parentCompanyId: invite.vcCompanyId,
    outsideNetworkAccessEnabled: false,
  });

  const existingMemberships = await deps.membershipRepository.findByUserId(user.id);
  const hasPortfolioMembership = existingMemberships.some(
    (membership) =>
      membership.companyId === invite.portfolioCompanyId &&
      membership.relation === "portfolio_member",
  );

  if (!hasPortfolioMembership) {
    await deps.membershipRepository.create({
      id: deps.idGenerator.membershipId(),
      companyId: invite.portfolioCompanyId,
      userId: user.id,
      relation: "portfolio_member",
      title: invite.title,
    });
  }
}

async function ensureUserForInvite(
  deps: DynamicRegistrationDependencies,
  input: DynamicRegistrationInput,
  role: "OPERATOR" | "INVESTOR",
  outsideNetworkAccessEnabled: boolean,
) {
  const existingUser =
    (await deps.userRepository.findByDynamicUserId(input.dynamicUserId)) ??
    (await deps.userRepository.findByEmail(input.email)) ??
    (await deps.userRepository.findByWalletAddress(input.walletAddress));

  const displayName = resolveDisplayName(input);

  if (!existingUser) {
    const created = await deps.userRepository.create({
      id: deps.idGenerator.userId(),
      name: displayName,
      email: input.email,
      role,
      bio: genericDynamicBio,
      skills: [],
      sectors: [],
      outsideNetworkAccessEnabled,
    });
    return deps.userRepository.linkWallet(created.id, input.walletAddress, input.dynamicUserId);
  }

  const updatedProfile = deps.userRepository.updateProfile
    ? await deps.userRepository.updateProfile(existingUser.id, {
        name: displayName,
        role,
        bio: existingUser.bio || genericDynamicBio,
        outsideNetworkAccessEnabled,
      })
    : existingUser;

  return deps.userRepository.linkWallet(updatedProfile.id, input.walletAddress, input.dynamicUserId);
}

export function createDynamicRegistrationService(deps: DynamicRegistrationDependencies) {
  return {
    async register(input: DynamicRegistrationInput): Promise<DynamicRegistrationResult> {
      const email = normalizeEmail(input.email);
      const invite = getDynamicInvitationAccess(email);

      if (!invite) {
        throw new ApiError(403, "This Meshed onboarding flow is invitation-only.");
      }

      const user = await ensureUserForInvite(
        deps,
        { ...input, email },
        invite.role === "operator" ? "OPERATOR" : "INVESTOR",
        invite.outsideNetworkAccessEnabled,
      );

      if (invite.kind === "portfolio_member") {
        await ensurePortfolioInviteScaffold(deps, user, invite);
      }

      const onboardingProfile = await deps.onboardingRepository.upsertByUserId(user.id, {
        id: deps.idGenerator.onboardingId(),
        companyId: null,
        vcCompanyId: invite.vcCompanyId ?? null,
        portfolioCompanyId: invite.portfolioCompanyId ?? null,
        mode: invite.onboardingMode === "company" ? "COMPANY" : "INDIVIDUAL",
        title: invite.title,
        isExecutive: invite.role === "investor",
        currentStep: invite.onboardingStep === "vc_company" ? "VC_COMPANY" : "COMPLETE",
      });

      await ensureWalletVerification(deps, user);

      return {
        user,
        onboardingProfile,
        nextRoute: invite.nextRoute,
        contractArtifact: null,
      };
    },
  };
}

let defaultServicePromise: Promise<ReturnType<typeof createDynamicRegistrationService>> | null = null;

async function getDefaultDynamicRegistrationService() {
  if (!defaultServicePromise) {
    defaultServicePromise = Promise.all([
      import("@/lib/server/repositories/company-repository"),
      import("@/lib/server/repositories/onboarding-repository"),
      import("@/lib/server/repositories/user-repository"),
      import("@/lib/server/prisma"),
    ]).then(([companyModule, onboardingModule, userModule, prismaModule]) => {
      const prismaClient = prismaModule.prisma as {
        companyMembership: {
          create(args: { data: { id: string; companyId: string; userId: string; relation: string; title: string } }): Promise<unknown>;
          findMany(args: {
            where: { userId: string };
            include: { company: { select: { name: true } } };
          }): Promise<Array<{ companyId: string; relation: string; title: string; company?: { name: string } }>>;
        };
        verificationRecord?: {
          findFirst(args: { where: { userId: string } }): Promise<unknown | null>;
          create(args: {
            data: {
              id: string;
              userId: string;
              type: string;
              status: string;
              providerRef: string;
              metadata: Record<string, unknown>;
            };
          }): Promise<unknown>;
        };
      };

      return createDynamicRegistrationService({
        userRepository: userModule.userRepository,
        onboardingRepository: onboardingModule.onboardingRepository,
        companyRepository: companyModule.companyRepository,
        membershipRepository: {
          create: async (data) => {
            return prismaClient.companyMembership.create({ data });
          },
          findByUserId: async (userId) => {
            return prismaClient.companyMembership.findMany({
              where: { userId },
              include: {
                company: {
                  select: { name: true },
                },
              },
            });
          },
        },
        verificationRepository: {
          findWalletVerification: async (userId) => {
            if (!prismaClient.verificationRecord) {
              return null;
            }

            return prismaClient.verificationRecord.findFirst({
              where: { userId },
            });
          },
          createWalletVerification: async (userId, providerRef, metadata) => {
            if (!prismaClient.verificationRecord) {
              return null;
            }

            return prismaClient.verificationRecord.create({
              data: {
                id: `ver_dynamic_${Date.now()}`,
                userId,
                type: "WALLET_LINK",
                status: "VERIFIED",
                providerRef,
                metadata,
              },
            });
          },
        },
        idGenerator: {
          userId: () => `user_${randomUUID()}`,
          onboardingId: () => `onb_${randomUUID()}`,
          membershipId: () => `mem_${randomUUID()}`,
        },
      });
    });
  }

  return defaultServicePromise;
}

export const dynamicRegistrationService = {
  async register(input: DynamicRegistrationInput) {
    const service = await getDefaultDynamicRegistrationService();
    return service.register(input);
  },
};
