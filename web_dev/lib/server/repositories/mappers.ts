import {
  type AgentNotification,
  type Company,
  type NetworkPreparationJob,
  type UserSocialConnection,
  type User,
} from "@/lib/server/prisma-client";

import type {
  AgentNotificationSummary,
  CompanySummary,
  FounderAgentAction,
  NetworkPreparationJobSummary,
  UserSocialConnectionSummary,
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
    profileImageUrl: user.profileImageUrl,
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
    address: company.address,
    pointOfContactName: company.pointOfContactName,
    pointOfContactEmail: company.pointOfContactEmail,
    ownerUserId: company.ownerUserId,
    currentPainTags: company.currentPainTags,
    resolvedPainTags: company.resolvedPainTags,
    companyKind: lowerEnum(company.companyKind) as CompanySummary["companyKind"],
    parentCompanyId: company.parentCompanyId,
    outsideNetworkAccessEnabled: company.outsideNetworkAccessEnabled,
  };
}

export function toUserSocialConnectionSummary(connection: UserSocialConnection): UserSocialConnectionSummary {
  return {
    id: connection.id,
    userId: connection.userId,
    provider: lowerEnum(connection.provider) as UserSocialConnectionSummary["provider"],
    status: lowerEnum(connection.status) as UserSocialConnectionSummary["status"],
    accountLabel: connection.accountLabel,
    metadata:
      connection.metadata && typeof connection.metadata === "object" && !Array.isArray(connection.metadata)
        ? (connection.metadata as Record<string, unknown>)
        : null,
    createdAt: connection.createdAt.toISOString(),
    updatedAt: connection.updatedAt.toISOString(),
  };
}

export function toNetworkPreparationJobSummary(job: NetworkPreparationJob): NetworkPreparationJobSummary {
  return {
    id: job.id,
    userId: job.userId,
    vcCompanyId: job.vcCompanyId,
    sourceWebsite: job.sourceWebsite,
    status: lowerEnum(job.status) as NetworkPreparationJobSummary["status"],
    statusMessage: job.statusMessage,
    outputPath: job.outputPath,
    result: job.result && typeof job.result === "object" && !Array.isArray(job.result) ? (job.result as Record<string, unknown>) : null,
    errorMessage: job.errorMessage,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    startedAt: iso(job.startedAt),
    completedAt: iso(job.completedAt),
  };
}

export function toAgentNotificationSummary(notification: AgentNotification): AgentNotificationSummary {
  const metadata =
    notification.metadata && typeof notification.metadata === "object" && !Array.isArray(notification.metadata)
      ? (notification.metadata as Record<string, unknown>)
      : null;
  const actions = Array.isArray(metadata?.agentActions)
    ? (metadata?.agentActions.filter((item): item is FounderAgentAction => {
        return Boolean(
          item &&
            typeof item === "object" &&
            "id" in item &&
            "label" in item &&
            "actionType" in item &&
            "targets" in item &&
            Array.isArray((item as FounderAgentAction).targets),
        );
      }) ?? [])
    : [];

  return {
    id: notification.id,
    userId: notification.userId,
    kind: lowerEnum(notification.kind) as AgentNotificationSummary["kind"],
    source: lowerEnum(notification.source) as AgentNotificationSummary["source"],
    status: lowerEnum(notification.status) as AgentNotificationSummary["status"],
    title: notification.title,
    body: notification.body,
    targetUserId: notification.targetUserId,
    targetCompanyId: notification.targetCompanyId,
    metadata,
    agentActions: actions,
    createdAt: notification.createdAt.toISOString(),
    updatedAt: notification.updatedAt.toISOString(),
  };
}
