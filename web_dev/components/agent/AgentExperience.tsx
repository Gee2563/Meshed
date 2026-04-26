"use client";

import { useMemo, useState } from "react";

import ChatbotClient from "@/app/chatbot/ChatbotClient";
import { LogoutButton } from "@/components/LogoutButton";
import { OnboardingChatbot } from "@/components/onboarding/OnboardingChatbot";
import { Button } from "@/components/ui/Button";
import type {
  A16zCompanyGraphNode,
} from "@/lib/server/meshed-network/a16z-crypto-dashboard";
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

type AgentExperienceProps = {
  currentUserName: string;
  currentUserVerified: boolean;
  currentUserRole: UserRole;
  currentStep: RegistrationFlowStep;
  setupMode: boolean;
  vcCompany: CompanySummary | null;
  memberCompany: CompanySummary | null;
  vcOptions: VcOption[];
  socialConnections: UserSocialConnectionSummary[];
  latestNetworkJob: NetworkPreparationJobSummary | null;
  initialCompanyNodes: A16zCompanyGraphNode[];
};

type AgentContextResponse = {
  ok?: boolean;
  error?: string;
  data?: {
    networkReady?: boolean;
    companyNodes?: A16zCompanyGraphNode[];
    vcCompanyName?: string | null;
    memberCompanyName?: string | null;
    currentPainTags?: string[];
  } | null;
} | null;

type AgentPhase = "setup" | "intro" | "live";

type AgentCapabilityCard = {
  title: string;
  body: string;
};

type AgentIntroContext = {
  vcCompanyName: string | null;
  memberCompanyName: string | null;
  currentPainTags: string[];
  capabilities: AgentCapabilityCard[];
  samplePrompts: string[];
};

function buildLiveIntroMessage(input: {
  currentUserName: string;
  vcCompanyName?: string | null;
  memberCompanyName?: string | null;
  currentPainTags?: string[];
}) {
  const companyLabel = input.memberCompanyName || input.vcCompanyName || "your network";
  const painTags = (input.currentPainTags ?? []).filter(Boolean);
  const painPointSummary =
    painTags.length > 0 ? ` I'm already holding ${painTags.slice(0, 3).join(", ")} in context.` : "";

  return `Setup complete, ${input.currentUserName}. I'm live with ${companyLabel} in context.${painPointSummary} What should I work on first?`;
}

function formatPainTag(tag: string) {
  return tag
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizePainTags(tags: string[] | null | undefined) {
  return (tags ?? []).map((tag) => tag.trim()).filter(Boolean).slice(0, 3);
}

function describeRole(role: UserRole) {
  switch (role) {
    case "investor":
      return "investor";
    case "mentor":
      return "advisor";
    case "consultant":
      return "operator-side consultant";
    case "operator":
      return "founder or operator";
    default:
      return "network member";
  }
}

function buildAgentIntroContext(input: {
  role: UserRole;
  vcCompanyName?: string | null;
  memberCompanyName?: string | null;
  currentPainTags?: string[] | null;
}) {
  const vcCompanyName = input.vcCompanyName ?? null;
  const memberCompanyName = input.memberCompanyName ?? null;
  const currentPainTags = normalizePainTags(input.currentPainTags);
  const companyLabel = memberCompanyName || vcCompanyName || "your network";
  const primaryPainTag = currentPainTags[0] ? formatPainTag(currentPainTags[0]) : null;
  const roleLabel = describeRole(input.role);

  const capabilities: AgentCapabilityCard[] =
    input.role === "investor"
      ? [
          {
            title: "Surface high-value introductions",
            body: `I can scan ${companyLabel} for founders, LPs, advisors, and portfolio links worth moving on now.`,
          },
          {
            title: "Prioritize coordination",
            body: "I can tell you which relationships need follow-up, which introductions are strongest, and where verified human momentum is building.",
          },
          {
            title: "Route opportunities through people",
            body: "I can turn graph signals into human-backed outreach, verified interactions, and next best actions for your team.",
          },
        ]
      : [
          {
            title: "Find people who can unblock you",
            body: primaryPainTag
              ? `I can look for founders, operators, advisors, and LPs who already have signal around ${primaryPainTag.toLowerCase()}.`
              : "I can look for founders, operators, advisors, and LPs who match the challenges you're working through right now.",
          },
          {
            title: "Spot timely opportunities",
            body: `I can surface intros, conference meetings, collaboration threads, and warm paths across ${companyLabel}.`,
          },
          {
            title: "Keep your follow-through tight",
            body: "I can suggest who to follow up with, what to ask for, and where a verified human handoff is most likely to create value.",
          },
        ];

  const samplePrompts =
    input.role === "investor"
      ? [
          `Which founders, LPs, and advisors in ${vcCompanyName ?? "my network"} should I coordinate with this week?`,
          `What are the strongest verified introductions I should make across ${vcCompanyName ?? "the portfolio"} right now?`,
          `Where is there a live pain-point match I should route into a human-backed intro?`,
          "Which recent verified interactions are worth following up on before they go cold?",
          "What opportunities should my Meshed agent surface before my next partner meeting?",
        ]
      : [
          primaryPainTag
            ? `Who in ${vcCompanyName ?? "the network"} has already solved ${primaryPainTag.toLowerCase()} and is worth meeting?`
            : `Who in ${vcCompanyName ?? "the network"} should I meet to accelerate my current priorities?`,
          `What are the strongest people and opportunity matches for ${memberCompanyName ?? "my company"} right now?`,
          "I'm heading to an event soon. Who should my Meshed agent recommend I meet first?",
          "What proactive alerts should I be paying attention to this week?",
          "Which verified interactions or introductions would create the most momentum for me right now?",
        ];

  return {
    vcCompanyName,
    memberCompanyName,
    currentPainTags,
    capabilities,
    samplePrompts,
  } satisfies AgentIntroContext;
}

function AgentIntroLayer({
  currentUserName,
  currentUserVerified,
  currentUserRole,
  context,
  onOpenLiveChat,
}: {
  currentUserName: string;
  currentUserVerified: boolean;
  currentUserRole: UserRole;
  context: AgentIntroContext;
  onOpenLiveChat: (prompt?: string | null) => void;
}) {
  const companyLabel = context.memberCompanyName || context.vcCompanyName || "your network";
  const roleLabel = describeRole(currentUserRole);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.9fr)]">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
            Meshed Agent
          </span>
          <span
            className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
              currentUserVerified
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-amber-200 bg-amber-50 text-amber-700"
            }`}
          >
            {currentUserVerified ? "Verified Human" : "Verification pending"}
          </span>
        </div>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Before we jump in, here&apos;s what I can do for you.
        </h2>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
          Hi {currentUserName} — I&apos;m your Meshed agent. I&apos;m tuned for a {roleLabel} working inside {companyLabel}, and I can
          turn graph intelligence, verified interactions, and your setup context into concrete next moves.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {context.capabilities.map((capability) => (
            <article key={capability.title} className="rounded-[1.6rem] border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-sm font-semibold text-slate-900">{capability.title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{capability.body}</p>
            </article>
          ))}
        </div>
        <div className="mt-6 rounded-[1.6rem] border border-sky-200 bg-sky-50/70 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">How to use me</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            Ask for people to meet, intros to make, opportunities to pursue, signals to watch, or follow-up priorities to tighten.
            I&apos;ll stay grounded in your Meshed network and recommend the strongest human-backed path.
          </p>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={() => onOpenLiveChat()}>Open live chat</Button>
          <Button variant="secondary" href="/dashboard">
            Open dashboard instead
          </Button>
        </div>
      </section>

      <aside className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Try saying</p>
        <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">Sample prompts for {currentUserName}</h3>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Here are a few strong ways to kick off the conversation. Tap one and I&apos;ll drop it into chat for you.
        </p>
        <div className="mt-5 space-y-3">
          {context.samplePrompts.map((prompt, index) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onOpenLiveChat(prompt)}
              className="block w-full rounded-[1.4rem] border border-slate-200 bg-slate-50/70 px-4 py-4 text-left transition hover:border-sky-300 hover:bg-sky-50"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Sample {index + 1}</p>
              <p className="mt-2 text-sm leading-6 text-slate-800">{prompt}</p>
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}

export function AgentExperience({
  currentUserName,
  currentUserVerified,
  currentUserRole,
  currentStep,
  setupMode,
  vcCompany,
  memberCompany,
  vcOptions,
  socialConnections,
  latestNetworkJob,
  initialCompanyNodes,
}: AgentExperienceProps) {
  const [phase, setPhase] = useState<AgentPhase>(setupMode || currentStep !== "ready" ? "setup" : "intro");
  const [setupStartingStep, setSetupStartingStep] = useState<RegistrationFlowStep>(setupMode ? "vc_company" : currentStep);
  const [companyNodes, setCompanyNodes] = useState<A16zCompanyGraphNode[]>(initialCompanyNodes);
  const [loadingLiveAgent, setLoadingLiveAgent] = useState(false);
  const [experienceError, setExperienceError] = useState<string | null>(null);
  const [draftPrompt, setDraftPrompt] = useState<string | null>(null);
  const [introContext, setIntroContext] = useState<AgentIntroContext>(() =>
    buildAgentIntroContext({
      role: currentUserRole,
      vcCompanyName: vcCompany?.name,
      memberCompanyName: memberCompany?.name,
      currentPainTags: memberCompany?.currentPainTags ?? vcCompany?.currentPainTags ?? [],
    }),
  );
  const [introMessage, setIntroMessage] = useState<string | null>(() =>
    currentStep === "ready"
      ? buildLiveIntroMessage({
          currentUserName,
          vcCompanyName: vcCompany?.name,
          memberCompanyName: memberCompany?.name,
          currentPainTags: memberCompany?.currentPainTags ?? vcCompany?.currentPainTags ?? [],
        })
      : null,
  );

  const setupCurrentStep = useMemo<RegistrationFlowStep>(
    () => (phase === "setup" ? setupStartingStep : currentStep),
    [currentStep, phase, setupStartingStep],
  );

  async function openLiveAgent() {
    setLoadingLiveAgent(true);
    setExperienceError(null);

    try {
      const response = await fetch("/api/agent/context", {
        method: "GET",
        cache: "no-store",
      });
      const body = (await response.json().catch(() => null)) as AgentContextResponse;

      if (!response.ok || !body?.ok || !body.data?.networkReady) {
        throw new Error(body?.error ?? "Your Agent context is still finishing its refresh.");
      }

      setCompanyNodes(body.data.companyNodes ?? []);
      setIntroContext(
        buildAgentIntroContext({
          role: currentUserRole,
          vcCompanyName: body.data.vcCompanyName,
          memberCompanyName: body.data.memberCompanyName,
          currentPainTags: body.data.currentPainTags ?? [],
        }),
      );
      setIntroMessage(
        buildLiveIntroMessage({
          currentUserName,
          vcCompanyName: body.data.vcCompanyName,
          memberCompanyName: body.data.memberCompanyName,
          currentPainTags: body.data.currentPainTags ?? [],
        }),
      );
      setPhase("intro");
      setSetupStartingStep("ready");
      if (window.location.search) {
        window.history.replaceState(window.history.state, "", "/agent");
      }
    } catch (error) {
      setExperienceError(error instanceof Error ? error.message : "Unable to open the live Meshed agent.");
    } finally {
      setLoadingLiveAgent(false);
    }
  }

  function enterLiveChat(prompt?: string | null) {
    setDraftPrompt(prompt?.trim() ? prompt : null);
    setPhase("live");
  }

  return (
    <main className="px-6 py-16">
      <section className="mx-auto max-w-7xl space-y-6 rounded-[2rem] border border-white/70 bg-white/85 px-8 py-10 shadow-[0_30px_120px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-700">Meshed Agent</p>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              {phase === "setup"
                ? setupMode
                  ? `Let's refresh ${currentUserName}'s setup.`
                  : `Let's prepare ${currentUserName}'s Meshed agent.`
                : phase === "intro"
                  ? `Welcome in, ${currentUserName}.`
                  : "Your AI Doppelganger is live."}
            </h1>
            <p className="text-base leading-7 text-slate-600">
              {phase === "setup"
                ? "Your Agent now owns setup chat. It captures VC context, social surfaces, and pain points before flowing directly into the live Meshed assistant."
                : phase === "intro"
                  ? "Before the live chat opens, Meshed gives your agent one clean moment to explain how it can help and show a few strong ways to start."
                  : "Now that setup is complete, your Agent can help with opportunity discovery, proactive alerts, coordination, and verified human handoffs across Meshed."}
            </p>
            {loadingLiveAgent ? (
              <p className="text-sm font-medium text-sky-700">Switching your setup chat into the live Meshed agent...</p>
            ) : null}
            {experienceError ? <p className="text-sm text-rose-700">{experienceError}</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {phase !== "setup" ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setSetupStartingStep("vc_company");
                  setPhase("setup");
                }}
              >
                Update setup with Agent
              </Button>
            ) : null}
            <Button href="/profile" variant="secondary">
              Edit in profile
            </Button>
            {phase !== "setup" ? (
              <Button href="/dashboard" variant="secondary">
                Open dashboard
              </Button>
            ) : null}
            <LogoutButton />
          </div>
        </div>

        {phase === "setup" ? (
          <OnboardingChatbot
            key={`${setupMode ? "setup" : "default"}-${phase}`}
            currentStep={setupCurrentStep}
            currentUserName={currentUserName}
            currentUserRole={currentUserRole}
            vcCompany={vcCompany}
            memberCompany={memberCompany}
            vcOptions={vcOptions}
            socialConnections={socialConnections}
            latestNetworkJob={latestNetworkJob}
            onReady={openLiveAgent}
          />
        ) : phase === "intro" ? (
          <AgentIntroLayer
            currentUserName={currentUserName}
            currentUserVerified={currentUserVerified}
            currentUserRole={currentUserRole}
            context={introContext}
            onOpenLiveChat={enterLiveChat}
          />
        ) : (
          <ChatbotClient
            companyNodes={companyNodes}
            currentUserName={currentUserName}
            currentUserVerified={currentUserVerified}
            introMessage={introMessage}
            draftPrompt={draftPrompt}
            samplePrompts={introContext.samplePrompts}
          />
        )}
      </section>
    </main>
  );
}
