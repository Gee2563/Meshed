import { beforeEach, describe, expect, it, vi } from "vitest";

import { createDynamicRegistrationService } from "@/lib/server/services/dynamic-registration-service";
import type { BadgeKey, CompanySummary, OnboardingProfileSummary, UserSummary } from "@/lib/types";

// Exercise invite-aware registration with in-memory repositories so the onboarding rules stay readable.
function createUserSummary(overrides?: Partial<UserSummary>): UserSummary {
  return {
    id: "usr_dynamic",
    name: "Avery Collins",
    email: "avery@meshed.local",
    role: "investor",
    bio: "New Meshed member authenticated with Dynamic.",
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
    createdAt: "2026-04-02T09:00:00.000Z",
    ...overrides,
  };
}

function createCompanySummary(overrides?: Partial<CompanySummary>): CompanySummary {
  return {
    id: "co_dynamic",
    name: "Meshed Co",
    description: "Test company",
    sector: "Enterprise",
    stage: "Seed",
    website: "https://example.com",
    ownerUserId: "usr_dynamic",
    currentPainTags: [],
    resolvedPainTags: [],
    companyKind: "operating",
    parentCompanyId: null,
    outsideNetworkAccessEnabled: false,
    ...overrides,
  };
}

function createRepoStubs() {
  const users = new Map<string, UserSummary>();
  const onboardingProfiles = new Map<string, OnboardingProfileSummary>();
  const companies = new Map<string, CompanySummary>();
  // These collections mimic the side effects the real service performs across several repositories.
  const memberships: Array<{ companyId: string; userId: string; relation: string; title: string }> = [];
  const verificationRecords: Array<{
    userId: string;
    providerRef: string;
    metadata: Record<string, unknown>;
  }> = [];

  return {
    users,
    onboardingProfiles,
    companies,
    memberships,
    verificationRecords,
    deps: {
      userRepository: {
        async findByEmail(email: string) {
          return [...users.values()].find((user) => user.email === email) ?? null;
        },
        async findByDynamicUserId(dynamicUserId: string) {
          return [...users.values()].find((user) => user.dynamicUserId === dynamicUserId) ?? null;
        },
        async findByWalletAddress(walletAddress: string) {
          return [...users.values()].find((user) => user.walletAddress === walletAddress) ?? null;
        },
        async create(data: {
          id: string;
          name: string;
          email: string;
          role: "OPERATOR" | "INVESTOR";
          bio: string;
          skills: string[];
          sectors: string[];
          outsideNetworkAccessEnabled?: boolean;
        }) {
          const user = createUserSummary({
            id: data.id,
            name: data.name,
            email: data.email,
            role: data.role.toLowerCase() as UserSummary["role"],
            bio: data.bio,
            skills: data.skills,
            sectors: data.sectors,
            outsideNetworkAccessEnabled: data.outsideNetworkAccessEnabled ?? false,
          });
          users.set(user.id, user);
          return user;
        },
        async updateProfile(
          userId: string,
          data: {
            name?: string;
            role?: "OPERATOR" | "INVESTOR";
            bio?: string;
            skills?: string[];
            sectors?: string[];
            outsideNetworkAccessEnabled?: boolean;
          },
        ) {
          const existing = users.get(userId);
          if (!existing) {
            throw new Error("User not found");
          }

          const updated = {
            ...existing,
            name: data.name ?? existing.name,
            role: (data.role?.toLowerCase() as UserSummary["role"]) ?? existing.role,
            bio: data.bio ?? existing.bio,
            skills: data.skills ?? existing.skills,
            sectors: data.sectors ?? existing.sectors,
            outsideNetworkAccessEnabled:
              data.outsideNetworkAccessEnabled ?? existing.outsideNetworkAccessEnabled,
          } satisfies UserSummary;
          users.set(userId, updated);
          return updated;
        },
        async linkWallet(userId: string, walletAddress: string, dynamicUserId?: string | null) {
          const existing = users.get(userId);
          if (!existing) {
            throw new Error("User not found");
          }

          const updated = {
            ...existing,
            walletAddress,
            dynamicUserId: dynamicUserId ?? null,
            verificationBadges: [
              ...new Set([...existing.verificationBadges, "wallet_connected" as BadgeKey]),
            ],
          } satisfies UserSummary;
          users.set(userId, updated);
          return updated;
        },
      },
      onboardingRepository: {
        async findByUserId(userId: string) {
          return onboardingProfiles.get(userId) ?? null;
        },
        async upsertByUserId(
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
        ) {
          const profile: OnboardingProfileSummary = {
            id: data.id ?? `onb_${userId}`,
            userId,
            companyId: data.companyId ?? null,
            vcCompanyId: data.vcCompanyId ?? null,
            portfolioCompanyId: data.portfolioCompanyId ?? null,
            mode: data.mode.toLowerCase() as OnboardingProfileSummary["mode"],
            title: data.title,
            isExecutive: data.isExecutive,
            executiveSignoffEmail: data.executiveSignoffEmail ?? null,
            currentStep: data.currentStep?.toLowerCase() as OnboardingProfileSummary["currentStep"],
            teamCsvUploadedAt: null,
            createdAt: "2026-04-02T09:00:00.000Z",
            updatedAt: "2026-04-02T09:00:00.000Z",
          };
          onboardingProfiles.set(userId, profile);
          return profile;
        },
      },
      companyRepository: {
        async findById(id: string) {
          return companies.get(id) ?? null;
        },
        async create(data: {
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
        }) {
          const company = createCompanySummary({
            id: data.id,
            name: data.name,
            description: data.description,
            sector: data.sector,
            stage: data.stage,
            website: data.website,
            ownerUserId: data.ownerUserId,
            currentPainTags: data.currentPainTags,
            resolvedPainTags: data.resolvedPainTags,
            companyKind: (data.companyKind ?? "PORTFOLIO").toLowerCase() as CompanySummary["companyKind"],
            parentCompanyId: data.parentCompanyId ?? null,
            outsideNetworkAccessEnabled: data.outsideNetworkAccessEnabled ?? false,
          });
          companies.set(company.id, company);
          return company;
        },
      },
      membershipRepository: {
        async create(data: {
          companyId: string;
          userId: string;
          relation: string;
          title: string;
        }) {
          memberships.push(data);
          return data;
        },
        async findByUserId(userId: string) {
          return memberships
            .filter((membership) => membership.userId === userId)
            .map((membership) => ({
              ...membership,
              company: companies.get(membership.companyId)
                ? { name: companies.get(membership.companyId)?.name ?? "Unknown company" }
                : undefined,
            }));
        },
      },
      verificationRepository: {
        async findWalletVerification(userId: string) {
          return verificationRecords.find((record) => record.userId === userId) ?? null;
        },
        async createWalletVerification(userId: string, providerRef: string, metadata: Record<string, unknown>) {
          verificationRecords.push({ userId, providerRef, metadata });
        },
      },
      idGenerator: {
        userId: vi.fn(() => "usr_dynamic"),
        onboardingId: vi.fn(() => "onb_dynamic"),
        membershipId: vi.fn(() => "mem_dynamic"),
      },
    },
  };
}

describe("dynamic registration service", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-02T09:00:00.000Z"));
  });

  it("hydrates the invited Rho portfolio user and keeps them scoped to their portfolio", async () => {
    const { deps, companies, memberships, verificationRecords } = createRepoStubs();
    const service = createDynamicRegistrationService(deps as never);

    const result = await service.register({
      dynamicUserId: "dyn_123",
      walletAddress: "0x1234567890123456789012345678901234567890",
      email: "georgegds92+1@gmail.com",
      name: "George",
    });

    expect(result.nextRoute).toBe("/agent");
    expect(result.user.role).toBe("operator");
    expect(result.user.outsideNetworkAccessEnabled).toBe(false);
    expect(result.onboardingProfile.mode).toBe("individual");
    expect(result.onboardingProfile.currentStep).toBe("complete");
    expect(result.onboardingProfile.vcCompanyId).toBe("co_invite_rho_capital");
    expect(result.onboardingProfile.portfolioCompanyId).toBe("co_invite_company_a");
    expect(companies.get("co_invite_rho_capital")?.name).toBe("Rho Capital");
    expect(companies.get("co_invite_company_a")?.name).toBe("companyA");
    expect(memberships).toContainEqual(
      expect.objectContaining({
        companyId: "co_invite_company_a",
        userId: "usr_dynamic",
        relation: "portfolio_member",
      }),
    );
    expect(verificationRecords).toEqual([
      {
        userId: "usr_dynamic",
        providerRef: "dynamic:auth:dyn_123",
        metadata: {
          walletAddress: "0x1234567890123456789012345678901234567890",
          dynamicUserId: "dyn_123",
          source: "dynamic_embedded_auth",
        },
      },
    ]);
  });

  it("routes VC invite emails into the separate onboarding path", async () => {
    const { deps, companies, memberships } = createRepoStubs();
    const service = createDynamicRegistrationService(deps as never);

    const result = await service.register({
      dynamicUserId: "dyn_vc",
      walletAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
      email: "georgegds92+3@gmail.com",
      name: "George VC",
    });

    expect(result.nextRoute).toBe("/agent");
    expect(result.user.role).toBe("investor");
    expect(result.user.outsideNetworkAccessEnabled).toBe(true);
    expect(result.onboardingProfile.mode).toBe("company");
    expect(result.onboardingProfile.currentStep).toBe("vc_company");
    expect(result.onboardingProfile.companyId).toBeNull();
    expect(companies.size).toBe(0);
    expect(memberships).toHaveLength(0);
  });

  it("falls back to the default investor onboarding path for unknown emails", async () => {
    const { deps } = createRepoStubs();
    const service = createDynamicRegistrationService(deps as never);

    const result = await service.register({
      dynamicUserId: "dyn_unknown",
      walletAddress: "0x9999999999999999999999999999999999999999",
      email: "unknown@example.com",
      name: "Unknown",
    });

    expect(result.nextRoute).toBe("/agent");
    expect(result.user.role).toBe("investor");
    expect(result.user.outsideNetworkAccessEnabled).toBe(true);
    expect(result.onboardingProfile.mode).toBe("individual");
    expect(result.onboardingProfile.currentStep).toBe("complete");
  });
});
