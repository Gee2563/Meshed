"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type SimulateResponseBody = {
  ok?: boolean;
  error?: string;
  data?: {
    action: "connect_request" | "message";
    direction: "incoming" | "outgoing";
    counterpartName: string;
    ingestion: {
      status: "ignored" | "attested";
      eventId: string;
      notificationsCreated: number;
      contractCall?: {
        txHash: string | null;
        contractAddress: string;
        method: string;
      };
    };
  };
};

function humanActionLabel(action: "connect_request" | "message") {
  return action === "connect_request" ? "connection request" : "message";
}

export function SimulateLinkedInAlertButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function simulate() {
    setFeedback(null);
    setError(null);

    try {
      const response = await fetch("/api/linkedin/simulate-alert", {
        method: "POST",
      });
      const body = (await response.json().catch(() => null)) as SimulateResponseBody | null;
      if (!response.ok || !body?.ok || !body.data) {
        throw new Error(body?.error ?? "Unable to simulate LinkedIn alert.");
      }

      const directionLabel = body.data.direction === "incoming" ? "from" : "to";
      const actionLabel = humanActionLabel(body.data.action);
      const statusLabel = body.data.ingestion.status === "attested" ? "attested" : "ignored";
      const txHash = body.data.ingestion.contractCall?.txHash;
      const txLabel = txHash ? ` tx ${txHash.slice(0, 12)}...` : "";

      setFeedback(
        `Simulated ${actionLabel} ${directionLabel} ${body.data.counterpartName} (${statusLabel}, event ${body.data.ingestion.eventId}${txLabel}).`,
      );
      startTransition(() => {
        router.refresh();
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to simulate LinkedIn alert.");
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={simulate}
        disabled={isPending}
        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Simulating..." : "Simulate LinkedIn Alert"}
      </button>
      {feedback ? <div className="max-w-[34rem] text-right text-[11px] text-emerald-700">{feedback}</div> : null}
      {error ? <div className="max-w-[34rem] text-right text-[11px] text-rose-700">{error}</div> : null}
    </div>
  );
}
