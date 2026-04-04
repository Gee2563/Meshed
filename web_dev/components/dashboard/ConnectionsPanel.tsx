"use client";

import { useEffect, useMemo, useState } from "react";

import { SimulateLinkedInAlertButton } from "@/components/dashboard/SimulateLinkedInAlertButton";
import { Button } from "@/components/ui/Button";
import type { ConnectionRequestSummary, ConnectionSummary } from "@/lib/types";
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
};

type CreateRequestResponse = {
  ok?: boolean;
  error?: string;
  data?: {
    request: ConnectionRequestSummary;
  };
};

type AcceptRequestResponse = {
  ok?: boolean;
  error?: string;
  data?: {
    request: ConnectionRequestSummary;
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
    return "Incoming request";
  }
  if (input === "outgoing") {
    return "Request sent";
  }
  if (input === "connected") {
    return "Connected";
  }
  return "Available";
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

export function ConnectionsPanel({
  contacts,
  notifications,
  pendingIncomingRequests,
  connectedContactIds,
  outgoingPendingContactIds,
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
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [sendingContactId, setSendingContactId] = useState<string | null>(null);
  const [acceptingRequestId, setAcceptingRequestId] = useState<string | null>(null);

  const mergedContacts = useMemo(() => [...contacts, ...graphContacts], [contacts, graphContacts]);
  const contactById = useMemo(() => new Map(mergedContacts.map((contact) => [contact.id, contact])), [mergedContacts]);
  const selectedContact = selectedContactId ? contactById.get(selectedContactId) ?? null : null;
  const selectedIncomingRequest = selectedContact ? incomingByContact[selectedContact.id] ?? null : null;
  const selectedAcceptedRequest = selectedContact ? acceptedByContact[selectedContact.id] ?? null : null;

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
      const why = safeText(data.payload.why) || `${name} was surfaced from the a16z people graph.`;

      const matchedExisting = mergedContacts.find((candidate) => {
        if (linkedinUrl && normalizeLinkedIn(candidate.linkedinUrl) === normalizeLinkedIn(linkedinUrl)) {
          return true;
        }
        return candidate.name.trim().toLowerCase() === name.toLowerCase();
      });

      if (matchedExisting) {
        setSelectedContactId(matchedExisting.id);
        setActionError(null);
        setActionFeedback(`${matchedExisting.name} opened from the network graph in the Meshed connections panel.`);
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
      setActionFeedback(
        `${name} came from the network graph. This profile is available for review here; use the seeded Meshed contacts below to test live Flare contracts.`,
      );
      document.getElementById("meshed-connections-panel")?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    }

    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
    };
  }, [mergedContacts]);

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
          message: `Would love to open a Meshed ${contact.suggestedConnectionType} connection with ${contact.name}.`,
        }),
      });
      const body = (await response.json().catch(() => null)) as CreateRequestResponse | null;
      if (!response.ok || !body?.ok || !body.data) {
        throw new Error(body?.error ?? "Unable to send this Meshed connection request.");
      }

      setOutgoingIds((previous) => {
        const next = new Set(previous);
        next.add(contact.id);
        return next;
      });
      setActionFeedback(`Sent a Meshed connection request to ${contact.name}.`);
    } catch (caughtError) {
      setActionError(caughtError instanceof Error ? caughtError.message : "Unable to send this Meshed connection request.");
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
        throw new Error(body?.error ?? "Unable to accept this connection request.");
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
      setActionFeedback(`Accepted ${request.requesterName}'s connection request on Flare.`);
    } catch (caughtError) {
      setActionError(caughtError instanceof Error ? caughtError.message : "Unable to accept this connection request.");
    } finally {
      setAcceptingRequestId(null);
    }
  }

  return (
    <div id="meshed-connections-panel" className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
      <div className="space-y-4">
        <div className="rounded-[1.6rem] border border-slate-200 bg-white px-5 py-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate">LinkedIn signals</p>
              <h3 className="mt-2 text-xl font-semibold tracking-tight text-ink">LinkedIn to Meshed handoff</h3>
              <p className="mt-2 text-sm leading-6 text-slate">
                Use the existing simulation flow to trigger attested LinkedIn activity, then continue the relationship on
                Meshed without chat.
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
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Pending requests</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">
                {Object.keys(incomingByContact).length}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-mist/60 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Connected contacts</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">{connectedIds.size}</p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {notifications.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate">
                No LinkedIn activity has been simulated yet for this user.
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
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate">People worth contacting</p>
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
                <div className="mt-3 inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate">
                  {statusLabel(getStatus(selectedContact.id))}
                </div>
                {selectedContact.demoOnly ? (
                  <div className="mt-3 inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">
                    Graph profile only
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-[1.4rem] border border-slate-200 bg-mist/60 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Why this person</p>
              <p className="mt-3 text-sm leading-7 text-slate">{selectedContact.why}</p>
              {selectedContact.demoOnly ? (
                <p className="mt-3 text-sm leading-7 text-amber-800">
                  This profile came from the synthesized network graph. It can be reviewed here, but on-chain Meshed
                  connection testing should use the seeded real contacts and pending requests.
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
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-800">Pending inbound request</p>
                <p className="mt-3 text-sm leading-7 text-emerald-950">
                  {selectedIncomingRequest.message ?? `${selectedIncomingRequest.requesterName} wants to connect on Meshed.`}
                </p>
              </div>
            ) : null}

            {selectedAcceptedRequest?.contractAddress ? (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-[1.3rem] border border-slate-200 bg-white px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Flare contract</p>
                  <p className="mt-2 break-all text-sm text-ink">{selectedAcceptedRequest.contractAddress}</p>
                </div>
                <div className="rounded-[1.3rem] border border-slate-200 bg-white px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Transaction</p>
                  <p className="mt-2 break-all text-sm text-ink">
                    {selectedAcceptedRequest.contractTxHash ?? "Contract deployed without local tx hash capture"}
                  </p>
                </div>
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
                  {acceptingRequestId === selectedIncomingRequest.id ? "Accepting..." : "Accept on Flare"}
                </Button>
              ) : null}

              {selectedContact.demoOnly ? (
                <Button variant="secondary" disabled>
                  Graph profile only
                </Button>
              ) : null}

              {!selectedContact.demoOnly && getStatus(selectedContact.id) === "available" ? (
                <Button
                  onClick={() => sendRequest(selectedContact)}
                  disabled={sendingContactId === selectedContact.id}
                >
                  {sendingContactId === selectedContact.id ? "Sending..." : "Send Meshed Request"}
                </Button>
              ) : null}

              {!selectedContact.demoOnly && getStatus(selectedContact.id) === "outgoing" ? (
                <Button variant="secondary" disabled>
                  Request sent
                </Button>
              ) : null}

              {!selectedContact.demoOnly && getStatus(selectedContact.id) === "connected" ? (
                <Button variant="secondary" disabled>
                  Connected on Meshed
                </Button>
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
