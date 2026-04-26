"use client";

import { useEffect, useMemo, useState } from "react";

import { SimulateLinkedInAlertButton } from "@/components/dashboard/SimulateLinkedInAlertButton";
import { Button } from "@/components/ui/Button";
import type { ConnectionRequestSummary, ConnectionSummary, VerifiedInteractionSummary } from "@/lib/types";
import { cn, formatRelativeCount, titleCase } from "@/lib/utils";

export type DashboardConnectionContact = {
  id: string;
  name: string;
  company: string;
  role: string;
  why: string;
  contact: string | null;
  linkedinUrl: string | null;
  suggestedConnectionType: ConnectionSummary["type"];
  worldVerified?: boolean;
  companyId?: string | null;
  painPointTag?: string | null;
  matchScore?: number | null;
  demoOnly?: boolean;
};

export type DashboardLinkedInNotification = {
  id: string;
  counterpartUserId: string;
  counterpartName: string;
  action: "connect_request" | "message";
  direction: "incoming" | "outgoing";
  messagePreview: string;
  receivedAt: string;
  title: string;
  body: string;
};

type ConnectionsPanelProps = {
  contacts: DashboardConnectionContact[];
  notifications: DashboardLinkedInNotification[];
  pendingIncomingRequests: ConnectionRequestSummary[];
  connectedContactIds: string[];
  outgoingPendingContactIds: string[];
  recentInteractions: VerifiedInteractionSummary[];
};

type CreateRequestResponse = {
  ok?: boolean;
  error?: string;
  data?: {
    request: ConnectionRequestSummary;
    interaction: VerifiedInteractionSummary;
  };
};

type AcceptRequestResponse = {
  ok?: boolean;
  error?: string;
  data?: {
    request: ConnectionRequestSummary;
    connection: ConnectionSummary;
    interaction: VerifiedInteractionSummary | null;
  };
};

type RecordInteractionResponse = {
  ok?: boolean;
  error?: string;
  data?: {
    interaction: VerifiedInteractionSummary;
  };
};

type GraphConnectPayload = {
  id?: string;
  name?: string;
  company?: string;
  role?: string;
  linkedinUrl?: string;
  contact?: string;
  why?: string;
  painPointTag?: string;
  matchScore?: number;
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function statusLabel(input: "available" | "incoming" | "outgoing" | "connected") {
  if (input === "incoming") {
    return "Intro pending";
  }
  if (input === "outgoing") {
    return "Intro requested";
  }
  if (input === "connected") {
    return "Connected";
  }
  return "Match ready";
}

function timeLabel(value: string) {
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function safeText(value?: string | null) {
  return (value ?? "").trim();
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalizeLinkedIn(value?: string | null) {
  return safeText(value).toLowerCase();
}

function interactionLabel(interaction: VerifiedInteractionSummary) {
  return interaction.interactionType.replaceAll("_", " ");
}

function buildInteractionLookup(
  interactions: VerifiedInteractionSummary[],
  contactIds: Set<string>,
) {
  const byContact: Record<string, VerifiedInteractionSummary> = {};

  for (const interaction of interactions) {
    const candidateContactId =
      (interaction.targetUserId && contactIds.has(interaction.targetUserId) ? interaction.targetUserId : null) ??
      (contactIds.has(interaction.actorUserId) ? interaction.actorUserId : null);
    const contactId = candidateContactId ?? null;
    if (!contactId || byContact[contactId]) {
      continue;
    }
    byContact[contactId] = interaction;
  }

  return byContact;
}

function rewardLabel(rewardStatus: VerifiedInteractionSummary["rewardStatus"]) {
  if (rewardStatus === "EARNED") {
    return "Reward Earned";
  }
  if (rewardStatus === "DISTRIBUTED") {
    return "Reward Distributed";
  }
  if (rewardStatus === "REWARDABLE") {
    return "Rewardable";
  }
  return "Not rewardable yet";
}

function getWorldChainExplorerUrl(interaction: VerifiedInteractionSummary) {
  const metadata = interaction.metadata as { worldChain?: { explorerUrl?: unknown } } | null | undefined;
  return typeof metadata?.worldChain?.explorerUrl === "string" ? metadata.worldChain.explorerUrl : null;
}

export function ConnectionsPanel({
  contacts,
  notifications,
  pendingIncomingRequests,
  connectedContactIds,
  outgoingPendingContactIds,
  recentInteractions,
}: ConnectionsPanelProps) {
  const [graphContacts, setGraphContacts] = useState<DashboardConnectionContact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(
    pendingIncomingRequests[0]?.requesterUserId ?? contacts[0]?.id ?? null,
  );
  const [connectedIds, setConnectedIds] = useState<Set<string>>(() => new Set(connectedContactIds));
  const [outgoingIds, setOutgoingIds] = useState<Set<string>>(() => new Set(outgoingPendingContactIds));
  const [incomingByContact, setIncomingByContact] = useState<Record<string, ConnectionRequestSummary>>(() =>
    Object.fromEntries(pendingIncomingRequests.map((request) => [request.requesterUserId, request])),
  );
  const [acceptedByContact, setAcceptedByContact] = useState<Record<string, ConnectionRequestSummary>>({});
  const [interactionByContact, setInteractionByContact] = useState<Record<string, VerifiedInteractionSummary>>(() =>
    buildInteractionLookup(recentInteractions, new Set(contacts.map((contact) => contact.id))),
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [sendingContactId, setSendingContactId] = useState<string | null>(null);
  const [acceptingRequestId, setAcceptingRequestId] = useState<string | null>(null);
  const [recordingMatchId, setRecordingMatchId] = useState<string | null>(null);
  const [recordingInteractionId, setRecordingInteractionId] = useState<string | null>(null);

  const mergedContacts = useMemo(() => [...contacts, ...graphContacts], [contacts, graphContacts]);
  const contactById = useMemo(() => new Map(mergedContacts.map((contact) => [contact.id, contact])), [mergedContacts]);
  const selectedContact = selectedContactId ? contactById.get(selectedContactId) ?? null : null;
  const selectedIncomingRequest = selectedContact ? incomingByContact[selectedContact.id] ?? null : null;
  const selectedAcceptedRequest = selectedContact ? acceptedByContact[selectedContact.id] ?? null : null;
  const selectedInteraction = selectedContact ? interactionByContact[selectedContact.id] ?? null : null;

  function getStatus(contactId: string): "available" | "incoming" | "outgoing" | "connected" {
    if (incomingByContact[contactId]) {
      return "incoming";
    }
    if (connectedIds.has(contactId)) {
      return "connected";
    }
    if (outgoingIds.has(contactId)) {
      return "outgoing";
    }
    return "available";
  }

  function updateInteraction(contactId: string, interaction: VerifiedInteractionSummary | null) {
    if (!interaction) {
      return;
    }

    setInteractionByContact((previous) => ({
      ...previous,
      [contactId]: interaction,
    }));
  }

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const data = event.data as { type?: string; payload?: GraphConnectPayload } | null;
      if (!data || data.type !== "meshed:graph-connect-request" || !data.payload) {
        return;
      }

      const name = safeText(data.payload.name);
      if (!name) {
        return;
      }

      const linkedinUrl = safeText(data.payload.linkedinUrl);
      const contact = safeText(data.payload.contact);
      const role = safeText(data.payload.role) || "operator";
      const company = safeText(data.payload.company) || "Meshed Network";
      const why = safeText(data.payload.why) || `${name} was surfaced from the portfolio graph.`;

      const matchedExisting = mergedContacts.find((candidate) => {
        if (linkedinUrl && normalizeLinkedIn(candidate.linkedinUrl) === normalizeLinkedIn(linkedinUrl)) {
          return true;
        }
        return candidate.name.trim().toLowerCase() === name.toLowerCase();
      });

      if (matchedExisting) {
        setSelectedContactId(matchedExisting.id);
        setActionError(null);
        setActionFeedback(`${matchedExisting.name} opened from the network graph in the Meshed people panel.`);
        document.getElementById("meshed-connections-panel")?.scrollIntoView?.({ behavior: "smooth", block: "start" });
        return;
      }

      const graphId = safeText(data.payload.id) ? `graph_${safeText(data.payload.id)}` : `graph_${slugify(name)}`;
      const graphContact: DashboardConnectionContact = {
        id: graphId,
        name,
        company,
        role,
        why,
        contact: contact || null,
        linkedinUrl: linkedinUrl || null,
        suggestedConnectionType: "intro",
        worldVerified: false,
        painPointTag: safeText(data.payload.painPointTag) || null,
        matchScore: typeof data.payload.matchScore === "number" ? data.payload.matchScore : null,
        demoOnly: true,
      };

      setGraphContacts((previous) => {
        const next = previous.some((candidate) => candidate.id === graphId)
          ? previous
          : [graphContact, ...previous].slice(0, 8);
        return next;
      });
      setSelectedContactId(graphId);
      setActionError(null);
      setActionFeedback(`${name} came from the synthesized graph. Review the context here, then use a seeded Meshed member to demo a verified intro flow.`);
      document.getElementById("meshed-connections-panel")?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    }

    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
    };
  }, [mergedContacts]);

  async function recordMatch(contact: DashboardConnectionContact) {
    setActionError(null);
    setActionFeedback(null);
    setRecordingMatchId(contact.id);

    try {
      const response = await fetch("/api/matches/suggest", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          targetUserId: contact.id,
          companyId: contact.companyId ?? null,
          painPointTag: contact.painPointTag ?? null,
          matchScore: contact.matchScore ?? null,
          metadata: {
            counterpartName: contact.name,
            companyName: contact.company,
            reason: contact.why,
          },
        }),
      });
      const body = (await response.json().catch(() => null)) as RecordInteractionResponse | null;
      if (!response.ok || !body?.ok || !body.data) {
        throw new Error(body?.error ?? "Unable to record this recommended match.");
      }

      updateInteraction(contact.id, body.data.interaction);
      setActionFeedback(`Verified match recorded for ${contact.name}.`);
    } catch (caughtError) {
      setActionError(caughtError instanceof Error ? caughtError.message : "Unable to record this recommended match.");
    } finally {
      setRecordingMatchId(null);
    }
  }

  async function sendRequest(contact: DashboardConnectionContact) {
    setActionError(null);
    setActionFeedback(null);
    setSendingContactId(contact.id);

    try {
      const response = await fetch("/api/connections/requests", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          recipientUserId: contact.id,
          type: contact.suggestedConnectionType,
          message: `Would love to open a human-backed Meshed ${contact.suggestedConnectionType} with ${contact.name}.`,
          companyId: contact.companyId ?? null,
          painPointTag: contact.painPointTag ?? null,
          matchScore: contact.matchScore ?? null,
          metadata: {
            counterpartName: contact.name,
            companyName: contact.company,
            reason: contact.why,
            actorMode: "AGENT",
          },
        }),
      });
      const body = (await response.json().catch(() => null)) as CreateRequestResponse | null;
      if (!response.ok || !body?.ok || !body.data) {
        throw new Error(body?.error ?? "Unable to send this Meshed intro request.");
      }

      setOutgoingIds((previous) => {
        const next = new Set(previous);
        next.add(contact.id);
        return next;
      });
      updateInteraction(contact.id, body.data.interaction);
      setActionFeedback(`Intro requested for ${contact.name}. Verified interaction recorded.`);
    } catch (caughtError) {
      setActionError(caughtError instanceof Error ? caughtError.message : "Unable to send this Meshed intro request.");
    } finally {
      setSendingContactId(null);
    }
  }

  async function acceptRequest(request: ConnectionRequestSummary) {
    setActionError(null);
    setActionFeedback(null);
    setAcceptingRequestId(request.id);

    try {
      const response = await fetch(`/api/connections/requests/${request.id}/accept`, {
        method: "POST",
      });
      const body = (await response.json().catch(() => null)) as AcceptRequestResponse | null;
      if (!response.ok || !body?.ok || !body.data) {
        throw new Error(body?.error ?? "Unable to accept this intro request.");
      }

      setIncomingByContact((previous) => {
        const next = { ...previous };
        delete next[request.requesterUserId];
        return next;
      });
      setAcceptedByContact((previous) => ({
        ...previous,
        [request.requesterUserId]: body.data!.request,
      }));
      setConnectedIds((previous) => {
        const next = new Set(previous);
        next.add(request.requesterUserId);
        return next;
      });
      setOutgoingIds((previous) => {
        const next = new Set(previous);
        next.delete(request.requesterUserId);
        return next;
      });
      updateInteraction(request.requesterUserId, body.data.interaction);
      setActionFeedback(`Accepted ${request.requesterName}'s intro. Verified interaction recorded.`);
    } catch (caughtError) {
      setActionError(caughtError instanceof Error ? caughtError.message : "Unable to accept this intro request.");
    } finally {
      setAcceptingRequestId(null);
    }
  }

  async function recordFollowUp(contact: DashboardConnectionContact, interactionType: VerifiedInteractionSummary["interactionType"]) {
    setActionError(null);
    setActionFeedback(null);
    setRecordingInteractionId(contact.id);

    try {
      const response = await fetch("/api/verified-interactions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          interactionType,
          targetUserId: contact.id,
          companyId: contact.companyId ?? null,
          painPointTag: contact.painPointTag ?? null,
          matchScore: contact.matchScore ?? null,
          metadata: {
            counterpartName: contact.name,
            companyName: contact.company,
            reason: contact.why,
            actorMode: "AGENT",
          },
        }),
      });
      const body = (await response.json().catch(() => null)) as RecordInteractionResponse | null;
      if (!response.ok || !body?.ok || !body.data) {
        throw new Error(body?.error ?? "Unable to record this verified interaction.");
      }

      updateInteraction(contact.id, body.data.interaction);
      setActionFeedback(
        interactionType === "REWARD_EARNED"
          ? `Reward earned for ${contact.name}.`
          : `${interactionLabel(body.data.interaction)} recorded for ${contact.name}.`,
      );
    } catch (caughtError) {
      setActionError(
        caughtError instanceof Error ? caughtError.message : "Unable to record this verified interaction.",
      );
    } finally {
      setRecordingInteractionId(null);
    }
  }

  return (
    <div id="meshed-connections-panel" className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
      <div className="space-y-4">
        <div className="rounded-[1.6rem] border border-slate-200 bg-white px-5 py-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate">World-backed trust layer</p>
              <h3 className="mt-2 text-xl font-semibold tracking-tight text-ink">Human-backed agent handoff</h3>
              <p className="mt-2 text-sm leading-6 text-slate">
                Simulate outreach, see the human-backed signal appear in Meshed, then continue into a verified intro flow.
              </p>
            </div>
            <SimulateLinkedInAlertButton />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-mist/60 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Suggested people</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">{contacts.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-mist/60 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Pending intros</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">
                {Object.keys(incomingByContact).length}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-mist/60 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Verified interactions</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">{Object.keys(interactionByContact).length}</p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {notifications.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate">
                No agent-backed outreach has been simulated yet for this user.
              </div>
            ) : (
              notifications.slice(0, 5).map((notification) => (
                <article key={notification.id} className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink">{notification.title}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.12em] text-slate">
                        {notification.direction === "incoming" ? "Incoming" : "Outgoing"} {notification.action.replace("_", " ")}
                      </p>
                    </div>
                    <p className="text-xs text-slate">{timeLabel(notification.receivedAt)}</p>
                  </div>
                  <p className="mt-3 text-sm text-slate">{notification.messagePreview}</p>
                </article>
              ))
            )}
          </div>
        </div>

        <div className="rounded-[1.6rem] border border-slate-200 bg-white px-5 py-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate">Recommended matches</p>
              <h3 className="mt-2 text-xl font-semibold tracking-tight text-ink">Seeded Meshed connections</h3>
            </div>
            <p className="text-xs text-slate">{formatRelativeCount(mergedContacts.length, "contact")}</p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {mergedContacts.map((contact) => {
              const status = getStatus(contact.id);
              return (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() => setSelectedContactId(contact.id)}
                  className={cn(
                    "rounded-[1.4rem] border px-4 py-4 text-left transition",
                    selectedContactId === contact.id
                      ? "border-ink bg-ink text-white shadow-[0_18px_48px_rgba(15,23,42,0.22)]"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-sm font-bold",
                        selectedContactId === contact.id
                          ? "border-white/25 bg-white/10 text-white"
                          : "border-slate-300 bg-slate-900 text-white",
                      )}
                    >
                      {initials(contact.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{contact.name}</p>
                      <p
                        className={cn(
                          "mt-1 text-xs",
                          selectedContactId === contact.id ? "text-slate-200" : "text-slate",
                        )}
                      >
                        {titleCase(contact.role)} at {contact.company}
                      </p>
                      <p
                        className={cn(
                          "mt-2 text-[11px] font-semibold uppercase tracking-[0.14em]",
                          selectedContactId === contact.id ? "text-sky-100" : "text-slate",
                        )}
                      >
                        {statusLabel(status)}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-[1.8rem] border border-slate-200 bg-white px-5 py-5 shadow-sm">
        {selectedContact ? (
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <span className="flex h-16 w-16 items-center justify-center rounded-[1.4rem] border-2 border-slate-300 bg-slate-900 text-lg font-bold text-white">
                {initials(selectedContact.name)}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate">Connection details</p>
                <h3 className="mt-2 text-3xl font-semibold tracking-tight text-ink">{selectedContact.name}</h3>
                <p className="mt-2 text-sm text-slate">
                  {titleCase(selectedContact.role)} at {selectedContact.company}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate">
                    {statusLabel(getStatus(selectedContact.id))}
                  </div>
                  <div
                    className={cn(
                      "inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]",
                      selectedContact.worldVerified
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-amber-200 bg-amber-50 text-amber-800",
                    )}
                  >
                    {selectedContact.worldVerified ? "Verified Human" : "Verification Pending"}
                  </div>
                  {selectedContact.demoOnly ? (
                    <div className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">
                      Graph profile only
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="rounded-[1.4rem] border border-slate-200 bg-mist/60 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Why this match</p>
              <p className="mt-3 text-sm leading-7 text-slate">{selectedContact.why}</p>
              {selectedContact.demoOnly ? (
                <p className="mt-3 text-sm leading-7 text-amber-800">
                  This profile came from the synthesized network graph. It can be reviewed here, but the live demo intro flow should use the seeded Meshed members.
                </p>
              ) : null}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-[1.3rem] border border-slate-200 bg-white px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Contact</p>
                <p className="mt-2 text-sm text-ink">{selectedContact.contact ?? "No email on record"}</p>
              </div>
              <div className="rounded-[1.3rem] border border-slate-200 bg-white px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">LinkedIn</p>
                {selectedContact.linkedinUrl ? (
                  <a
                    href={selectedContact.linkedinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 block break-all text-sm text-sky-700 underline-offset-4 hover:underline"
                  >
                    {selectedContact.linkedinUrl}
                  </a>
                ) : (
                  <p className="mt-2 text-sm text-slate">No LinkedIn profile stored yet</p>
                )}
              </div>
            </div>

            {selectedIncomingRequest ? (
              <div className="rounded-[1.4rem] border border-emerald-200 bg-emerald-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-800">Pending inbound intro</p>
                <p className="mt-3 text-sm leading-7 text-emerald-950">
                  {selectedIncomingRequest.message ?? `${selectedIncomingRequest.requesterName} wants to connect on Meshed.`}
                </p>
              </div>
            ) : null}

            {selectedInteraction ? (
              <div className="rounded-[1.4rem] border border-sky-200 bg-sky-50 px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-800">Verified interaction recorded</p>
                    <p className="mt-2 text-sm font-semibold text-sky-950">{interactionLabel(selectedInteraction)}</p>
                  </div>
                  <div
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]",
                      selectedInteraction.verified
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800",
                    )}
                  >
                    {selectedInteraction.verified ? "World-backed trust layer" : "Awaiting full verification"}
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-[1rem] border border-white/80 bg-white/80 px-3 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate">Reward status</p>
                    <p className="mt-2 text-sm font-medium text-ink">{rewardLabel(selectedInteraction.rewardStatus)}</p>
                  </div>
                  <div className="rounded-[1rem] border border-white/80 bg-white/80 px-3 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate">Actor proof</p>
                    <p className="mt-2 text-sm font-medium text-ink">
                      {selectedInteraction.actorWorldVerified ? "Verified Human" : "Pending"}
                    </p>
                  </div>
                  <div className="rounded-[1rem] border border-white/80 bg-white/80 px-3 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate">Future World Chain log</p>
                    {selectedInteraction.transactionHash && getWorldChainExplorerUrl(selectedInteraction) ? (
                      <a
                        href={getWorldChainExplorerUrl(selectedInteraction) ?? undefined}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 block break-all text-sm font-medium text-sky-700 underline-offset-4 hover:underline"
                      >
                        {selectedInteraction.transactionHash}
                      </a>
                    ) : selectedInteraction.transactionHash ? (
                      <p className="mt-2 break-all text-sm font-medium text-ink">{selectedInteraction.transactionHash}</p>
                    ) : (
                      <p className="mt-2 break-all text-sm font-medium text-ink">
                        TODO when on-chain writes are enabled
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {selectedAcceptedRequest ? (
              <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Accepted intro</p>
                <p className="mt-3 text-sm leading-7 text-slate">
                  This relationship is now connected inside Meshed and ready for collaboration tracking.
                </p>
              </div>
            ) : null}

            {actionFeedback ? (
              <div className="rounded-[1.3rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                {actionFeedback}
              </div>
            ) : null}

            {actionError ? (
              <div className="rounded-[1.3rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {actionError}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              {selectedIncomingRequest ? (
                <Button
                  onClick={() => acceptRequest(selectedIncomingRequest)}
                  disabled={acceptingRequestId === selectedIncomingRequest.id}
                >
                  {acceptingRequestId === selectedIncomingRequest.id ? "Accepting..." : "Accept Verified Intro"}
                </Button>
              ) : null}

              {selectedContact.demoOnly ? (
                <Button variant="secondary" disabled>
                  Graph profile only
                </Button>
              ) : null}

              {!selectedContact.demoOnly && getStatus(selectedContact.id) === "available" ? (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => recordMatch(selectedContact)}
                    disabled={recordingMatchId === selectedContact.id}
                  >
                    {recordingMatchId === selectedContact.id ? "Recording..." : "Record Match"}
                  </Button>
                  <Button
                    onClick={() => sendRequest(selectedContact)}
                    disabled={sendingContactId === selectedContact.id}
                  >
                    {sendingContactId === selectedContact.id ? "Sending..." : "Request Intro"}
                  </Button>
                </>
              ) : null}

              {!selectedContact.demoOnly && getStatus(selectedContact.id) === "outgoing" ? (
                <Button variant="secondary" disabled>
                  Intro requested
                </Button>
              ) : null}

              {!selectedContact.demoOnly && getStatus(selectedContact.id) === "connected" ? (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => recordFollowUp(selectedContact, "COLLABORATION_STARTED")}
                    disabled={recordingInteractionId === selectedContact.id}
                  >
                    {recordingInteractionId === selectedContact.id ? "Recording..." : "Record Collaboration"}
                  </Button>
                  <Button
                    onClick={() => recordFollowUp(selectedContact, "REWARD_EARNED")}
                    disabled={recordingInteractionId === selectedContact.id}
                  >
                    {recordingInteractionId === selectedContact.id ? "Recording..." : "Mark Reward Earned"}
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="rounded-[1.4rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-sm text-slate">
            Select a contact to review connection details.
          </div>
        )}
      </div>
    </div>
  );
}
