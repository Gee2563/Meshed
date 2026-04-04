"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";

type HumanIdvIdentityFormProps = {
  initialFirstName: string;
  initialLastName: string;
};

type SaveProfileResponse = {
  ok?: boolean;
  error?: string;
};

export function HumanIdvIdentityForm({ initialFirstName, initialLastName }: HumanIdvIdentityFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function saveProfile() {
    setFeedback(null);
    setError(null);

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    if (!trimmedFirstName || !trimmedLastName) {
      setError("Enter both first and last name before continuing.");
      return;
    }

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          firstName: trimmedFirstName,
          lastName: trimmedLastName,
        }),
      });

      const body = (await response.json().catch(() => null)) as SaveProfileResponse | null;
      if (!response.ok || !body?.ok) {
        throw new Error(body?.error ?? "Unable to save your Meshed profile details.");
      }

      setFeedback("Name details saved for this Meshed account.");
      startTransition(() => {
        router.refresh();
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to save your Meshed profile details.");
    }
  }

  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white/90 px-6 py-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Member details</p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">Set the name shown on Meshed.</h2>
      <p className="mt-4 text-sm leading-6 text-slate-600">
        First and last name now live here instead of the Dynamic step, so you can confirm the public Meshed identity
        before completing World ID.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          First name
          <input
            type="text"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            placeholder="First name"
          />
        </label>
        <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Last name
          <input
            type="text"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            placeholder="Last name"
          />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button type="button" onClick={saveProfile} disabled={isPending}>
          {isPending ? "Saving..." : "Save details"}
        </Button>
        {feedback ? <p className="text-sm text-emerald-700">{feedback}</p> : null}
        {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      </div>
    </div>
  );
}
