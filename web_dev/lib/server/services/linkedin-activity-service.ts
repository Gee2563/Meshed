import { createHash } from "node:crypto";

import { env } from "@/lib/config/env";
import { getFlareAdapters } from "@/lib/server/adapters/flare";
import { ApiError } from "@/lib/server/http";
import { userRepository } from "@/lib/server/repositories/user-repository";
import {
  getMeshingContractsService,
  getRealMeshingConfig,
  type MeshingContractCallTrace,
} from "@/lib/server/services/meshing-contract-service";
import type { UserSummary } from "@/lib/types";

export type LinkedInAction = "connect_request" | "message";

export interface LinkedInWebhookEventInput {
  senderLinkedInUrl: string;
  recipientLinkedInUrl: string;
  action: LinkedInAction;
  messagePreview?: string | null;
}

export interface LinkedInMeshedNotification {
  id: string;
  eventId: string;
  userId: string;
  counterpartUserId: string;
  counterpartName: string;
  counterpartLinkedInUrl: string | null;
  action: LinkedInAction;
  direction: "incoming" | "outgoing";
  messagePreview: string;
  receivedAt: string;
  attestationRef: string;
  title: string;
  body: string;
}

export interface LinkedInIngestionResult {
  status: "ignored" | "attested";
  reason?: string;
  eventId: string;
  senderMeshedUserId?: string;
  recipientMeshedUserId?: string;
  attestationRef?: string;
  notificationsCreated: number;
  relationshipId?: string;
  contractCall?: MeshingContractCallTrace;
}

export interface LinkedInSimulationResult {
  action: LinkedInAction;
  direction: "incoming" | "outgoing";
  senderName: string;
  recipientName: string;
  counterpartName: string;
  messagePreview: string;
  senderLinkedInUrl: string;
  recipientLinkedInUrl: string;
  ingestion: LinkedInIngestionResult;
}

const notificationByUserId = new Map<string, LinkedInMeshedNotification[]>();
const processedEventIds = new Set<string>();

const linkedinSimulationFixtures: Array<{
  id: string;
  name: string;
  email: string;
  role: "CONSULTANT" | "MENTOR" | "OPERATOR";
  bio: string;
  skills: string[];
  sectors: string[];
  linkedinUrl: string;
  outsideNetworkAccessEnabled: boolean;
}> = [
  {
    id: "usr_consultant_nina",
    name: "Nina Volkov",
    email: "nina@northmesh.io",
    role: "CONSULTANT" as const,
    bio: "Pricing and monetization consultant for Series A and B fintech teams.",
    skills: ["pricing", "ops", "revenue"],
    sectors: ["fintech", "payments"],
    linkedinUrl: "https://www.linkedin.com/in/nina-volkov-meshed",
    outsideNetworkAccessEnabled: true,
  },
  {
    id: "usr_mentor_theo",
    name: "Theo Mercer",
    email: "theo@orbitpartners.io",
    role: "MENTOR" as const,
    bio: "Operator-mentor for go-to-market and portfolio growth systems.",
    skills: ["go-to-market", "pricing", "ops"],
    sectors: ["fintech", "saas"],
    linkedinUrl: "https://www.linkedin.com/in/theo-mercer-meshed",
    outsideNetworkAccessEnabled: true,
  },
  {
    id: "usr_operator_iris",
    name: "Iris Shaw",
    email: "iris@opsmesh.io",
    role: "OPERATOR" as const,
    bio: "Fractional operator for onboarding, retention, and milestone delivery.",
    skills: ["ops", "onboarding", "retention"],
    sectors: ["saas", "healthtech"],
    linkedinUrl: "https://www.linkedin.com/in/iris-shaw-meshed",
    outsideNetworkAccessEnabled: false,
  },
];

function normalizeLinkedInUrl(value: string) {
  return value.trim().toLowerCase();
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function syntheticLinkedInUrl(name: string, userId: string) {
  const handle = `${slugify(name)}-${userId.slice(-4)}`;
  return `https://www.linkedin.com/in/${handle}`;
}

function assertRealLinkedInRuntime() {
  if (env.USE_MOCK_FLARE) {
    throw new ApiError(409, "USE_MOCK_FLARE is enabled. Disable it to run real LinkedIn attestation flow.");
  }
  if (env.USE_MOCK_MESHING) {
    throw new ApiError(409, "USE_MOCK_MESHING is enabled. Disable it to run real on-chain meshing writes.");
  }
  if (!getRealMeshingConfig()) {
    throw new ApiError(
      500,
      "Missing real meshing contract configuration. Set RELATIONSHIP_REGISTRY_ADDRESS, PORTFOLIO_REGISTRY_ADDRESS, OPPORTUNITY_ALERT_ADDRESS, FLARE_RPC_URL, and PRIVATE_KEY.",
    );
  }
}

async function ensureLinkedInIdentity(userId: string) {
  const user = await userRepository.findById(userId);
  if (!user) {
    return null;
  }

  if (user.linkedinUrl) {
    return user;
  }

  return userRepository.updateProfile(user.id, {
    linkedinUrl: syntheticLinkedInUrl(user.name, user.id),
  });
}

function buildEventId(input: LinkedInWebhookEventInput) {
  const digest = createHash("sha256")
    .update(
      [
        normalizeLinkedInUrl(input.senderLinkedInUrl),
        normalizeLinkedInUrl(input.recipientLinkedInUrl),
        input.action,
        (input.messagePreview ?? "").trim().toLowerCase(),
      ].join("|"),
    )
    .digest("hex");

  return `li_evt_${digest.slice(0, 24)}`;
}

function pushNotification(notification: LinkedInMeshedNotification) {
  const existing = notificationByUserId.get(notification.userId) ?? [];
  const deduped = existing.filter((item) => item.id !== notification.id);
  notificationByUserId.set(notification.userId, [notification, ...deduped].slice(0, 50));
}

function defaultMessageForAction(action: LinkedInAction) {
  return action === "connect_request"
    ? "Sent a LinkedIn connection request."
    : "Sent you a LinkedIn direct message.";
}

function connectionRelationshipType(action: LinkedInAction) {
  return action === "connect_request" ? "LINKEDIN_CONNECT_REQUEST" : "LINKEDIN_MESSAGE";
}

function isSimulationCandidate(user: UserSummary, currentUserId: string) {
  return user.id !== currentUserId && user.role !== "company" && user.role !== "admin";
}

function shouldSeedDashboardSignals(user: UserSummary) {
  return user.email.trim().toLowerCase() === "georgegds92@gmail.com";
}

async function ensureDashboardDemoNotifications(userId: string) {
  const currentUserRecord = await userRepository.findById(userId);
  if (!currentUserRecord || !shouldSeedDashboardSignals(currentUserRecord)) {
    return notificationByUserId.get(userId) ?? [];
  }

  const currentUser = (await ensureLinkedInIdentity(userId)) ?? currentUserRecord;
  const users = await userRepository.listDemoUsers();
  const candidates = users
    .filter((user: UserSummary) => isSimulationCandidate(user, currentUser.id))
    .sort((left, right) => right.engagementScore - left.engagementScore)
    .slice(0, 3);

  const hydratedCandidates: UserSummary[] = [];
  for (const candidate of candidates) {
    if (candidate.linkedinUrl) {
      hydratedCandidates.push(candidate);
      continue;
    }

    const updated = await userRepository.updateProfile(candidate.id, {
      linkedinUrl: syntheticLinkedInUrl(candidate.name, candidate.id),
    });
    hydratedCandidates.push(updated);
  }

  const demoTemplates: Array<{
    action: LinkedInAction;
    direction: "incoming" | "outgoing";
    messagePreview: (candidateName: string, currentUserName: string) => string;
    title: (candidateName: string) => string;
    body: (candidateName: string) => string;
  }> = [
    {
      action: "connect_request",
      direction: "incoming",
      messagePreview: (candidateName, currentUserName) =>
        `${candidateName} sent ${currentUserName} a LinkedIn connect request after reviewing the Flexpoint Ford portfolio support map.`,
      title: (candidateName) => `${candidateName} contacted you on LinkedIn`,
      body: (candidateName) =>
        `${candidateName} is already on Meshed, so you can move this relationship into a verified portfolio support workflow.`,
    },
    {
      action: "message",
      direction: "incoming",
      messagePreview: (candidateName) =>
        `${candidateName} followed up on LinkedIn about operator onboarding benchmarks and a warm intro through Meshed.`,
      title: (candidateName) => `${candidateName} contacted you on LinkedIn`,
      body: (candidateName) =>
        `${candidateName} already has a Meshed profile. Continue the conversation with a direct verified connection.`,
    },
    {
      action: "message",
      direction: "outgoing",
      messagePreview: (candidateName, currentUserName) =>
        `${currentUserName} previously messaged ${candidateName} on LinkedIn about a portfolio collaboration thread.`,
      title: (candidateName) => `${candidateName} is on Meshed`,
      body: (candidateName) =>
        `Your LinkedIn outreach to ${candidateName} can be continued inside Meshed with an attested relationship record.`,
    },
  ];

  const now = Date.now();
  hydratedCandidates.forEach((candidate, index) => {
    const template = demoTemplates[index % demoTemplates.length];
    const timestamp = new Date(now - index * 1000 * 60 * 47).toISOString();
    const eventKey = `dashboard_seed_${currentUser.id}_${candidate.id}_${template.direction}_${template.action}`;

    pushNotification({
      id: `${eventKey}_notification`,
      eventId: eventKey,
      userId: currentUser.id,
      counterpartUserId: candidate.id,
      counterpartName: candidate.name,
      counterpartLinkedInUrl: candidate.linkedinUrl ?? null,
      action: template.action,
      direction: template.direction,
      messagePreview: template.messagePreview(candidate.name, currentUser.name),
      receivedAt: timestamp,
      attestationRef: `flare:demo:linkedin:${eventKey}`,
      title: template.title(candidate.name),
      body: template.body(candidate.name),
    });
  });

  return notificationByUserId.get(userId) ?? [];
}

async function ensureSimulationCounterpart(currentUser: UserSummary) {
  const existingUsers = await userRepository.listDemoUsers();
  const existingCandidates = existingUsers.filter((user: UserSummary) => isSimulationCandidate(user, currentUser.id));
  if (existingCandidates.length > 0) {
    return existingCandidates;
  }

  for (const fixture of linkedinSimulationFixtures) {
    if (fixture.id === currentUser.id || fixture.email === currentUser.email) {
      continue;
    }

    const existing = await userRepository.findByEmail(fixture.email);
    if (existing) {
      if (!isSimulationCandidate(existing, currentUser.id)) {
        continue;
      }

      const hydrated = existing.linkedinUrl
        ? existing
        : await userRepository.updateProfile(existing.id, {
            linkedinUrl: fixture.linkedinUrl,
            outsideNetworkAccessEnabled: fixture.outsideNetworkAccessEnabled,
          });

      return [hydrated];
    }

    const created = await userRepository.create(fixture);
    return [created];
  }

  return [];
}

async function createBilateralNotifications(input: {
  eventId: string;
  sender: Awaited<ReturnType<typeof userRepository.findById>>;
  recipient: Awaited<ReturnType<typeof userRepository.findById>>;
  action: LinkedInAction;
  messagePreview: string;
  attestationRef: string;
}) {
  if (!input.sender || !input.recipient) {
    return;
  }

  const receivedAt = new Date().toISOString();

  const incoming: LinkedInMeshedNotification = {
    id: `${input.eventId}_incoming`,
    eventId: input.eventId,
    userId: input.recipient.id,
    counterpartUserId: input.sender.id,
    counterpartName: input.sender.name,
    counterpartLinkedInUrl: input.sender.linkedinUrl ?? null,
    action: input.action,
    direction: "incoming",
    messagePreview: input.messagePreview,
    receivedAt,
    attestationRef: input.attestationRef,
    title: `${input.sender.name} contacted you on LinkedIn`,
    body: `${input.sender.name} is already available on Meshed. You can connect and continue the conversation here.`,
  };

  const outgoing: LinkedInMeshedNotification = {
    id: `${input.eventId}_outgoing`,
    eventId: input.eventId,
    userId: input.sender.id,
    counterpartUserId: input.recipient.id,
    counterpartName: input.recipient.name,
    counterpartLinkedInUrl: input.recipient.linkedinUrl ?? null,
    action: input.action,
    direction: "outgoing",
    messagePreview: input.messagePreview,
    receivedAt,
    attestationRef: input.attestationRef,
    title: `${input.recipient.name} is on Meshed`,
    body: `Your LinkedIn outreach was attested on Flare. ${input.recipient.name} is available on Meshed for direct connection.`,
  };

  pushNotification(incoming);
  pushNotification(outgoing);
}

export const linkedinActivityService = {
  async ingestWebhookEvent(input: LinkedInWebhookEventInput): Promise<LinkedInIngestionResult> {
    assertRealLinkedInRuntime();

    const eventId = buildEventId(input);
    const sender = await userRepository.findByLinkedinUrl(input.senderLinkedInUrl);
    const recipient = await userRepository.findByLinkedinUrl(input.recipientLinkedInUrl);

    if (!sender || !recipient) {
      return {
        status: "ignored",
        reason: "One or both LinkedIn profiles are not registered Meshed users.",
        eventId,
        notificationsCreated: 0,
      };
    }

    if (processedEventIds.has(eventId)) {
      return {
        status: "attested",
        eventId,
        senderMeshedUserId: sender.id,
        recipientMeshedUserId: recipient.id,
        attestationRef: `flare:linkedin:cached:${eventId}`,
        notificationsCreated: 0,
      };
    }

    const flare = getFlareAdapters();
    const messagePreview = (input.messagePreview ?? "").trim() || defaultMessageForAction(input.action);
    const verification = await flare.external.verifyExternalEvent({
      milestoneId: `linkedin_${eventId}`,
      evidenceReference: JSON.stringify({
        source: "linkedin_api_webhook",
        action: input.action,
        senderLinkedInUrl: normalizeLinkedInUrl(input.senderLinkedInUrl),
        recipientLinkedInUrl: normalizeLinkedInUrl(input.recipientLinkedInUrl),
      }),
    });

    if (!verification.verified) {
      return {
        status: "ignored",
        reason: "Flare attestation rejected the LinkedIn event.",
        eventId,
        senderMeshedUserId: sender.id,
        recipientMeshedUserId: recipient.id,
        attestationRef: verification.providerRef,
        notificationsCreated: 0,
      };
    }

    const relationshipType = connectionRelationshipType(input.action);
    const meshingContracts = getMeshingContractsService();
    const relationshipWrite = await meshingContracts.recordRelationship({
      entityA: sender.name,
      entityB: recipient.name,
      relationshipType,
    });

    await createBilateralNotifications({
      eventId,
      sender,
      recipient,
      action: input.action,
      messagePreview,
      attestationRef: verification.providerRef,
    });

    processedEventIds.add(eventId);
    return {
      status: "attested",
      eventId,
      senderMeshedUserId: sender.id,
      recipientMeshedUserId: recipient.id,
      attestationRef: verification.providerRef,
      notificationsCreated: 2,
      relationshipId: relationshipWrite.relationship.relationshipId,
      contractCall: relationshipWrite.contractCall,
    };
  },

  async listNotificationsForUser(userId: string) {
    await ensureDashboardDemoNotifications(userId);
    return notificationByUserId.get(userId) ?? [];
  },

  async simulateAlertForUser(currentUserId: string): Promise<LinkedInSimulationResult> {
    assertRealLinkedInRuntime();

    const currentUser = await ensureLinkedInIdentity(currentUserId);
    if (!currentUser?.linkedinUrl) {
      throw new ApiError(404, "Current user is unavailable for LinkedIn simulation.");
    }

    const candidates = await ensureSimulationCounterpart(currentUser);

    if (candidates.length === 0) {
      throw new ApiError(409, "No Meshed counterpart is available to simulate a LinkedIn alert.");
    }

    const now = new Date();
    const unixBucket = Math.floor(now.getTime() / 1000);
    const candidateIndex = unixBucket % candidates.length;
    const selectedCandidate = candidates[candidateIndex];
    const candidate = await ensureLinkedInIdentity(selectedCandidate.id);
    if (!candidate?.linkedinUrl) {
      throw new ApiError(409, "Counterpart LinkedIn identity could not be prepared for simulation.");
    }

    const direction: "incoming" | "outgoing" = unixBucket % 2 === 0 ? "incoming" : "outgoing";
    const action: LinkedInAction = unixBucket % 3 === 0 ? "message" : "connect_request";
    const messagePreview =
      direction === "incoming"
        ? `${candidate.name} reached out on LinkedIn about a collaboration opportunity (${now.toISOString()}).`
        : `${currentUser.name} initiated LinkedIn outreach to ${candidate.name} (${now.toISOString()}).`;

    const senderLinkedInUrl = direction === "incoming" ? candidate.linkedinUrl : currentUser.linkedinUrl;
    const recipientLinkedInUrl = direction === "incoming" ? currentUser.linkedinUrl : candidate.linkedinUrl;
    const senderName = direction === "incoming" ? candidate.name : currentUser.name;
    const recipientName = direction === "incoming" ? currentUser.name : candidate.name;
    const ingestion = await this.ingestWebhookEvent({
      senderLinkedInUrl,
      recipientLinkedInUrl,
      action,
      messagePreview,
    });

    return {
      action,
      direction,
      senderName,
      recipientName,
      counterpartName: candidate.name,
      messagePreview,
      senderLinkedInUrl,
      recipientLinkedInUrl,
      ingestion,
    };
  },

  async seedDummyDataForUser(currentUserId: string) {
    let currentUser = await userRepository.findById(currentUserId);
    if (!currentUser) {
      return [];
    }

    if (!currentUser.linkedinUrl) {
      currentUser = await userRepository.updateProfile(currentUser.id, {
        linkedinUrl: syntheticLinkedInUrl(currentUser.name, currentUser.id),
      });
    }
    const currentUserLinkedInUrl = currentUser.linkedinUrl ?? syntheticLinkedInUrl(currentUser.name, currentUser.id);

    const users = await userRepository.listDemoUsers();
    const candidates = users
      .filter((user: UserSummary) => user.id !== currentUser.id)
      .filter((user: UserSummary) => user.role !== "company" && user.role !== "admin")
      .slice(0, 3);

    const hydratedCandidates: UserSummary[] = [];
    for (const candidate of candidates) {
      if (candidate.linkedinUrl) {
        hydratedCandidates.push(candidate);
        continue;
      }
      const updated = await userRepository.updateProfile(candidate.id, {
        linkedinUrl: syntheticLinkedInUrl(candidate.name, candidate.id),
      });
      hydratedCandidates.push(updated);
    }

    const results: LinkedInIngestionResult[] = [];
    for (const [index, candidate] of hydratedCandidates.entries()) {
      const candidateLinkedInUrl = candidate.linkedinUrl ?? syntheticLinkedInUrl(candidate.name, candidate.id);
      if (!candidateLinkedInUrl || !currentUserLinkedInUrl) {
        continue;
      }

      const result = await this.ingestWebhookEvent({
        senderLinkedInUrl: index % 2 === 0 ? candidateLinkedInUrl : currentUserLinkedInUrl,
        recipientLinkedInUrl: index % 2 === 0 ? currentUserLinkedInUrl : candidateLinkedInUrl,
        action: index % 2 === 0 ? "connect_request" : "message",
        messagePreview:
          index % 2 === 0
            ? `${candidate.name} requested to connect about a portfolio opportunity.`
            : `${currentUser.name} followed up to continue the discussion on Meshed.`,
      });
      results.push(result);
    }

    return results;
  },
};
