"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import type { AgentNotificationSummary } from "@/lib/types";

type AgentNotificationsPanelProps = {
  notifications: AgentNotificationSummary[];
};

type AcceptNotificationResponse = {
  ok?: boolean;
  error?: string;
  data?: {
    notification: AgentNotificationSummary;
    execution: {
      message: string;
    };
  };
};

function timeLabel(value: string) {
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(status: AgentNotificationSummary["status"]) {
  switch (status) {
    case "acted_on":
      return "Agent act accepted";
    case "dismissed":
      return "Dismissed";
    case "read":
      return "Seen";
    default:
      return "Unread";
  }
}

function sourceLabel(source: AgentNotificationSummary["source"]) {
  switch (source) {
    case "linkedin_signal":
      return "LinkedIn signal";
    case "external_social":
      return "External source";
    default:
      return "Meshed graph";
  }
}

export function AgentNotificationsPanel({ notifications }: AgentNotificationsPanelProps) {
  const [items, setItems] = useState(notifications);
  const [pendingActionKey, setPendingActionKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  async function accept(notificationId: string, actionId: string) {
    setPendingActionKey(`${notificationId}:${actionId}`);
    setError(null);

    try {
      const response = await fetch(`/api/agent-notifications/${notificationId}/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          actionId,
        }),
      });

      const payload = (await response.json().catch(() => null)) as AcceptNotificationResponse | null;
      if (!response.ok || !payload?.ok || !payload.data) {
        throw new Error(payload?.error ?? "Unable to accept this agent notification.");
      }

      setItems((previous) =>
        previous.map((item) => (item.id === notificationId ? payload.data!.notification : item)),
      );
      setFeedback((previous) => ({
        ...previous,
        [notificationId]: payload.data!.execution.message,
      }));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to accept this agent notification.");
    } finally {
      setPendingActionKey(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[1.6rem] border border-slate-200 bg-white px-5 py-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate">Agent notifications</p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-ink">Opportunities your Meshed agent is ready to move on</h3>
            <p className="mt-2 text-sm leading-6 text-slate">
              These are Meshed-native opportunities your agent believes are worth acting on now. Outside-Meshed event and social monitoring will flow into this same feed in a future sprint.
            </p>
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
            {items.length} active
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        ) : null}

        <div className="mt-4 space-y-3">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate">
              No proactive opportunities have been generated yet. Once your agent has enough Meshed and social context, this feed will light up.
            </div>
          ) : (
            items.map((notification) => (
              <article key={notification.id} className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">{notification.title}</p>
                    <div className="mt-1 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.12em] text-slate">
                      <span>{sourceLabel(notification.source)}</span>
                      <span>•</span>
                      <span>{statusLabel(notification.status)}</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate">{timeLabel(notification.createdAt)}</p>
                </div>

                <p className="mt-3 text-sm leading-6 text-slate">{notification.body}</p>

                {feedback[notification.id] ? (
                  <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    {feedback[notification.id]}
                  </div>
                ) : null}

                {notification.agentActions.length > 0 && notification.status !== "acted_on" ? (
                  <div className="mt-4 flex flex-wrap gap-3">
                    {notification.agentActions.map((action) => {
                      const actionKey = `${notification.id}:${action.id}`;
                      return (
                        <Button
                          key={action.id}
                          type="button"
                          onClick={() => void accept(notification.id, action.id)}
                          disabled={pendingActionKey === actionKey}
                        >
                          {pendingActionKey === actionKey ? "Accepting..." : action.label}
                        </Button>
                      );
                    })}
                  </div>
                ) : null}
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
