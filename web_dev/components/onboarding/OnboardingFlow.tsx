"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import type {
  CompanySummary,
  NetworkPreparationJobSummary,
  RegistrationFlowStep,
  UserRole,
  UserSocialConnectionSummary,
} from "@/lib/types";

type VcOption = {
  id: string;
  name: string;
  website: string;
  pointOfContactName?: string | null;
  pointOfContactEmail?: string | null;
  source: "known" | "db";
};

type OnboardingFlowProps = {
  currentStep: RegistrationFlowStep;
  currentUserRole: UserRole;
  vcCompany: CompanySummary | null;
  memberCompany: CompanySummary | null;
  vcOptions: VcOption[];
  socialConnections: UserSocialConnectionSummary[];
  latestNetworkJob: NetworkPreparationJobSummary | null;
};

type ApiResponse<T> = {
  ok?: boolean;
  error?: string;
  data?: T;
};

type SocialField = {
  label: string;
  value: string;
  setValue: (value: string) => void;
  placeholder: string;
  type: React.HTMLInputTypeAttribute;
};

function getSocialLabel(provider: UserSocialConnectionSummary["provider"]) {
  switch (provider) {
    case "linkedin":
      return "LinkedIn";
    case "email":
      return "Email";
    case "slack":
      return "Slack";
    case "microsoft_teams":
      return "Microsoft Teams";
    case "twitter":
      return "Twitter / X";
    case "calendar":
      return "Calendar";
    case "instagram":
      return "Instagram";
  }
}

function getAccountLabel(
  connections: UserSocialConnectionSummary[],
  provider: UserSocialConnectionSummary["provider"],
) {
  return connections.find((connection) => connection.provider === provider)?.accountLabel ?? "";
}

export function OnboardingFlow({
  currentStep,
  currentUserRole,
  vcCompany,
  memberCompany,
  vcOptions,
  socialConnections,
  latestNetworkJob,
}: OnboardingFlowProps) {
  const router = useRouter();
  const isVcUser = currentUserRole === "investor";
  const [step, setStep] = useState<RegistrationFlowStep>(currentStep);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(vcCompany?.id ?? vcOptions[0]?.id ?? "manual");
  const [companyName, setCompanyName] = useState(vcCompany?.name ?? "");
  const [website, setWebsite] = useState(vcCompany?.website ?? "");
  const [pointOfContactName, setPointOfContactName] = useState(vcCompany?.pointOfContactName ?? "");
  const [pointOfContactEmail, setPointOfContactEmail] = useState(vcCompany?.pointOfContactEmail ?? "");
  const [memberCompanyName, setMemberCompanyName] = useState(memberCompany?.name ?? "");
  const [memberCompanyAddress, setMemberCompanyAddress] = useState(memberCompany?.address ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState(getAccountLabel(socialConnections, "linkedin"));
  const [emailAddress, setEmailAddress] = useState(getAccountLabel(socialConnections, "email"));
  const [slackWorkspace, setSlackWorkspace] = useState(getAccountLabel(socialConnections, "slack"));
  const [microsoftTeamsWorkspace, setMicrosoftTeamsWorkspace] = useState(
    getAccountLabel(socialConnections, "microsoft_teams"),
  );
  const [twitterHandle, setTwitterHandle] = useState(getAccountLabel(socialConnections, "twitter"));
  const [calendarEmail, setCalendarEmail] = useState(getAccountLabel(socialConnections, "calendar"));
  const [instagramHandle, setInstagramHandle] = useState(getAccountLabel(socialConnections, "instagram"));
  const [job, setJob] = useState<NetworkPreparationJobSummary | null>(latestNetworkJob);
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const socialFields: SocialField[] = [
    {
      label: "LinkedIn URL",
      value: linkedinUrl,
      setValue: setLinkedinUrl,
      placeholder: "https://www.linkedin.com/in/your-handle",
      type: "url",
    },
    {
      label: "Email access",
      value: emailAddress,
      setValue: setEmailAddress,
      placeholder: "you@company.com",
      type: "email",
    },
    {
      label: "Slack workspace",
      value: slackWorkspace,
      setValue: setSlackWorkspace,
      placeholder: "meshed.slack.com",
      type: "text",
    },
    {
      label: "Microsoft Teams",
      value: microsoftTeamsWorkspace,
      setValue: setMicrosoftTeamsWorkspace,
      placeholder: "meshed.onmicrosoft.com",
      type: "text",
    },
    {
      label: "Twitter / X",
      value: twitterHandle,
      setValue: setTwitterHandle,
      placeholder: "@yourhandle",
      type: "text",
    },
    {
      label: "Calendar email",
      value: calendarEmail,
      setValue: setCalendarEmail,
      placeholder: "calendar@company.com",
      type: "email",
    },
    {
      label: "Instagram",
      value: instagramHandle,
      setValue: setInstagramHandle,
      placeholder: "@yourhandle",
      type: "text",
    },
  ];

  const selectedOption = useMemo(
    () => vcOptions.find((option) => option.id === selectedCompanyId) ?? null,
    [selectedCompanyId, vcOptions],
  );

  useEffect(() => {
    if (selectedOption) {
      setCompanyName(selectedOption.name);
      setWebsite(selectedOption.website);
      setPointOfContactName(selectedOption.pointOfContactName ?? "");
      setPointOfContactEmail(selectedOption.pointOfContactEmail ?? "");
    }
  }, [selectedOption]);

  useEffect(() => {
    if (step !== "network_preparing") {
      return;
    }

    let active = true;
    const interval = window.setInterval(async () => {
      const response = await fetch("/api/onboarding/status", {
        method: "GET",
        cache: "no-store",
      });
      const body = (await response.json().catch(() => null)) as ApiResponse<{
        currentStep: RegistrationFlowStep;
        latestNetworkJob: NetworkPreparationJobSummary | null;
        networkReady: boolean;
      }> | null;

      if (!active || !body?.ok || !body.data) {
        return;
      }

      setJob(body.data.latestNetworkJob ?? null);
      if (body.data.networkReady || body.data.currentStep === "ready") {
        router.replace("/dashboard");
        router.refresh();
      }
    }, 8000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [router, step]);

  async function submitVcSelection() {
    setPending(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/onboarding/vc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          selectedCompanyId: selectedCompanyId === "manual" ? null : selectedCompanyId,
          companyName: selectedCompanyId === "manual" ? companyName : null,
          website,
          pointOfContactName,
          pointOfContactEmail,
          memberCompanyName: isVcUser ? null : memberCompanyName,
          memberCompanyAddress: isVcUser ? null : memberCompanyAddress,
        }),
      });

      const body = (await response.json().catch(() => null)) as ApiResponse<{
        networkJob?: NetworkPreparationJobSummary | null;
      }> | null;
      if (!response.ok || !body?.ok) {
        throw new Error(body?.error ?? "Unable to save your VC selection.");
      }

      setJob(body.data?.networkJob ?? null);
      setStep("socials");
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save your VC selection.");
    } finally {
      setPending(false);
    }
  }

  async function submitSocials() {
    setPending(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/onboarding/socials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          linkedinUrl,
          emailAddress,
          slackWorkspace,
          microsoftTeamsWorkspace,
          twitterHandle,
          calendarEmail,
          instagramHandle,
        }),
      });

      const body = (await response.json().catch(() => null)) as ApiResponse<{
        nextRoute?: string;
        networkReady?: boolean;
      }> | null;
      if (!response.ok || !body?.ok) {
        throw new Error(body?.error ?? "Unable to save your social connections.");
      }

      if (body.data?.networkReady || body.data?.nextRoute === "/dashboard") {
        router.replace("/dashboard");
        router.refresh();
        return;
      }

      setStep("network_preparing");
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save your social connections.");
    } finally {
      setPending(false);
    }
  }

  async function restartNetworkPrep() {
    setPending(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/onboarding/network/retry", {
        method: "POST",
      });
      const body = (await response.json().catch(() => null)) as ApiResponse<{
        job: NetworkPreparationJobSummary;
      }> | null;

      if (!response.ok || !body?.ok || !body.data?.job) {
        throw new Error(body?.error ?? "Unable to restart network preparation.");
      }

      setJob(body.data.job);
      setStep("network_preparing");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to restart network preparation.");
    } finally {
      setPending(false);
    }
  }

  const portfolioCount = Number((job?.result?.summary as { portfolio_company_count?: number } | undefined)?.portfolio_company_count ?? 0);
  const lpCount = Number((job?.result?.summary as { lp_contact_count?: number } | undefined)?.lp_contact_count ?? 0);
  const scannedCompanyCount = Number((job?.result?.summary as { company_scan_count?: number } | undefined)?.company_scan_count ?? 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className={`rounded-2xl border px-4 py-4 ${step === "vc_company" ? "border-sky-300 bg-sky-50" : "border-slate-200 bg-white"}`}>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Step 1</p>
          <p className="mt-2 text-sm font-medium text-slate-900">{isVcUser ? "Choose your VC" : "Choose your VC and company"}</p>
        </div>
        <div className={`rounded-2xl border px-4 py-4 ${step === "socials" ? "border-sky-300 bg-sky-50" : "border-slate-200 bg-white"}`}>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Step 2</p>
          <p className="mt-2 text-sm font-medium text-slate-900">Register socials</p>
        </div>
        <div
          className={`rounded-2xl border px-4 py-4 ${
            step === "network_preparing" ? "border-sky-300 bg-sky-50" : "border-slate-200 bg-white"
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Step 3</p>
          <p className="mt-2 text-sm font-medium text-slate-900">Network preparation</p>
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{errorMessage}</div>
      ) : null}

      {step === "vc_company" ? (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">VC onboarding</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Select the VC you belong to.</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
            Meshed will use this website as the starting point for your background network-preparation agent. If your VC
            is not listed, add it manually and Meshed will inspect the site, learn its portfolio pattern, and generate a
            custom scraper for it.
          </p>
          {!isVcUser ? (
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              Because you&apos;re onboarding as a non-VC member, Meshed also needs the company you represent so your
              verified agent can route intros, updates, and opportunities back to the right team.
            </p>
          ) : null}

          <label className="mt-5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            VC firm
            <select
              value={selectedCompanyId}
              onChange={(event) => setSelectedCompanyId(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            >
              {vcOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
              <option value="manual">My VC is not listed</option>
            </select>
          </label>

          {selectedCompanyId === "manual" ? (
            <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              VC name
              <input
                type="text"
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                placeholder="Example Ventures"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
            </label>
          ) : null}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              VC website
              <input
                type="url"
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
                placeholder="https://yourvc.com"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Point of contact
              <input
                type="text"
                value={pointOfContactName}
                onChange={(event) => setPointOfContactName(event.target.value)}
                placeholder="Dana Partner"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
            </label>
          </div>

          <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Point of contact email
            <input
              type="email"
              value={pointOfContactEmail}
              onChange={(event) => setPointOfContactEmail(event.target.value)}
              placeholder="partner@yourvc.com"
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />
          </label>

          {!isVcUser ? (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Your company</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Tell Meshed the company you represent so we can anchor your verified profile to the right operating
                business.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Company name
                  <input
                    type="text"
                    value={memberCompanyName}
                    onChange={(event) => setMemberCompanyName(event.target.value)}
                    placeholder="Acme AI"
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Company address
                  <input
                    type="text"
                    value={memberCompanyAddress}
                    onChange={(event) => setMemberCompanyAddress(event.target.value)}
                    placeholder="123 Market St, San Francisco, CA"
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  />
                </label>
              </div>
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button type="button" onClick={submitVcSelection} disabled={pending}>
              {pending ? "Saving..." : "Continue to socials"}
            </Button>
            <p className="text-xs leading-5 text-slate-500">
              Meshed will queue the background network-preparation agent as soon as this step is saved.
            </p>
          </div>
        </div>
      ) : null}

      {step === "socials" ? (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Social graph setup</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Register the channels your agent can use.</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
            While Meshed prepares your VC network in the background, register the public or permissioned social sources
            that your Meshed agent should use for coordination, meeting recommendations, and proactive alerts.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {socialFields.map((field) => (
              <label key={field.label} className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                {field.label}
                <input
                  type={field.type}
                  value={field.value}
                  onChange={(event) => field.setValue(event.target.value)}
                  placeholder={field.placeholder}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
              </label>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-sm font-medium text-slate-900">Background agent status</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {job
                ? `The network-preparation agent is currently ${job.status.replace(/_/g, " ")} for ${website || vcCompany?.website || "your VC website"}.`
                : "The network-preparation agent will start as soon as you save this step."}
            </p>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button type="button" onClick={submitSocials} disabled={pending}>
              {pending ? "Saving..." : "Finish onboarding"}
            </Button>
          </div>
        </div>
      ) : null}

      {step === "network_preparing" ? (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Network preparation</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
            Meshed is preparing your VC network in the background.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
            Your scraping agent is first inspecting the VC website to find portfolio, investments, and people pages, then
            generating a custom site-specific scraper before iterating over portfolio company websites for public news and
            team signals. We&apos;ll notify you in Meshed once the network is ready.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Status</p>
              <p className="mt-2 text-sm font-medium text-slate-900">{job?.status.replace(/_/g, " ") ?? "queued"}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Portfolio companies</p>
              <p className="mt-2 text-sm font-medium text-slate-900">{portfolioCount}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">LP / advisor contacts</p>
              <p className="mt-2 text-sm font-medium text-slate-900">{lpCount}</p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-sm font-medium text-slate-900">
              {job?.statusMessage ?? "Meshed is preparing your network graph and portfolio context."}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {job?.status === "ready"
                ? `The agent completed scans across ${scannedCompanyCount} company websites. Redirecting you to the dashboard now.`
                : job?.status === "failed"
                  ? job.errorMessage ?? "The first pass did not complete. You can restart the preparation job."
                  : `So far we have scanned ${scannedCompanyCount} company websites and will keep going in the background.`}
            </p>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button type="button" variant="secondary" onClick={() => router.refresh()}>
              Refresh status
            </Button>
            {job?.status === "failed" ? (
              <Button type="button" onClick={restartNetworkPrep} disabled={pending}>
                {pending ? "Restarting..." : "Restart network prep"}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {step === "ready" ? (
        <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">Ready</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Your network is ready.</h2>
          <p className="mt-4 text-sm leading-7 text-slate-700">
            Meshed finished preparing your network. Open the dashboard to review the first pass.
          </p>
          <div className="mt-5">
            <Button href="/dashboard">Open dashboard</Button>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Social sources</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {socialConnections.map((connection) => (
            <span
              key={connection.provider}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                connection.status === "connected" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
              }`}
            >
              {getSocialLabel(connection.provider)}: {connection.status === "connected" ? "registered" : "skipped"}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
