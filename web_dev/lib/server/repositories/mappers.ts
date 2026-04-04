import {
  type Company,
  type User,
} from "@/lib/server/prisma-client";

import type {
  CompanySummary,
  UserSummary,
} from "@/lib/types";

// Centralize DB-record-to-summary mapping so repositories return the same serialized shapes everywhere.
function lowerEnum<T extends string>(value: T) {
  return value.toLowerCase();
}

function iso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

export function toUserSummary(user: User): UserSummary {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: lowerEnum(user.role) as UserSummary["role"],
    bio: user.bio,
    skills: user.skills,
    sectors: user.sectors,
    linkedinUrl: user.linkedinUrl,
    walletAddress: user.walletAddress,
    worldVerified: user.worldVerified,
    dynamicUserId: user.dynamicUserId,
    engagementScore: user.engagementScore,
    reliabilityScore: user.reliabilityScore,
    verificationBadges: user.verificationBadges as UserSummary["verificationBadges"],
    outsideNetworkAccessEnabled: user.outsideNetworkAccessEnabled,
    createdAt: user.createdAt.toISOString(),
    lastActiveAt: iso(user.lastActiveAt),
  };
}

export function toCompanySummary(company: Company): CompanySummary {
  return {
    id: company.id,
    name: company.name,
    description: company.description,
    sector: company.sector,
    stage: company.stage,
    website: company.website,
    ownerUserId: company.ownerUserId,
    currentPainTags: company.currentPainTags,
    resolvedPainTags: company.resolvedPainTags,
    companyKind: lowerEnum(company.companyKind) as CompanySummary["companyKind"],
    parentCompanyId: company.parentCompanyId,
    outsideNetworkAccessEnabled: company.outsideNetworkAccessEnabled,
  };
}
