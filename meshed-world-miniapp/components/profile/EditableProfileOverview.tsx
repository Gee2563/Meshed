"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { ProfileImageUploader } from "@/components/profile/ProfileImageUploader";
import { Button } from "@/components/ui/Button";
import { getDemoRoleLabel } from "@/lib/demo-role-label";
import type { UserSocialConnectionSummary, UserSummary } from "@/lib/types";
import { titleCase } from "@/lib/utils";

type EditableProfileOverviewProps = {
  currentUser: UserSummary;
  initialSkills: string[];
  initialSectors: string[];
  socialConnections: UserSocialConnectionSummary[];
  showBio: boolean;
};

type SaveProfileResponse = {
  ok?: boolean;
  error?: string;
  data?: {
    user?: UserSummary;
  };
};

type EditorKey = "identity" | "skills" | "sectors" | "socials" | "access" | null;

function joinValues(values: string[]) {
  return values.join(", ");
}

function splitValues(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function socialValue(
  connections: UserSocialConnectionSummary[],
  provider: UserSocialConnectionSummary["provider"],
) {
  return connections.find((connection) => connection.provider === provider)?.accountLabel ?? "";
}

function socialLabel(value: string) {
  return value.trim() || "Not linked yet";
}

function FieldCard({
  label,
  value,
  onEdit,
  children,
  editing,
  className,
}: {
  label: string;
  value?: string;
  onEdit?: () => void;
  children?: React.ReactNode;
  editing?: boolean;
  className?: string;
}) {
  return (
    <div className={`rounded-[1.4rem] border border-slate-200 bg-white px-4 py-4 ${className ?? ""}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">{label}</p>
        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-700 transition hover:text-sky-900"
          >
            {editing ? "Editing" : "Edit"}
          </button>
        ) : null}
      </div>
      {children ? children : <p className="mt-2 text-sm leading-6 text-ink">{value}</p>}
    </div>
  );
}

export function EditableProfileOverview({
  currentUser,
  initialSkills,
  initialSectors,
  socialConnections,
  showBio,
}: EditableProfileOverviewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState<EditorKey>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [profile, setProfile] = useState({
    name: currentUser.name,
    bio: showBio ? currentUser.bio : "",
    skills: initialSkills,
    sectors: initialSectors,
    linkedinUrl: currentUser.linkedinUrl ?? "",
    emailAddress: socialValue(socialConnections, "email"),
    slackWorkspace: socialValue(socialConnections, "slack"),
    microsoftTeamsWorkspace: socialValue(socialConnections, "microsoft_teams"),
    twitterHandle: socialValue(socialConnections, "twitter"),
    calendarEmail: socialValue(socialConnections, "calendar"),
    instagramHandle: socialValue(socialConnections, "instagram"),
    outsideNetworkAccessEnabled: currentUser.outsideNetworkAccessEnabled ?? false,
  });
  const [nameInput, setNameInput] = useState(currentUser.name);
  const [bioInput, setBioInput] = useState(showBio ? currentUser.bio : "");
  const [skillsInput, setSkillsInput] = useState(joinValues(initialSkills));
  const [sectorsInput, setSectorsInput] = useState(joinValues(initialSectors));
  const [linkedinInput, setLinkedinInput] = useState(currentUser.linkedinUrl ?? "");
  const [emailInput, setEmailInput] = useState(socialValue(socialConnections, "email"));
  const [slackInput, setSlackInput] = useState(socialValue(socialConnections, "slack"));
  const [teamsInput, setTeamsInput] = useState(socialValue(socialConnections, "microsoft_teams"));
  const [twitterInput, setTwitterInput] = useState(socialValue(socialConnections, "twitter"));
  const [calendarInput, setCalendarInput] = useState(socialValue(socialConnections, "calendar"));
  const [instagramInput, setInstagramInput] = useState(socialValue(socialConnections, "instagram"));
  const [accessInput, setAccessInput] = useState((currentUser.outsideNetworkAccessEnabled ?? false) ? "enabled" : "limited");

  async function saveProfile(payload: Record<string, unknown>, onSuccess: () => void) {
    setError(null);
    setFeedback(null);

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const body = (await response.json().catch(() => null)) as SaveProfileResponse | null;
      if (!response.ok || !body?.ok || !body.data?.user) {
        throw new Error(body?.error ?? "Unable to save your profile.");
      }

      onSuccess();
      setFeedback("Profile updated.");
      setEditing(null);
      startTransition(() => {
        router.refresh();
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to save your profile.");
    }
  }

  return (
    <article className="rounded-[2rem] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(244,247,251,0.92))] p-6 shadow-sm backdrop-blur sm:p-8">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_300px]">
        <div className="space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate">Profile</p>
            <div className="mt-4 space-y-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h1 className="font-display text-4xl tracking-tight text-ink sm:text-5xl">{profile.name}</h1>
                    {profile.bio ? <p className="mt-3 max-w-3xl text-sm leading-7 text-slate">{profile.bio}</p> : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing("identity");
                      setNameInput(profile.name);
                      setBioInput(profile.bio);
                      setError(null);
                      setFeedback(null);
                    }}
                    className="shrink-0 text-xs font-semibold uppercase tracking-[0.12em] text-sky-700 transition hover:text-sky-900"
                  >
                    Edit
                  </button>
                </div>

                {editing === "identity" ? (
                  <div className="rounded-[1.4rem] border border-sky-200 bg-sky-50/70 p-4">
                    <div className="grid gap-3">
                      <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">
                        Name
                        <input
                          type="text"
                          value={nameInput}
                          onChange={(event) => setNameInput(event.target.value)}
                          className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                          placeholder="George Smith"
                        />
                      </label>
                      <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">
                        Bio
                        <textarea
                          value={bioInput}
                          onChange={(event) => setBioInput(event.target.value)}
                          rows={4}
                          className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                          placeholder="What should Meshed know about your work and priorities?"
                        />
                      </label>
                      <div className="flex flex-wrap gap-3">
                        <Button
                          type="button"
                          onClick={() =>
                            void saveProfile(
                              {
                                name: nameInput.trim(),
                                bio: bioInput.trim(),
                              },
                              () => {
                                setProfile((previous) => ({
                                  ...previous,
                                  name: nameInput.trim(),
                                  bio: bioInput.trim(),
                                }));
                              },
                            )
                          }
                          disabled={isPending}
                        >
                          {isPending ? "Saving..." : "Save"}
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => setEditing(null)} disabled={isPending}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate">
                    {getDemoRoleLabel(currentUser)}
                  </span>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${
                      currentUser.worldVerified
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-amber-200 bg-amber-50 text-amber-800"
                    }`}
                  >
                    {currentUser.worldVerified ? "Verified Human" : "Verification Pending"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <FieldCard
              label="Skills"
              editing={editing === "skills"}
              onEdit={() => {
                setEditing("skills");
                setSkillsInput(joinValues(profile.skills));
                setError(null);
                setFeedback(null);
              }}
            >
              {editing === "skills" ? (
                <div className="mt-3 space-y-3">
                  <input
                    type="text"
                    value={skillsInput}
                    onChange={(event) => setSkillsInput(event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    placeholder="Pricing, Fundraising, Partnerships"
                  />
                  <p className="text-xs text-slate">Type a comma-separated list.</p>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      onClick={() =>
                        void saveProfile(
                          { skills: splitValues(skillsInput) },
                          () => {
                            setProfile((previous) => ({
                              ...previous,
                              skills: splitValues(skillsInput),
                            }));
                          },
                        )
                      }
                      disabled={isPending}
                    >
                      {isPending ? "Saving..." : "Save"}
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setEditing(null)} disabled={isPending}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm leading-6 text-ink">
                  {profile.skills.length ? profile.skills.map(titleCase).join(", ") : "No skills saved yet"}
                </p>
              )}
            </FieldCard>

            <FieldCard
              label="Sectors"
              editing={editing === "sectors"}
              onEdit={() => {
                setEditing("sectors");
                setSectorsInput(joinValues(profile.sectors));
                setError(null);
                setFeedback(null);
              }}
            >
              {editing === "sectors" ? (
                <div className="mt-3 space-y-3">
                  <input
                    type="text"
                    value={sectorsInput}
                    onChange={(event) => setSectorsInput(event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    placeholder="Fintech, Music, Insurance"
                  />
                  <p className="text-xs text-slate">Type a comma-separated list.</p>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      onClick={() =>
                        void saveProfile(
                          { sectors: splitValues(sectorsInput) },
                          () => {
                            setProfile((previous) => ({
                              ...previous,
                              sectors: splitValues(sectorsInput),
                            }));
                          },
                        )
                      }
                      disabled={isPending}
                    >
                      {isPending ? "Saving..." : "Save"}
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setEditing(null)} disabled={isPending}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm leading-6 text-ink">
                  {profile.sectors.length ? profile.sectors.map(titleCase).join(", ") : "No sectors saved yet"}
                </p>
              )}
            </FieldCard>

            <FieldCard
              label="Socials"
              editing={editing === "socials"}
              onEdit={() => {
                setEditing("socials");
                setLinkedinInput(profile.linkedinUrl);
                setEmailInput(profile.emailAddress);
                setSlackInput(profile.slackWorkspace);
                setTeamsInput(profile.microsoftTeamsWorkspace);
                setTwitterInput(profile.twitterHandle);
                setCalendarInput(profile.calendarEmail);
                setInstagramInput(profile.instagramHandle);
                setError(null);
                setFeedback(null);
              }}
              className="sm:col-span-2"
            >
              {editing === "socials" ? (
                <div className="mt-3 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">
                      LinkedIn
                      <input
                        type="url"
                        value={linkedinInput}
                        onChange={(event) => setLinkedinInput(event.target.value)}
                        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                        placeholder="https://www.linkedin.com/in/your-handle"
                      />
                    </label>
                    <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">
                      Email
                      <input
                        type="email"
                        value={emailInput}
                        onChange={(event) => setEmailInput(event.target.value)}
                        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                        placeholder="you@company.com"
                      />
                    </label>
                    <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">
                      Slack
                      <input
                        type="text"
                        value={slackInput}
                        onChange={(event) => setSlackInput(event.target.value)}
                        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                        placeholder="meshed.slack.com"
                      />
                    </label>
                    <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">
                      Microsoft Teams
                      <input
                        type="text"
                        value={teamsInput}
                        onChange={(event) => setTeamsInput(event.target.value)}
                        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                        placeholder="meshed.onmicrosoft.com"
                      />
                    </label>
                    <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">
                      Twitter / X
                      <input
                        type="text"
                        value={twitterInput}
                        onChange={(event) => setTwitterInput(event.target.value)}
                        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                        placeholder="@yourhandle"
                      />
                    </label>
                    <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">
                      Calendar email
                      <input
                        type="email"
                        value={calendarInput}
                        onChange={(event) => setCalendarInput(event.target.value)}
                        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                        placeholder="calendar@company.com"
                      />
                    </label>
                    <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate sm:col-span-2">
                      Instagram
                      <input
                        type="text"
                        value={instagramInput}
                        onChange={(event) => setInstagramInput(event.target.value)}
                        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                        placeholder="@yourhandle"
                      />
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      onClick={() =>
                        void saveProfile(
                          {
                            linkedinUrl: linkedinInput.trim(),
                            emailAddress: emailInput.trim(),
                            slackWorkspace: slackInput.trim(),
                            microsoftTeamsWorkspace: teamsInput.trim(),
                            twitterHandle: twitterInput.trim(),
                            calendarEmail: calendarInput.trim(),
                            instagramHandle: instagramInput.trim(),
                          },
                          () => {
                            setProfile((previous) => ({
                              ...previous,
                              linkedinUrl: linkedinInput.trim(),
                              emailAddress: emailInput.trim(),
                              slackWorkspace: slackInput.trim(),
                              microsoftTeamsWorkspace: teamsInput.trim(),
                              twitterHandle: twitterInput.trim(),
                              calendarEmail: calendarInput.trim(),
                              instagramHandle: instagramInput.trim(),
                            }));
                          },
                        )
                      }
                      disabled={isPending}
                    >
                      {isPending ? "Saving..." : "Save"}
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setEditing(null)} disabled={isPending}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate">LinkedIn</p>
                    <p className="mt-1 break-all text-sm leading-6 text-ink">{socialLabel(profile.linkedinUrl)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate">Email</p>
                    <p className="mt-1 break-all text-sm leading-6 text-ink">{socialLabel(profile.emailAddress)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate">Slack</p>
                    <p className="mt-1 break-all text-sm leading-6 text-ink">{socialLabel(profile.slackWorkspace)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate">Microsoft Teams</p>
                    <p className="mt-1 break-all text-sm leading-6 text-ink">{socialLabel(profile.microsoftTeamsWorkspace)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate">Twitter / X</p>
                    <p className="mt-1 break-all text-sm leading-6 text-ink">{socialLabel(profile.twitterHandle)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate">Calendar</p>
                    <p className="mt-1 break-all text-sm leading-6 text-ink">{socialLabel(profile.calendarEmail)}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate">Instagram</p>
                    <p className="mt-1 break-all text-sm leading-6 text-ink">{socialLabel(profile.instagramHandle)}</p>
                  </div>
                </div>
              )}
            </FieldCard>

            <FieldCard
              label="Outside-network access"
              editing={editing === "access"}
              onEdit={() => {
                setEditing("access");
                setAccessInput(profile.outsideNetworkAccessEnabled ? "enabled" : "limited");
                setError(null);
                setFeedback(null);
              }}
            >
              {editing === "access" ? (
                <div className="mt-3 space-y-3">
                  <select
                    value={accessInput}
                    onChange={(event) => setAccessInput(event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  >
                    <option value="limited">Limit intros to the current network</option>
                    <option value="enabled">Allow trusted outside-network intros</option>
                  </select>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      onClick={() =>
                        void saveProfile(
                          { outsideNetworkAccessEnabled: accessInput === "enabled" },
                          () => {
                            setProfile((previous) => ({
                              ...previous,
                              outsideNetworkAccessEnabled: accessInput === "enabled",
                            }));
                          },
                        )
                      }
                      disabled={isPending}
                    >
                      {isPending ? "Saving..." : "Save"}
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setEditing(null)} disabled={isPending}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm leading-6 text-ink">
                  {profile.outsideNetworkAccessEnabled ? "Enabled for trusted intros" : "Limited to current network"}
                </p>
              )}
            </FieldCard>
          </div>

          {feedback ? <p className="text-sm text-emerald-700">{feedback}</p> : null}
          {error ? <p className="text-sm text-rose-700">{error}</p> : null}
        </div>

        <aside className="rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-sm backdrop-blur sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate">Profile image</p>
          <div className="mt-5 flex justify-center">
            <ProfileImageUploader
              initialImageUrl={currentUser.profileImageUrl ?? null}
              displayName={currentUser.name}
              label={null}
              description={null}
              compact
              frameClassName="h-44 w-44 sm:h-52 sm:w-52"
            />
          </div>
        </aside>
      </div>
    </article>
  );
}
