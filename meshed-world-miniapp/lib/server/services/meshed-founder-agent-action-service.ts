import { ApiError } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";
import { userRepository } from "@/lib/server/repositories/user-repository";
import { connectionRequestService } from "@/lib/server/services/connection-request-service";
import { verifiedInteractionService } from "@/lib/server/services/verified-interaction-service";
import type {
  ConnectionRequestSummary,
  FounderAgentAction,
  FounderAgentActionTarget,
  UserSummary,
  VerifiedInteractionSummary,
} from "@/lib/types";

export type FounderAgentActionEffect =
  | {
      type: "queue_graph_contact";
      target: FounderAgentActionTarget;
    }
  | {
      type: "open_network_entity";
      target: FounderAgentActionTarget;
    };

export type ExecuteFounderAgentActionResult = {
  message: string;
  effects: FounderAgentActionEffect[];
  interactions: VerifiedInteractionSummary[];
  requests: ConnectionRequestSummary[];
};

type MeshedFounderAgentActionServiceDependencies = {
  userRepository: {
    listDemoUsers(): Promise<UserSummary[]>;
  };
  connectionRequestService: {
    createRequest(
      requesterUserId: string,
      input: {
        recipientUserId: string;
        type: "intro" | "consulting" | "mentorship" | "investment" | "endorsement";
        message?: string | null;
        companyId?: string | null;
        metadata?: Record<string, unknown> | null;
      },
    ): Promise<{
      request: ConnectionRequestSummary;
      interaction: VerifiedInteractionSummary;
    }>;
  };
  verifiedInteractionService: {
    recordInteraction(input: {
      interactionType: VerifiedInteractionSummary["interactionType"];
      actorUserId: string;
      targetUserId?: string | null;
      companyId?: string | null;
      metadata?: Record<string, unknown> | null;
    }): Promise<VerifiedInteractionSummary>;
    listRecentForUser(userId: string, limit?: number): Promise<VerifiedInteractionSummary[]>;
  };
  prisma: typeof prisma;
};

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function targetName(target: FounderAgentActionTarget) {
  return target.personName ?? target.partnerName ?? target.companyName ?? "the recommended entity";
}

function buildOutreachMessage(currentUserName: string, target: FounderAgentActionTarget) {
  const name = targetName(target);
  const company = target.companyName ? ` at ${target.companyName}` : "";
  return `Meshed Agent recommends a verified intro from ${currentUserName} to ${name}${company}.`;
}

function summarizeInteractions(interactions: VerifiedInteractionSummary[]) {
  if (interactions.length === 0) {
    return "You do not have any verified interactions yet. The fastest next step is to accept one agent outreach action to start the trust trail.";
  }

  const summary = interactions
    .slice(0, 3)
    .map((interaction) => {
      const reward = interaction.rewardStatus === "NOT_REWARDABLE" ? "not rewardable yet" : interaction.rewardStatus.toLowerCase();
      return `${interaction.interactionType.replaceAll("_", " ")} on ${new Date(interaction.createdAt).toLocaleDateString("en-US")} (${reward})`;
    })
    .join("; ");

  return `Recent verified interactions: ${summary}.`;
}

async function buildFounderBrief(
  deps: MeshedFounderAgentActionServiceDependencies,
  currentUser: UserSummary,
  action: FounderAgentAction,
) {
  const memberships = await deps.prisma.companyMembership.findMany({
    where: { userId: currentUser.id },
    include: {
      company: true,
    },
    orderBy: [{ createdAt: "asc" }],
    take: 2,
  });

  const primaryMembership = memberships[0];
  const companyName = primaryMembership?.company.name ?? "your startup";
  const sector = primaryMembership?.company.sector ?? currentUser.sectors[0] ?? "your current sector";
  const stage = primaryMembership?.company.stage ?? "your current stage";
  const currentPainTags = primaryMembership?.company.currentPainTags.slice(0, 2) ?? [];
  const counterparts = action.targets.map(targetName);
  const counterpartLabel = counterparts.length > 0 ? counterparts.join(", ") : "the recommended contacts";

  const bullets = [
    `${companyName} is a ${stage} company in ${sector}, and Meshed is surfacing this outreach because there is already graph evidence for a useful connection.`,
    currentPainTags.length > 0
      ? `Current founder priorities: ${currentPainTags.join(", ")}. Position the conversation around how Meshed can turn those into faster introductions and better execution support.`
      : `Lead with the founder's strongest operator signals: ${currentUser.skills.slice(0, 3).join(", ") || "network leverage, execution support, and proactive coordination"}.`,
    `Ask ${counterpartLabel} for one concrete next step: an intro, investor perspective, partnership angle, or a follow-up meeting with a verified human owner.`,
  ];

  return [
    `I drafted a concise founder brief for ${counterpartLabel}:`,
    ...bullets.map((bullet, index) => `${index + 1}. ${bullet}`),
  ].join("\n");
}

async function resolveTargetUser(
  deps: MeshedFounderAgentActionServiceDependencies,
  currentUserId: string,
  target: FounderAgentActionTarget,
) {
  const candidateName = normalize(target.personName ?? target.partnerName);
  if (!candidateName) {
    return null;
  }

  const users = await deps.userRepository.listDemoUsers();
  return (
    users.find(
      (user) =>
        user.id !== currentUserId &&
        normalize(user.name) === candidateName &&
        (!target.companyName || normalize(user.bio).includes(normalize(target.companyName)) || user.sectors.some((sector) => normalize(sector) === normalize(target.companyName))),
    ) ??
    users.find((user) => user.id !== currentUserId && normalize(user.name) === candidateName) ??
    null
  );
}

export function createMeshedFounderAgentActionService(deps: MeshedFounderAgentActionServiceDependencies) {
  return {
    async execute(currentUser: UserSummary, action: FounderAgentAction): Promise<ExecuteFounderAgentActionResult> {
      if (!action.label.trim()) {
        throw new ApiError(400, "Agent action label is required.");
      }

      if (action.actionType === "OPEN_NETWORK_ENTITY") {
        const target = action.targets[0];
        if (!target) {
          throw new ApiError(400, "This agent action does not include an entity to open.");
        }

        return {
          message: `Opened ${targetName(target)} from the Meshed network graph.`,
          effects: [{ type: "open_network_entity", target }],
          interactions: [],
          requests: [],
        };
      }

      if (action.actionType === "REVIEW_VERIFIED_INTERACTIONS") {
        const interactions = await deps.verifiedInteractionService.listRecentForUser(currentUser.id, 5);
        return {
          message: summarizeInteractions(interactions),
          effects: [],
          interactions,
          requests: [],
        };
      }

      if (action.actionType === "DRAFT_FOUNDER_BRIEF") {
        return {
          message: await buildFounderBrief(deps, currentUser, action),
          effects: [],
          interactions: [],
          requests: [],
        };
      }

      if (action.actionType !== "QUEUE_OUTREACH") {
        throw new ApiError(400, "Unsupported agent action.");
      }

      if (action.targets.length === 0) {
        throw new ApiError(400, "This agent action does not include any outreach targets.");
      }

      const effects: FounderAgentActionEffect[] = [];
      const interactions: VerifiedInteractionSummary[] = [];
      const requests: ConnectionRequestSummary[] = [];
      const alreadyQueued: string[] = [];

      for (const target of action.targets) {
        effects.push({
          type: "queue_graph_contact",
          target,
        });

        const resolvedUser = await resolveTargetUser(deps, currentUser.id, target);
        if (resolvedUser) {
          try {
            const result = await deps.connectionRequestService.createRequest(currentUser.id, {
              recipientUserId: resolvedUser.id,
              type: target.kind === "partner" ? "investment" : "intro",
              message: buildOutreachMessage(currentUser.name, target),
              companyId: target.companyId ?? null,
              metadata: {
                source: "founder_agent_action",
                actionId: action.id,
                actionLabel: action.label,
                actorMode: "AGENT",
                counterpartKind: target.kind,
                counterpartName: targetName(target),
                companyName: target.companyName ?? null,
              },
            });
            requests.push(result.request);
            interactions.push(result.interaction);
            continue;
          } catch (error) {
            if (error instanceof ApiError && error.status === 409) {
              alreadyQueued.push(targetName(target));
              continue;
            }
            throw error;
          }
        }

        interactions.push(
          await deps.verifiedInteractionService.recordInteraction({
            interactionType: "INTRO_REQUESTED",
            actorUserId: currentUser.id,
            companyId: target.companyId ?? null,
            metadata: {
              source: "founder_agent_action",
              actionId: action.id,
              actionLabel: action.label,
              actorMode: "AGENT",
              graphOnlyTarget: true,
              counterpartKind: target.kind,
              counterpartName: targetName(target),
              companyName: target.companyName ?? null,
            },
          }),
        );
      }

      const queuedNames = action.targets.map(targetName);
      const lastQueuedName = queuedNames[queuedNames.length - 1] ?? "the recommended contacts";
      const queueSummary = queuedNames.length === 1 ? queuedNames[0] : `${queuedNames.slice(0, -1).join(", ")}, and ${lastQueuedName}`;
      const createdRequestCount = requests.length;
      const graphOnlyCount = Math.max(action.targets.length - createdRequestCount - alreadyQueued.length, 0);

      const messageParts = [`Accepted. I queued ${queueSummary} for agent outreach.`];
      if (createdRequestCount > 0) {
        messageParts.push(
          createdRequestCount === 1
            ? "I also created 1 Meshed intro request for a matched member."
            : `I also created ${createdRequestCount} Meshed intro requests for matched members.`,
        );
      }
      if (graphOnlyCount > 0) {
        messageParts.push(
          graphOnlyCount === 1
            ? "For graph-only contacts, I recorded a verified interaction and pushed the contact into your connections panel."
            : "For graph-only contacts, I recorded verified interactions and pushed the contacts into your connections panel.",
        );
      }
      if (alreadyQueued.length > 0) {
        messageParts.push(`Already queued: ${alreadyQueued.join(", ")}.`);
      }

      return {
        message: messageParts.join(" "),
        effects,
        interactions,
        requests,
      };
    },
  };
}

export const meshedFounderAgentActionService = createMeshedFounderAgentActionService({
  userRepository,
  connectionRequestService,
  verifiedInteractionService,
  prisma,
});
