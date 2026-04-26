"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";

type HumanIdvIdentityFormProps = {
  initialFirstName: string;
  initialLastName: string;
  initialBio: string;
  initialSkills: string[];
  initialSectors: string[];
  initialLinkedinUrl: string;
  initialOutsideNetworkAccessEnabled: boolean;
};

type SaveProfileResponse = {
  ok?: boolean;
  error?: string;
};

function splitCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function HumanIdvIdentityForm({
  initialFirstName,
  initialLastName,
  initialBio,
  initialSkills,
  initialSectors,
  initialLinkedinUrl,
  initialOutsideNetworkAccessEnabled,
}: HumanIdvIdentityFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [bio, setBio] = useState(initialBio);
  const [skillsInput, setSkillsInput] = useState(initialSkills.join(", "));
  const [sectorsInput, setSectorsInput] = useState(initialSectors.join(", "));
  const [linkedinUrl, setLinkedinUrl] = useState(initialLinkedinUrl);
  const [outsideNetworkAccessEnabled, setOutsideNetworkAccessEnabled] = useState(
    initialOutsideNetworkAccessEnabled,
  );
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const skillCount = useMemo(() => splitCsv(skillsInput).length, [skillsInput]);
  const sectorCount = useMemo(() => splitCsv(sectorsInput).length, [sectorsInput]);

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
          bio: bio.trim(),
          skills: splitCsv(skillsInput),
          sectors: splitCsv(sectorsInput),
          linkedinUrl: linkedinUrl.trim(),
          outsideNetworkAccessEnabled,
        }),
      });

      const body = (await response.json().catch(() => null)) as SaveProfileResponse | null;
      if (!response.ok || !body?.ok) {
        throw new Error(body?.error ?? "Unable to save your Meshed profile details.");
      }

      setFeedback("Profile saved for the World-backed trust flow.");
      startTransition(() => {
        router.refresh();
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to save your Meshed profile details.");
    }
  }

  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white/90 px-6 py-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Profile details</p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">Set the public Meshed profile.</h2>
      <p className="mt-4 text-sm leading-6 text-slate-600">
        Save the name, LinkedIn context, and working tags that should power your verified matches and agent
        recommendations.
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

      <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        Bio
        <textarea
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          rows={4}
          className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          placeholder="What should Meshed know about how you help founders, employees, or portfolio teams?"
        />
      </label>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Skills
          <input
            type="text"
            value={skillsInput}
            onChange={(event) => setSkillsInput(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            placeholder="Growth, pricing, recruiting"
          />
          <span className="mt-2 block text-[11px] font-normal normal-case tracking-normal text-slate-500">
            Comma-separated. {skillCount} saved for this draft.
          </span>
        </label>
        <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Sectors
          <input
            type="text"
            value={sectorsInput}
            onChange={(event) => setSectorsInput(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            placeholder="Fintech, AI, healthcare"
          />
          <span className="mt-2 block text-[11px] font-normal normal-case tracking-normal text-slate-500">
            Comma-separated. {sectorCount} saved for this draft.
          </span>
        </label>
      </div>

      <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        LinkedIn URL
        <input
          type="url"
          value={linkedinUrl}
          onChange={(event) => setLinkedinUrl(event.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          placeholder="https://www.linkedin.com/in/your-handle"
        />
      </label>

      <label className="mt-4 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={outsideNetworkAccessEnabled}
          onChange={(event) => setOutsideNetworkAccessEnabled(event.target.checked)}
          className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-200"
        />
        <span>
          Allow trusted introductions beyond the current portfolio boundary when they are initiated by a verified human.
        </span>
      </label>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button type="button" onClick={saveProfile} disabled={isPending}>
          {isPending ? "Saving..." : "Save profile"}
        </Button>
        {feedback ? <p className="text-sm text-emerald-700">{feedback}</p> : null}
        {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      </div>
    </div>
  );
}
