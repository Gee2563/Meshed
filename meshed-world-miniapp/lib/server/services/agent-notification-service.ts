import { randomUUID } from "node:crypto";

import { ApiError } from "@/lib/server/http";
import { loadDashboardData, type A16zCompanyGraphNode, type A16zCompanyGraphPerson } from "@/lib/server/meshed-network/a16z-crypto-dashboard";
import {
  resolveDashboardScopeForEmail,
  resolveDashboardScopeForOrganization,
  type MeshedDashboardScope,
} from "@/lib/server/meshed-network/dashboard-scope";
import { prisma } from "@/lib/server/prisma";
import {
  agentNotificationRepository,
  notificationMetadataWithActions,
} from "@/lib/server/repositories/agent-notification-repository";
import { userRepository } from "@/lib/server/repositories/user-repository";
import { linkedinActivityService } from "@/lib/server/services/linkedin-activity-service";
import { meshedFounderAgentActionService } from "@/lib/server/services/meshed-founder-agent-action-service";
import { verifiedInteractionService } from "@/lib/server/services/verified-interaction-service";
import type {
  AgentNotificationSummary,
  FounderAgentAction,
  FounderAgentActionTarget,
  UserSummary,
  VerifiedInteractionSummary,
} from "@/lib/types";

type MembershipWithCompany = Awaited<
  ReturnType<
    typeof prisma.companyMembership.findMany<{
      include: {
        company: true;
      };
    }>
  >
>[number];

type AgentNotificationServiceDependencies = {
  prisma: typeof prisma;
  userRepository: typeof userRepository;
  verifiedInteractionService: Pick<typeof verifiedInteractionService, "listRecentForUser">;
  linkedinActivityService: Pick<typeof linkedinActivityService, "listNotificationsForUser">;
  meshedFounderAgentActionService: Pick<typeof meshedFounderAgentActionService, "execute">;
  agentNotificationRepository: typeof agentNotificationRepository;
  loadDashboardData: typeof loadDashboardData;
};

type AgentNotificationDraft = {
  id: string;
  userId: string;
  kind: "PAIN_POINT_MATCH" | "SOCIAL_SIGNAL" | "COORDINATION_PROMPT";
  source: "MESHED_GRAPH" | "LINKEDIN_SIGNAL" | "EXTERNAL_SOCIAL";
  dedupeKey: string;
  title: string;
  body: string;
  targetUserId?: string | null;
  targetCompanyId?: string | null;
  metadata?: Record<string, unknown> | null;
};

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function normalizeTag(value: string | null | undefined) {
  return normalize(value).replace(/\s+/g, " ");
}

function uniqueTags(tags: string[]) {
  return [...new Set(tags.map((tag) => normalizeTag(tag)).filter(Boolean))];
}

function sourceLabel(source: AgentNotificationSummary["source"]) {
  switch (source) {
    case "linkedin_signal":
      return "LinkedIn signal";
    case "external_social":
      return "External social";
    default:
      return "Meshed graph";
  }
}

function titleCaseWords(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatFocusLabel(value: string) {
  return titleCaseWords(normalizeTag(value));
}

function formatInteractionLabel(value: string) {
  return titleCaseWords(value.replaceAll("_", " ").toLowerCase());
}

function buildAction(idPrefix: string, label: string, targets: FounderAgentActionTarget[]): FounderAgentAction {
  return {
    id: `${idPrefix}_${randomUUID().replace(/-/g, "").slice(0, 10)}`,
    label,
    actionType: "QUEUE_OUTREACH",
    description: "Let your Meshed agent turn this into a verified human handoff.",
    targets,
  };
}

function personPainText(person: A16zCompanyGraphPerson) {
  return normalize(person.resolvedPainPointsLabel) || normalize(person.currentPainPointLabel);
}

function resolvePrimaryMembership(memberships: MembershipWithCompany[]) {
  return (
    memberships.find((membership) => membership.relation === "portfolio_member") ??
    memberships.find((membership) => membership.relation === "member") ??
    memberships.find((membership) => membership.relation === "portfolio_network_member") ??
    memberships.find((membership) => membership.relation === "vc_member") ??
    memberships.find((membership) => membership.relation === "network_member") ??
    memberships[0] ??
    null
  );
}

function selectScope(currentUser: UserSummary, memberships: MembershipWithCompany[], onboardingProfile: { vcCompanyId: string | null } | null) {
  const vcMembership = memberships.find((membership) => membership.companyId === onboardingProfile?.vcCompanyId);
  const scopeFromMemberships = memberships
    .map((membership) =>
      resolveDashboardScopeForOrganization({
        website: membership.company.website,
        name: membership.company.name,
      }),
    )
    .find(Boolean);

  return (
    resolveDashboardScopeForOrganization({
      website: vcMembership?.company.website,
      name: vcMembership?.company.name,
    }) ??
    scopeFromMemberships ??
    resolveDashboardScopeForEmail(currentUser.email)
  );
}

function matchGraphNodeByPainTag(nodes: A16zCompanyGraphNode[], primaryCompanyName: string | null, tag: string) {
  const normalizedPrimaryCompany = normalize(primaryCompanyName);
  const normalizedTag = normalizeTag(tag);

  const scored = nodes
    .filter((node) => normalize(node.companyName) !== normalizedPrimaryCompany)
    .map((node) => {
      const resolvedMatch = node.resolvedPainPointTags.some((candidate) => normalizeTag(candidate) === normalizedTag);
      const currentMatch = node.currentPainPointTags.some((candidate) => normalizeTag(candidate) === normalizedTag);
      const matchingPerson =
        node.people.find((person) => personPainText(person).includes(normalizedTag)) ?? node.people[0] ?? null;

      return {
        node,
        matchingPerson,
        score: (resolvedMatch ? 10 : 0) + (currentMatch ? 5 : 0) + node.degree + (matchingPerson?.networkImportanceScore ?? 0) / 10,
      };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score);

  return scored[0] ?? null;
}

function bestMeshedUserMatch(currentUser: UserSummary, demoUsers: UserSummary[], painTags: string[]) {
  const normalizedPainTags = painTags.map(normalizeTag);

  const scored = demoUsers
    .filter((candidate) => candidate.id !== currentUser.id)
    .filter((candidate) => candidate.role === "investor" || candidate.role === "founder" || candidate.role === "employee")
    .filter((candidate) => candidate.worldVerified)
    .map((candidate) => {
      const sharedSectors = candidate.sectors.filter((sector) =>
        currentUser.sectors.some((userSector) => normalize(userSector) === normalize(sector)),
      ).length;
      const painOverlap = candidate.skills.filter((skill) =>
        normalizedPainTags.some((tag) => normalize(skill).includes(tag) || tag.includes(normalize(skill))),
      ).length;

      return {
        candidate,
        score: sharedSectors * 5 + painOverlap * 8 + candidate.engagementScore + candidate.reliabilityScore,
      };
    })
    .sort((left, right) => right.score - left.score);

  return scored[0]?.candidate ?? null;
}

function queueDraft(
  drafts: AgentNotificationDraft[],
  seenKeys: Set<string>,
  draft: AgentNotificationDraft,
) {
  if (seenKeys.has(draft.dedupeKey)) {
    return;
  }

  seenKeys.add(draft.dedupeKey);
  drafts.push(draft);
}

function graphActionTarget(node: A16zCompanyGraphNode, person?: A16zCompanyGraphPerson | null): FounderAgentActionTarget {
  if (person) {
    return {
      kind: "person",
      personId: person.id,
      personName: person.name,
      companyId: node.companyId,
      companyName: node.companyName,
    };
  }

  return {
    kind: "company",
    companyId: node.companyId,
    companyName: node.companyName,
  };
}

function graphFocusLabel(node: A16zCompanyGraphNode, fallback: string) {
  return node.resolvedPainPointTags[0] ?? node.currentPainPointTags[0] ?? fallback;
}

export function createAgentNotificationService(deps: AgentNotificationServiceDependencies) {
  return {
    async syncForUser(userId: string) {
      const currentUser = await deps.userRepository.findById(userId);
      if (!currentUser) {
        throw new ApiError(404, "User not found.");
      }

      const [onboardingProfile, memberships, socialConnections, recentInteractions, linkedinSignals, demoUsers] =
        await Promise.all([
          deps.prisma.onboardingProfile.findUnique({
            where: { userId },
            select: {
              vcCompanyId: true,
            },
          }),
          deps.prisma.companyMembership.findMany({
            where: { userId },
            include: {
              company: true,
            },
            orderBy: [{ createdAt: "asc" }],
          }),
          deps.prisma.userSocialConnection.findMany({
            where: {
              userId,
              status: "CONNECTED",
            },
          }),
          deps.verifiedInteractionService.listRecentForUser(userId, 5),
          deps.linkedinActivityService.listNotificationsForUser(userId),
          deps.userRepository.listDemoUsers(),
        ]);

      const primaryMembership = resolvePrimaryMembership(memberships);
      const primaryCompany = primaryMembership?.company ?? null;
      const painTags = uniqueTags(primaryCompany?.currentPainTags ?? []);
      const scope = selectScope(currentUser, memberships, onboardingProfile);
      const dashboard = scope ? await deps.loadDashboardData(scope as MeshedDashboardScope) : null;
      const drafts: AgentNotificationDraft[] = [];
      const seenDedupeKeys = new Set<string>();

      for (const tag of painTags.slice(0, 2)) {
        if (!dashboard?.companyGraph?.nodes?.length) {
          continue;
        }

        const match = matchGraphNodeByPainTag(dashboard.companyGraph.nodes, primaryCompany?.name ?? null, tag);
        if (!match) {
          continue;
        }

        const actionTarget: FounderAgentActionTarget = match.matchingPerson
          ? {
              kind: "person",
              personId: match.matchingPerson.id,
              personName: match.matchingPerson.name,
              companyId: match.node.companyId,
              companyName: match.node.companyName,
            }
          : {
              kind: "company",
              companyId: match.node.companyId,
              companyName: match.node.companyName,
            };
        const action = buildAction(
          "notif_pain",
          `Have my agent open an intro to ${match.matchingPerson?.name ?? match.node.companyName}`,
          [actionTarget],
        );
        const body = match.matchingPerson
          ? `${match.matchingPerson.name} at ${match.node.companyName} looks especially relevant for ${formatFocusLabel(tag)}. Meshed found a credible path through your network, and your agent can start the intro with a verified human handoff.`
          : `${match.node.companyName} is surfacing strong adjacency around ${formatFocusLabel(tag)} in the Meshed graph. Your agent can open with a company-level outreach and route it into the right verified human connection.`;

        queueDraft(drafts, seenDedupeKeys, {
          id: `notif_${randomUUID().replace(/-/g, "").slice(0, 14)}`,
          userId,
          kind: "PAIN_POINT_MATCH",
          source: "MESHED_GRAPH",
          dedupeKey: `pain:${userId}:${scope ?? "none"}:${tag}:${match.matchingPerson?.id ?? match.node.companyId}`,
          title: `${formatFocusLabel(tag)} help surfaced in ${match.node.companyName}`,
          body,
          targetCompanyId: null,
          metadata: notificationMetadataWithActions(
            {
              painPointTag: tag,
              scope,
              graphCompanyId: match.node.companyId,
              graphCompanyName: match.node.companyName,
              matchingPersonName: match.matchingPerson?.name ?? null,
            },
            [action],
          ),
        });
      }

      for (const signal of linkedinSignals.slice(0, 2)) {
        const action = buildAction(
          "notif_social",
          `Have my agent follow up with ${signal.counterpartName}`,
          [
            {
              kind: "person",
              personId: signal.counterpartUserId,
              personName: signal.counterpartName,
            },
          ],
        );

        queueDraft(drafts, seenDedupeKeys, {
          id: `notif_${randomUUID().replace(/-/g, "").slice(0, 14)}`,
          userId,
          kind: "SOCIAL_SIGNAL",
          source: "LINKEDIN_SIGNAL",
          dedupeKey: `social:${userId}:${signal.counterpartUserId}`,
          title: `${signal.counterpartName} is already moving inside Meshed`,
          body: `${signal.messagePreview} Your Meshed agent can pick this up now and turn it into a verified human follow-up while the signal is fresh.`,
          targetUserId: signal.counterpartUserId,
          metadata: notificationMetadataWithActions(
            {
              direction: signal.direction,
              linkedinAction: signal.action,
              receivedAt: signal.receivedAt,
            },
            [action],
          ),
        });
      }

      const bestMatch = socialConnections.length >= 2 ? bestMeshedUserMatch(currentUser, demoUsers, painTags) : null;
      if (socialConnections.length >= 2) {
        if (bestMatch) {
          const lastInteractionAt = recentInteractions[0]?.createdAt ? new Date(recentInteractions[0].createdAt) : null;
          const daysSinceLastInteraction = lastInteractionAt
            ? Math.floor((Date.now() - lastInteractionAt.getTime()) / (1000 * 60 * 60 * 24))
            : null;
          const shouldNudge = daysSinceLastInteraction === null || daysSinceLastInteraction >= 3;

          if (shouldNudge) {
            const action = buildAction(
              "notif_coordination",
              `Have my agent coordinate with ${bestMatch.name}`,
              [
                {
                  kind: "person",
                  personId: bestMatch.id,
                  personName: bestMatch.name,
                  companyName: bestMatch.sectors[0] ?? null,
                },
              ],
            );
            const focus = painTags[0] ?? currentUser.sectors[0] ?? "your current priorities";

            queueDraft(drafts, seenDedupeKeys, {
              id: `notif_${randomUUID().replace(/-/g, "").slice(0, 14)}`,
              userId,
              kind: "COORDINATION_PROMPT",
              source: "MESHED_GRAPH",
              dedupeKey: `coordination:${userId}:${bestMatch.id}:${focus}`,
              title: "A strong coordination path is ready",
              body: `With ${socialConnections.length} connected channels, your agent can proactively coordinate a warm, verified handoff to ${bestMatch.name} around ${formatFocusLabel(focus)}.`,
              targetUserId: bestMatch.id,
              metadata: notificationMetadataWithActions(
                {
                  suggestedBy: "meshed_coordination_engine",
                  focus,
                  connectedChannels: socialConnections.map((connection) => connection.provider.toLowerCase()),
                },
                [action],
              ),
            });
          }
        }
      }

      const graphNodes = (dashboard?.companyGraph.nodes ?? [])
        .filter((node) => normalize(node.companyName) !== normalize(primaryCompany?.name))
        .sort((left, right) => right.degree - left.degree);

      for (const node of graphNodes) {
        if (drafts.length >= 5) {
          break;
        }

        const contact = node.people[0] ?? null;
        const focus = graphFocusLabel(node, currentUser.sectors[0] ?? "your current focus");
        const action = buildAction(
          "notif_graph",
          `Have my agent open a warm path to ${contact?.name ?? node.companyName}`,
          [graphActionTarget(node, contact)],
        );

        queueDraft(drafts, seenDedupeKeys, {
          id: `notif_${randomUUID().replace(/-/g, "").slice(0, 14)}`,
          userId,
          kind: "PAIN_POINT_MATCH",
          source: "MESHED_GRAPH",
          dedupeKey: `graph-opportunity:${userId}:${scope ?? "none"}:${node.companyId}`,
          title: `${node.companyName} looks like a timely Meshed opportunity`,
          body: `${node.companyName} is showing ${node.degree} strong relationship signals around ${formatFocusLabel(focus)}. ${contact?.name ? `A warm path through ${contact.name} looks especially promising.` : "Your agent can open with a company-level handoff and route it to the right human."}`,
          targetCompanyId: null,
          metadata: notificationMetadataWithActions(
            {
              focus,
              graphCompanyId: node.companyId,
              graphCompanyName: node.companyName,
              nodeDegree: node.degree,
              matchingPersonName: contact?.name ?? null,
              sourceLabel: sourceLabel("meshed_graph"),
            },
            [action],
          ),
        });
      }

      if (drafts.length < 5 && bestMatch) {
        const focus = painTags[0] ?? currentUser.sectors[0] ?? "your current priorities";
        const action = buildAction(
          "notif_social_ready",
          `Have my agent coordinate next steps with ${bestMatch.name}`,
          [
            {
              kind: "person",
              personId: bestMatch.id,
              personName: bestMatch.name,
              companyName: bestMatch.sectors[0] ?? null,
            },
          ],
        );

        queueDraft(drafts, seenDedupeKeys, {
          id: `notif_${randomUUID().replace(/-/g, "").slice(0, 14)}`,
          userId,
          kind: "COORDINATION_PROMPT",
          source: "MESHED_GRAPH",
          dedupeKey: `social-ready:${userId}:${bestMatch.id}:${focus}`,
          title: "Your connected channels unlocked a high-confidence intro",
          body: `Now that your communication channels are connected, your agent can proactively organize a verified human handoff with ${bestMatch.name} around ${formatFocusLabel(focus)}.`,
          targetUserId: bestMatch.id,
          metadata: notificationMetadataWithActions(
            {
              focus,
              connectedChannels: socialConnections.map((connection) => connection.provider.toLowerCase()),
            },
            [action],
          ),
        });
      }

      if (drafts.length < 5 && recentInteractions.length > 0) {
        const counterpart = demoUsers.find((candidate) => candidate.id === recentInteractions[0]?.targetUserId) ?? bestMatch ?? null;
        if (counterpart) {
          const latestInteraction = recentInteractions[0] as VerifiedInteractionSummary;
          const action = buildAction(
            "notif_follow_up",
            `Have my agent follow up with ${counterpart.name}`,
            [
              {
                kind: "person",
                personId: counterpart.id,
                personName: counterpart.name,
                companyName: counterpart.sectors[0] ?? null,
              },
            ],
          );

          queueDraft(drafts, seenDedupeKeys, {
            id: `notif_${randomUUID().replace(/-/g, "").slice(0, 14)}`,
            userId,
            kind: "COORDINATION_PROMPT",
            source: "MESHED_GRAPH",
            dedupeKey: `interaction-follow-up:${userId}:${latestInteraction.id}:${counterpart.id}`,
            title: "One recent interaction is worth advancing now",
            body: `Your recent ${formatInteractionLabel(latestInteraction.interactionType)} with ${counterpart.name} is a good moment to follow through. Your agent can turn it into the next concrete step while the signal is still fresh.`,
            targetUserId: counterpart.id,
            metadata: notificationMetadataWithActions(
              {
                interactionId: latestInteraction.id,
                interactionType: latestInteraction.interactionType,
                rewardStatus: latestInteraction.rewardStatus,
              },
              [action],
            ),
          });
        }
      }

      for (const draft of drafts.slice(0, 5)) {
        await deps.agentNotificationRepository.upsertByDedupeKey(draft);
      }

      return deps.agentNotificationRepository.listByUserId(userId);
    },

    async acceptNotification(user: UserSummary, input: { notificationId: string; actionId?: string | null }) {
      const notification = await deps.agentNotificationRepository.findByIdForUser(input.notificationId, user.id);
      if (!notification) {
        throw new ApiError(404, "Notification not found.");
      }

      const action =
        notification.agentActions.find((candidate) => candidate.id === input.actionId) ??
        notification.agentActions[0] ??
        null;

      if (!action) {
        throw new ApiError(400, "This notification does not include an executable agent action.");
      }

      const execution = await deps.meshedFounderAgentActionService.execute(user, action);
      const updatedNotification = await deps.agentNotificationRepository.markStatus(notification.id, user.id, "ACTED_ON");

      if (!updatedNotification) {
        throw new ApiError(404, "Notification could not be updated after execution.");
      }

      return {
        notification: updatedNotification,
        execution,
      };
    },
  };
}

export const agentNotificationService = createAgentNotificationService({
  prisma,
  userRepository,
  verifiedInteractionService,
  linkedinActivityService,
  meshedFounderAgentActionService,
  agentNotificationRepository,
  loadDashboardData,
});
