import { randomUUID } from "node:crypto";

import { ApiError } from "@/lib/server/http";
import { loadDashboardData, type A16zCompanyGraphNode } from "@/lib/server/meshed-network/a16z-crypto-dashboard";
import { listKnownVcOrganizations, resolveDashboardScopeForOrganization } from "@/lib/server/meshed-network/dashboard-scope";
import { prisma } from "@/lib/server/prisma";
import { companyRepository } from "@/lib/server/repositories/company-repository";
import { networkPreparationJobRepository } from "@/lib/server/repositories/network-preparation-job-repository";
import { onboardingRepository } from "@/lib/server/repositories/onboarding-repository";
import { userSocialConnectionRepository } from "@/lib/server/repositories/user-social-connection-repository";
import { userRepository } from "@/lib/server/repositories/user-repository";
import { vcNetworkPreparationAgentService } from "@/lib/server/services/vc-network-preparation-agent-service";
import { roleLabel } from "@/lib/roles";
import type {
  CompanySummary,
  NetworkPreparationJobSummary,
  OnboardingProfileSummary,
  RegistrationFlowStep,
  UserSocialConnectionSummary,
  UserSummary,
} from "@/lib/types";

type VcSelectionInput = {
  selectedCompanyId?: string | null;
  companyName?: string | null;
  website: string;
  pointOfContactName?: string | null;
  pointOfContactEmail?: string | null;
  memberCompanyName?: string | null;
  memberCompanyAddress?: string | null;
};

type SocialsInput = {
  linkedinUrl?: string | null;
  emailAddress?: string | null;
  slackWorkspace?: string | null;
  microsoftTeamsWorkspace?: string | null;
  twitterHandle?: string | null;
  calendarEmail?: string | null;
  instagramHandle?: string | null;
  currentPainPoints?: string | null;
  resolvedPainPoints?: string | null;
};

type OnboardingState = {
  user: UserSummary;
  onboardingProfile: OnboardingProfileSummary | null;
  vcCompany: CompanySummary | null;
  memberCompany: CompanySummary | null;
  vcOptions: Array<{
    id: string;
    name: string;
    website: string;
    pointOfContactName?: string | null;
    pointOfContactEmail?: string | null;
    source: "known" | "db";
  }>;
  socialConnections: UserSocialConnectionSummary[];
  latestNetworkJob: NetworkPreparationJobSummary | null;
  currentStep: RegistrationFlowStep;
  networkReady: boolean;
  knownDashboardScope: ReturnType<typeof resolveDashboardScopeForOrganization>;
};

function normalizeWebsite(input: string) {
  const trimmed = input.trim();
  if (!trimmed) {
    return "";
  }

  return /^https?:\/\//i.test(trimmed) ? trimmed.replace(/\/+$/, "") : `https://${trimmed.replace(/^\/+/, "").replace(/\/+$/, "")}`;
}

function titleForRole(role: UserSummary["role"]) {
  return roleLabel(role);
}

export function vcMembershipRelationForRole(role: UserSummary["role"]) {
  if (role === "investor") {
    return "vc_member";
  }

  if (role === "founder") {
    return "portfolio_network_member";
  }

  return "network_member";
}

export function vcMembershipTitleForRole(role: UserSummary["role"]) {
  if (role === "investor") {
    return titleForRole(role);
  }

  if (role === "founder") {
    return "Portfolio Company Founder";
  }

  return "Employee";
}

export function memberCompanyRelationForRole(role: UserSummary["role"]) {
  if (role === "founder") {
    return "portfolio_member";
  }

  return "member";
}

function requiresMemberCompany(role: UserSummary["role"]) {
  return role !== "investor";
}

function parsePainPointTags(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  if (!normalized) {
    return [];
  }

  return [...new Set(
    normalized
      .split(/\r?\n|,|;|\u2022|\|/g)
      .map((entry) => entry.trim().toLowerCase())
      .map((entry) => entry.replace(/\s+/g, " "))
      .filter(Boolean),
  )].slice(0, 5);
}

function mergeProfileValues(...groups: Array<Array<string | null | undefined> | null | undefined>) {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const group of groups) {
    for (const value of group ?? []) {
      const normalized = String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
      if (!normalized || seen.has(normalized)) {
        continue;
      }
      seen.add(normalized);
      merged.push(normalized);
    }
  }

  return merged;
}

function normalizeVcOptionName(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildVcOptionKey(input: { name?: string | null; website?: string | null }) {
  const knownScope = resolveDashboardScopeForOrganization({
    website: input.website ?? null,
    name: input.name ?? null,
  });

  if (knownScope) {
    return `scope:${knownScope}`;
  }

  const normalizedName = normalizeVcOptionName(input.name);
  if (normalizedName) {
    return `name:${normalizedName}`;
  }

  return `website:${normalizeWebsite(input.website ?? "")}`;
}

export function dedupeVcOptions(
  knownOptions: ReturnType<typeof listKnownVcOrganizations>,
  dbOptions: CompanySummary[],
) {
  const seen = new Set<string>();
  const merged: OnboardingState["vcOptions"] = [];

  for (const option of knownOptions) {
    const key = buildVcOptionKey({
      name: option.name,
      website: option.website,
    });
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push({
      id: option.id,
      name: option.name,
      website: option.website,
      source: "known",
    });
  }

  for (const company of dbOptions) {
    const key = buildVcOptionKey({
      name: company.name,
      website: company.website,
    });
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push({
      id: company.id,
      name: company.name,
      website: company.website,
      pointOfContactName: company.pointOfContactName ?? null,
      pointOfContactEmail: company.pointOfContactEmail ?? null,
      source: "db",
    });
  }

  return merged;
}

function matchCompanyNodeByName(nodes: A16zCompanyGraphNode[], companyName: string) {
  const normalized = normalizeVcOptionName(companyName);
  if (!normalized) {
    return null;
  }

  return nodes.find((node) => normalizeVcOptionName(node.companyName) === normalized) ?? null;
}

async function findKnownCompanyContext(scope: NonNullable<ReturnType<typeof resolveDashboardScopeForOrganization>>, companyName: string) {
  const dashboard = await loadDashboardData(scope);
  const matchedNode = matchCompanyNodeByName(dashboard?.companyGraph.nodes ?? [], companyName);
  if (!matchedNode) {
    return null;
  }

  return {
    sector: matchedNode.vertical?.trim() || "portfolio company",
    stage: matchedNode.stage?.trim() || "active",
    website: matchedNode.website ? normalizeWebsite(matchedNode.website) : "",
    currentPainTags: matchedNode.currentPainPointTags,
    resolvedPainTags: matchedNode.resolvedPainPointTags,
  };
}

export function resolveCurrentStep(input: {
  onboardingProfile: OnboardingProfileSummary | null;
  socialConnections: UserSocialConnectionSummary[];
  latestNetworkJob: NetworkPreparationJobSummary | null;
  knownDashboardScope: ReturnType<typeof resolveDashboardScopeForOrganization>;
}) {
  const hasSocialRows = input.socialConnections.length >= 7;

  if (!input.onboardingProfile?.vcCompanyId) {
    return "vc_company" as const;
  }

  if (input.onboardingProfile?.currentStep === "vc_company") {
    return "vc_company" as const;
  }

  if (!hasSocialRows) {
    return "socials" as const;
  }

  if (input.knownDashboardScope) {
    return "ready" as const;
  }

  if (input.latestNetworkJob?.status === "ready") {
    return "ready" as const;
  }

  if (input.onboardingProfile?.currentStep === "network_preparing") {
    return "network_preparing" as const;
  }

  if (input.latestNetworkJob?.status === "running" || input.latestNetworkJob?.status === "queued") {
    return "network_preparing" as const;
  }

  if (input.latestNetworkJob?.status === "failed") {
    return "network_preparing" as const;
  }

  return "socials" as const;
}

async function upsertCompanyMembership(input: {
  userId: string;
  companyId: string;
  relation: string;
  title: string;
}) {
  const existingMembership = await prisma.companyMembership.findFirst({
    where: {
      userId: input.userId,
      companyId: input.companyId,
      relation: input.relation,
    },
  });

  if (existingMembership) {
    if (existingMembership.title === input.title) {
      return existingMembership;
    }

    return prisma.companyMembership.update({
      where: {
        id: existingMembership.id,
      },
      data: {
        title: input.title,
      },
    });
  }

  return prisma.companyMembership.create({
    data: {
      id: `mem_vc_${randomUUID().replace(/-/g, "").slice(0, 12)}`,
      userId: input.userId,
      companyId: input.companyId,
      relation: input.relation,
      title: input.title,
    },
  });
}

async function removeCompanyMemberships(input: { userId: string; companyId?: string; relations: string[] }) {
  if (input.relations.length === 0) {
    return;
  }

  await prisma.companyMembership.deleteMany({
    where: {
      userId: input.userId,
      companyId: input.companyId,
      relation: {
        in: input.relations,
      },
    },
  });
}

async function resolveVcCompanyForUser(onboardingProfile: OnboardingProfileSummary | null) {
  if (!onboardingProfile?.vcCompanyId) {
    return null;
  }

  return companyRepository.findById(onboardingProfile.vcCompanyId);
}

async function resolveMemberCompanyForUser(onboardingProfile: OnboardingProfileSummary | null) {
  if (!onboardingProfile?.companyId) {
    return null;
  }

  return companyRepository.findById(onboardingProfile.companyId);
}

async function ensureNetworkJob(userId: string, vcCompanyId: string | null, website: string) {
  const latestJob = await networkPreparationJobRepository.findLatestByUserId(userId);
  if (
    latestJob &&
    latestJob.vcCompanyId === vcCompanyId &&
    latestJob.sourceWebsite === website &&
    (latestJob.status === "queued" || latestJob.status === "running" || latestJob.status === "ready")
  ) {
    return latestJob;
  }

  const job = await networkPreparationJobRepository.create({
    id: `job_network_${randomUUID().replace(/-/g, "").slice(0, 12)}`,
    userId,
    vcCompanyId,
    sourceWebsite: website,
    status: "QUEUED",
    statusMessage: "Queued the Meshed network preparation agent.",
  });

  await vcNetworkPreparationAgentService.enqueue(job.id);
  return job;
}

export const onboardingService = {
  async getState(userId: string): Promise<OnboardingState> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error("User not found.");
    }

    const [onboardingProfile, socialConnections, latestNetworkJob, vcCompanies] = await Promise.all([
      onboardingRepository.findByUserId(userId),
      userSocialConnectionRepository.listByUserId(userId),
      networkPreparationJobRepository.findLatestByUserId(userId),
      companyRepository.listVcCompanies(),
    ]);

    const vcCompany = await resolveVcCompanyForUser(onboardingProfile);
    const memberCompany = await resolveMemberCompanyForUser(onboardingProfile);
    const knownDashboardScope = resolveDashboardScopeForOrganization({
      website: vcCompany?.website,
      name: vcCompany?.name,
    });
    const hasSocialRows = socialConnections.length >= 7;
    const currentStep = resolveCurrentStep({
      onboardingProfile,
      socialConnections,
      latestNetworkJob,
      knownDashboardScope,
    });

    return {
      user,
      onboardingProfile,
      vcCompany,
      memberCompany,
      vcOptions: dedupeVcOptions(listKnownVcOrganizations(), vcCompanies),
      socialConnections,
      latestNetworkJob,
      currentStep,
      networkReady: hasSocialRows && (Boolean(knownDashboardScope) || latestNetworkJob?.status === "ready"),
      knownDashboardScope,
    };
  },

  async saveVcSelection(user: UserSummary, input: VcSelectionInput) {
    const existingOnboardingProfile = await onboardingRepository.findByUserId(user.id);
    let website = normalizeWebsite(input.website);
    const pointOfContactName = input.pointOfContactName?.trim() ?? "";
    const pointOfContactEmail = input.pointOfContactEmail?.trim().toLowerCase() ?? "";
    const normalizedPointOfContactName = pointOfContactName || null;
    const normalizedPointOfContactEmail = pointOfContactEmail || null;
    const memberCompanyName = input.memberCompanyName?.trim() ?? "";
    const memberCompanyAddress = input.memberCompanyAddress?.trim() ?? "";
    let vcCompany: CompanySummary | null = null;
    let memberCompany: CompanySummary | null = null;
    let selectedKnownOrganization: ReturnType<typeof listKnownVcOrganizations>[number] | null = null;

    if (requiresMemberCompany(user.role) && (!memberCompanyName || !memberCompanyAddress)) {
      throw new ApiError(400, "Tell us the company name and address you represent before continuing.");
    }

    if (input.selectedCompanyId && !input.selectedCompanyId.startsWith("known-")) {
      vcCompany = await companyRepository.findById(input.selectedCompanyId);
    }

    if (!vcCompany && input.selectedCompanyId?.startsWith("known-")) {
      const scope = input.selectedCompanyId.replace(/^known-/, "");
      const known = listKnownVcOrganizations().find((option) => option.scope === scope);
      if (known) {
        selectedKnownOrganization = known;
        if (!website) {
          website = known.website;
        }
        vcCompany = (await companyRepository.findByWebsite(known.website)) ??
          (await companyRepository.create({
            id: `co_vc_${randomUUID().replace(/-/g, "").slice(0, 12)}`,
            name: known.name,
            description: `${known.name} onboarding shell`,
            sector: "venture capital",
            stage: "active",
            website: known.website,
            pointOfContactName: normalizedPointOfContactName,
            pointOfContactEmail: normalizedPointOfContactEmail,
            ownerUserId: user.id,
            currentPainTags: [],
            resolvedPainTags: [],
            companyKind: "VC",
          }));
      }
    }

    if (!vcCompany) {
      vcCompany =
        (await companyRepository.findByWebsite(website)) ??
        (await companyRepository.create({
          id: `co_vc_${randomUUID().replace(/-/g, "").slice(0, 12)}`,
          name: input.companyName?.trim() || "New VC",
          description: `${input.companyName?.trim() || "VC"} onboarding shell`,
          sector: "venture capital",
          stage: "active",
          website,
          pointOfContactName: normalizedPointOfContactName,
          pointOfContactEmail: normalizedPointOfContactEmail,
          ownerUserId: user.id,
          currentPainTags: [],
          resolvedPainTags: [],
          companyKind: "VC",
        }));
    }

    if (!website) {
      website = selectedKnownOrganization?.website ?? vcCompany.website;
    }

    vcCompany = await companyRepository.updateContact(vcCompany.id, {
      website,
      pointOfContactName: normalizedPointOfContactName ?? undefined,
      pointOfContactEmail: normalizedPointOfContactEmail ?? undefined,
    });

    const knownDashboardScope = resolveDashboardScopeForOrganization({
      website: vcCompany.website,
      name: vcCompany.name,
    });

    if (requiresMemberCompany(user.role)) {
      const knownCompanyContext =
        knownDashboardScope && memberCompanyName
          ? await findKnownCompanyContext(knownDashboardScope, memberCompanyName)
          : null;
      const existingMemberCompany = await resolveMemberCompanyForUser(existingOnboardingProfile);
      if (existingMemberCompany) {
        memberCompany = await companyRepository.updateDetails(existingMemberCompany.id, {
          name: memberCompanyName,
          description: `${memberCompanyName} onboarding company`,
          sector: knownCompanyContext?.sector ?? existingMemberCompany.sector,
          stage: knownCompanyContext?.stage ?? existingMemberCompany.stage,
          address: memberCompanyAddress,
          website: knownCompanyContext?.website || existingMemberCompany.website || "",
          companyKind: user.role === "founder" ? "PORTFOLIO" : "OPERATING",
          parentCompanyId: user.role === "founder" ? vcCompany.id : null,
        });
      } else {
        const matchedCompany = await companyRepository.findByName(memberCompanyName);
        if (matchedCompany) {
          memberCompany = await companyRepository.updateDetails(matchedCompany.id, {
            name: memberCompanyName,
            description: matchedCompany.description || `${memberCompanyName} onboarding company`,
            sector: knownCompanyContext?.sector ?? matchedCompany.sector,
            stage: knownCompanyContext?.stage ?? matchedCompany.stage,
            address: memberCompanyAddress,
            website: knownCompanyContext?.website || matchedCompany.website || "",
            companyKind: user.role === "founder" ? "PORTFOLIO" : "OPERATING",
            parentCompanyId: user.role === "founder" ? vcCompany.id : null,
          });
        } else {
          memberCompany = await companyRepository.create({
            id: `co_member_${randomUUID().replace(/-/g, "").slice(0, 12)}`,
            name: memberCompanyName,
            description: `${memberCompanyName} onboarding company`,
            sector: knownCompanyContext?.sector ?? (user.role === "founder" ? "portfolio company" : "operating company"),
            stage: knownCompanyContext?.stage ?? "active",
            website: knownCompanyContext?.website ?? "",
            address: memberCompanyAddress,
            ownerUserId: user.id,
            currentPainTags: knownCompanyContext?.currentPainTags ?? [],
            resolvedPainTags: knownCompanyContext?.resolvedPainTags ?? [],
            companyKind: user.role === "founder" ? "PORTFOLIO" : "OPERATING",
            parentCompanyId: user.role === "founder" ? vcCompany.id : null,
          });
        }
      }

      if (memberCompany && knownCompanyContext) {
        memberCompany = await companyRepository.updatePainTags(memberCompany.id, {
          currentPainTags: knownCompanyContext.currentPainTags,
          resolvedPainTags: knownCompanyContext.resolvedPainTags,
        });
      }
    }

    await removeCompanyMemberships({
      userId: user.id,
      companyId: vcCompany.id,
      relations: ["vc_member", "portfolio_network_member", "network_member"],
    });
    await upsertCompanyMembership({
      userId: user.id,
      companyId: vcCompany.id,
      relation: vcMembershipRelationForRole(user.role),
      title: vcMembershipTitleForRole(user.role),
    });

    if (memberCompany) {
      const memberRelation = memberCompanyRelationForRole(user.role);
      await removeCompanyMemberships({
        userId: user.id,
        companyId: memberCompany.id,
        relations: ["member", "portfolio_member"],
      });
      await upsertCompanyMembership({
        userId: user.id,
        companyId: memberCompany.id,
        relation: memberRelation,
        title: titleForRole(user.role),
      });
    }

    const onboardingProfile = await onboardingRepository.upsertByUserId(user.id, {
      id: `onb_${user.id}`,
      companyId: memberCompany?.id ?? existingOnboardingProfile?.companyId ?? null,
      vcCompanyId: vcCompany.id,
      mode: "INDIVIDUAL",
      title: titleForRole(user.role),
      isExecutive: user.role === "investor",
      currentStep: "SOCIALS",
    });

    const networkJob = knownDashboardScope ? null : await ensureNetworkJob(user.id, vcCompany.id, website);

    return {
      onboardingProfile,
      vcCompany,
      memberCompany,
      networkJob,
      nextStep: "socials" as const,
    };
  },

  async saveSocials(user: UserSummary, input: SocialsInput) {
    const linkedinUrl = input.linkedinUrl?.trim() ? input.linkedinUrl.trim() : null;
    const socialConnections = await userSocialConnectionRepository.upsertMany(user.id, [
      {
        id: `soc_${randomUUID().replace(/-/g, "").slice(0, 12)}`,
        provider: "LINKEDIN",
        status: linkedinUrl ? "CONNECTED" : "SKIPPED",
        accountLabel: linkedinUrl,
      },
      {
        id: `soc_${randomUUID().replace(/-/g, "").slice(0, 12)}`,
        provider: "EMAIL",
        status: input.emailAddress?.trim() ? "CONNECTED" : "SKIPPED",
        accountLabel: input.emailAddress?.trim() || null,
      },
      {
        id: `soc_${randomUUID().replace(/-/g, "").slice(0, 12)}`,
        provider: "SLACK",
        status: input.slackWorkspace?.trim() ? "CONNECTED" : "SKIPPED",
        accountLabel: input.slackWorkspace?.trim() || null,
      },
      {
        id: `soc_${randomUUID().replace(/-/g, "").slice(0, 12)}`,
        provider: "MICROSOFT_TEAMS",
        status: input.microsoftTeamsWorkspace?.trim() ? "CONNECTED" : "SKIPPED",
        accountLabel: input.microsoftTeamsWorkspace?.trim() || null,
      },
      {
        id: `soc_${randomUUID().replace(/-/g, "").slice(0, 12)}`,
        provider: "TWITTER",
        status: input.twitterHandle?.trim() ? "CONNECTED" : "SKIPPED",
        accountLabel: input.twitterHandle?.trim() || null,
      },
      {
        id: `soc_${randomUUID().replace(/-/g, "").slice(0, 12)}`,
        provider: "CALENDAR",
        status: input.calendarEmail?.trim() ? "CONNECTED" : "SKIPPED",
        accountLabel: input.calendarEmail?.trim() || null,
      },
      {
        id: `soc_${randomUUID().replace(/-/g, "").slice(0, 12)}`,
        provider: "INSTAGRAM",
        status: input.instagramHandle?.trim() ? "CONNECTED" : "SKIPPED",
        accountLabel: input.instagramHandle?.trim() || null,
      },
    ]);

    const onboardingProfileState = await onboardingRepository.findByUserId(user.id);
    const vcCompany = await resolveVcCompanyForUser(onboardingProfileState);
    const memberCompany = await resolveMemberCompanyForUser(onboardingProfileState);
    const painPointCompany = memberCompany ?? vcCompany;
    const currentPainTags = parsePainPointTags(input.currentPainPoints);
    const resolvedPainTags = parsePainPointTags(input.resolvedPainPoints);

    if (painPointCompany) {
      await companyRepository.updatePainTags(painPointCompany.id, {
        currentPainTags,
        resolvedPainTags,
      });
    }

    const derivedSkills = mergeProfileValues(user.skills, resolvedPainTags);
    const derivedSectors = mergeProfileValues(
      user.sectors,
      memberCompany?.sector ? [memberCompany.sector] : [],
      vcCompany?.sector ? [vcCompany.sector] : [],
    );

    const shouldUpdateProfile =
      (linkedinUrl ?? null) !== (user.linkedinUrl ?? null) ||
      JSON.stringify(derivedSkills) !== JSON.stringify(user.skills) ||
      JSON.stringify(derivedSectors) !== JSON.stringify(user.sectors);

    if (shouldUpdateProfile) {
      await userRepository.updateProfile(user.id, {
        linkedinUrl,
        skills: derivedSkills,
        sectors: derivedSectors,
      });
    }

    const knownDashboardScope = resolveDashboardScopeForOrganization({
      website: vcCompany?.website,
      name: vcCompany?.name,
    });
    const latestNetworkJob = await networkPreparationJobRepository.findLatestByUserId(user.id);
    const networkReady = Boolean(knownDashboardScope) || latestNetworkJob?.status === "ready";
    const currentStep = networkReady ? "READY" : "NETWORK_PREPARING";

    const onboardingProfile = await onboardingRepository.upsertByUserId(user.id, {
      id: `onb_${user.id}`,
      mode: "INDIVIDUAL",
      title: titleForRole(user.role),
      isExecutive: user.role === "investor",
      currentStep,
    });

    return {
      socialConnections,
      onboardingProfile,
      networkReady,
      nextRoute: networkReady ? "/dashboard" : "/agent",
    };
  },

  async restartNetworkPreparation(user: UserSummary) {
    const state = await this.getState(user.id);
    if (!state.vcCompany) {
      throw new Error("Choose a VC before starting network preparation.");
    }

    const networkJob = await ensureNetworkJob(user.id, state.vcCompany.id, state.vcCompany.website);
    await onboardingRepository.upsertByUserId(user.id, {
      id: state.onboardingProfile?.id ?? `onb_${user.id}`,
      vcCompanyId: state.vcCompany.id,
      mode: "INDIVIDUAL",
      title: titleForRole(user.role),
      isExecutive: user.role === "investor",
      currentStep: "NETWORK_PREPARING",
    });

    return networkJob;
  },
};
