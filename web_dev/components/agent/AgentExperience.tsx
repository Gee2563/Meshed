"use client";

import { useMemo, useState } from "react";

import ChatbotClient from "@/app/chatbot/ChatbotClient";
import { OnboardingChatbot } from "@/components/onboarding/OnboardingChatbot";
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
  currentUserTitle?: string | null;
  currentUserProfileImageUrl?: string | null;
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

type AgentPhase = "setup" | "live";

type AgentCapabilityCard = {
  title: string;
  body: string;
};

type AgentIntroContext = {
  vcCompanyName: string | null;
  memberCompanyName: string | null;
  currentPainTags: string[];
  connectedChannels: string[];
  capabilities: AgentCapabilityCard[];
  samplePrompts: string[];
};

function buildLiveIntroMessage(input: {
  currentUserName: string;
  role: UserRole;
  vcCompanyName?: string | null;
  memberCompanyName?: string | null;
}) {
  const companyLabel = input.memberCompanyName || input.vcCompanyName || "your network";
  return `Before we jump in, here's what I can do for you.\n\nHi ${input.currentUserName} — I'm your Meshed agent. I'm tuned for a ${describeRole(
    input.role,
  )} working inside ${companyLabel}, and I can turn graph intelligence, verified interactions, and your setup context into concrete next moves. Just say the word and I'll explain some of the things I can do.`;
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
    case "employee":
      return "employee";
    case "founder":
      return "founder";
    case "mentor":
      return "employee";
    case "consultant":
      return "employee";
    case "operator":
      return "founder";
    default:
      return "network member";
  }
}

function formatProviderLabel(provider: UserSocialConnectionSummary["provider"]) {
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
    default:
      return provider;
  }
}

function summarizeChannels(labels: string[]) {
  if (labels.length === 0) {
    return "no connected channels yet";
  }

  if (labels.length === 1) {
    return labels[0];
  }

  if (labels.length === 2) {
    return `${labels[0]} and ${labels[1]}`;
  }

  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

function buildAgentIntroContext(input: {
  role: UserRole;
  vcCompanyName?: string | null;
  memberCompanyName?: string | null;
  currentPainTags?: string[] | null;
  socialConnections?: UserSocialConnectionSummary[];
}) {
  const vcCompanyName = input.vcCompanyName ?? null;
  const memberCompanyName = input.memberCompanyName ?? null;
  const currentPainTags = normalizePainTags(input.currentPainTags);
  const companyLabel = memberCompanyName || vcCompanyName || "your network";
  const primaryPainTag = currentPainTags[0] ? formatPainTag(currentPainTags[0]) : null;
  const connectedChannels = (input.socialConnections ?? [])
    .filter((connection) => connection.status === "connected")
    .map((connection) => formatProviderLabel(connection.provider))
    .filter((label, index, array) => array.indexOf(label) === index);
  const connectedChannelSummary = summarizeChannels(connectedChannels);

  const capabilities: AgentCapabilityCard[] =
    input.role === "investor"
      ? [
          {
            title: "Surface high-value introductions",
            body: `I can scan ${companyLabel} for founders, LPs, advisors, and portfolio links that are worth escalating before they cool off.`,
          },
          {
            title: "Prioritize coordination",
            body: "I can show you which relationships need follow-up, which introductions are strongest, and where verified human momentum is already building.",
          },
          {
            title: "Route opportunities through people",
            body: "I can turn graph signals into human-backed outreach, verified interactions, and next-best actions your team can actually move on.",
          },
          {
            title: "Work from your setup context",
            body:
              connectedChannels.length > 0
                ? `You've already given me ${connectedChannelSummary} in your setup context, so I can keep those surfaces in mind when I prioritize opportunities.`
                : "As you add channels, I can keep that context in mind alongside the Meshed graph and verified interactions.",
          },
        ]
      : input.role === "employee" || input.role === "mentor" || input.role === "consultant"
        ? [
            {
              title: "Find teams that match your edge",
              body: primaryPainTag
                ? `I can look for founders and operators who need help with ${primaryPainTag.toLowerCase()} and are a strong fit for your experience.`
                : "I can look for founders and operators whose current pain points line up with your strengths and operator experience.",
            },
            {
              title: "Recommend timely support",
              body: `I can surface the people, teams, and intros across ${companyLabel} where your help is likely to land best right now.`,
            },
            {
              title: "Turn signal into action",
              body: "I can help you decide who to reach out to, what kind of support to offer, and when to route things into a verified human handoff.",
            },
            {
              title: "Work from your setup context",
              body:
                connectedChannels.length > 0
                  ? `You've already given me ${connectedChannelSummary} in your setup context, so I can keep those surfaces in mind when I tee up opportunities.`
                  : "As you add channels, I can keep that context in mind alongside the Meshed graph and verified interactions.",
            },
          ]
        : [
          {
            title: "Find people who can unblock you",
            body: primaryPainTag
              ? `I can look for founders, operators, advisors, and LPs who already have signal around ${primaryPainTag.toLowerCase()} and are worth meeting soon.`
              : "I can look for founders, operators, advisors, and LPs who match the challenges you're working through right now.",
          },
          {
            title: "Spot timely opportunities",
            body: `I can surface intros, conference meetings, collaboration threads, and warm paths across ${companyLabel} that look actionable now.`,
          },
          {
            title: "Keep your follow-through tight",
            body: "I can suggest who to follow up with, what to ask for, and where a verified human handoff is most likely to create value.",
          },
          {
            title: "Work from your setup context",
            body:
              connectedChannels.length > 0
                ? `You've already given me ${connectedChannelSummary} in your setup context, so I can keep those surfaces in mind as I suggest opportunities.`
                : "As you add channels, I can keep that context in mind alongside the Meshed graph and verified interactions.",
          },
        ];

  const samplePrompts = (() => {
    if (input.role === "investor") {
      return [
        `Which founders, LPs, and advisors in ${vcCompanyName ?? "my network"} should I coordinate with before the week ends?`,
        `What are the strongest verified introductions I should make across ${vcCompanyName ?? "the portfolio"} right now?`,
        "Where is there a live pain-point match that deserves a human-backed intro this week?",
        "Which recent verified interactions are most at risk of going cold if I do nothing?",
        "What opportunities should my Meshed agent surface before my next partner meeting?",
      ];
    }

    if (input.role === "employee" || input.role === "mentor" || input.role === "consultant") {
      return [
        primaryPainTag
          ? `Which teams in ${vcCompanyName ?? "the network"} are feeling ${primaryPainTag.toLowerCase()} and look like a strong fit for my help?`
          : `Where can I be most useful across ${vcCompanyName ?? "the network"} this week?`,
        "Which founders or operators should I proactively offer help to right now?",
        "What warm introductions would let me support the right teams without creating noise?",
        "Where is there a verified interaction I should follow up on before it fades?",
        "What opportunities should my Meshed agent surface for me to support this month?",
      ];
    }

    return [
      primaryPainTag
        ? `Who in ${vcCompanyName ?? "the network"} has already solved ${primaryPainTag.toLowerCase()} and is worth meeting first?`
        : `Who in ${vcCompanyName ?? "the network"} should I meet to accelerate my current priorities?`,
      `What are the strongest people and opportunity matches for ${memberCompanyName ?? "my company"} right now?`,
      "I'm heading to an event soon. Who should my Meshed agent recommend I meet first?",
      "What proactive alerts should I be paying attention to this week?",
      "Which verified interactions or introductions would create the most momentum for me right now?",
    ];
  })();

  return {
    vcCompanyName,
    memberCompanyName,
    currentPainTags,
    connectedChannels,
    capabilities,
    samplePrompts,
  } satisfies AgentIntroContext;
}

export function AgentExperience({
  currentUserName,
  currentUserTitle,
  currentUserProfileImageUrl,
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
  const [phase, setPhase] = useState<AgentPhase>(setupMode || currentStep !== "ready" ? "setup" : "live");
  const [setupStartingStep, setSetupStartingStep] = useState<RegistrationFlowStep>(setupMode ? "vc_company" : currentStep);
  const [companyNodes, setCompanyNodes] = useState<A16zCompanyGraphNode[]>(initialCompanyNodes);
  const [loadingLiveAgent, setLoadingLiveAgent] = useState(false);
  const [experienceError, setExperienceError] = useState<string | null>(null);
  const [introContext, setIntroContext] = useState<AgentIntroContext>(() =>
    buildAgentIntroContext({
      role: currentUserRole,
      vcCompanyName: vcCompany?.name,
      memberCompanyName: memberCompany?.name,
      currentPainTags: memberCompany?.currentPainTags ?? vcCompany?.currentPainTags ?? [],
      socialConnections,
    }),
  );
  const [introMessage, setIntroMessage] = useState<string | null>(() =>
    currentStep === "ready"
      ? buildLiveIntroMessage({
          currentUserName,
          role: currentUserRole,
          vcCompanyName: vcCompany?.name,
          memberCompanyName: memberCompany?.name,
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
          socialConnections,
        }),
      );
      setIntroMessage(
        buildLiveIntroMessage({
          currentUserName,
          role: currentUserRole,
          vcCompanyName: body.data.vcCompanyName,
          memberCompanyName: body.data.memberCompanyName,
        }),
      );
      setPhase("live");
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

  return (
    <main className="px-6 py-16">
      <section className="mx-auto max-w-7xl space-y-6 rounded-[2rem] border border-white/70 bg-white/85 px-8 py-10 shadow-[0_30px_120px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="max-w-3xl space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-700">Meshed Agent</p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            {phase === "setup"
              ? setupMode
                ? `Let's refresh ${currentUserName}'s setup.`
                : `Let's prepare ${currentUserName}'s Meshed agent.`
              : "How to use me"}
          </h1>
          <p className="text-base leading-7 text-slate-600">
            {phase === "setup"
              ? "Your Agent now owns setup chat. It captures VC context, social surfaces, and pain points before flowing directly into the live Meshed assistant."
              : "Ask for people to meet, intros to make, opportunities to pursue, signals to watch, or follow-up priorities to tighten. I'll stay grounded in your Meshed network and recommend the strongest human-backed path. You can also ask me to suggest ways to get started or update your profile right here in the chat."}
          </p>
          {loadingLiveAgent ? (
            <p className="text-sm font-medium text-sky-700">Switching your setup chat into the live Meshed agent...</p>
          ) : null}
          {experienceError ? <p className="text-sm text-rose-700">{experienceError}</p> : null}
        </div>

        {phase === "setup" ? (
          <OnboardingChatbot
            key={`${setupMode ? "setup" : "default"}-${phase}`}
            currentStep={setupCurrentStep}
            currentUserName={currentUserName}
            currentUserTitle={currentUserTitle}
            currentUserProfileImageUrl={currentUserProfileImageUrl}
            currentUserRole={currentUserRole}
            vcCompany={vcCompany}
            memberCompany={memberCompany}
            vcOptions={vcOptions}
            socialConnections={socialConnections}
            latestNetworkJob={latestNetworkJob}
            onReady={openLiveAgent}
          />
        ) : (
          <ChatbotClient
            companyNodes={companyNodes}
            currentUserName={currentUserName}
            currentUserVerified={currentUserVerified}
            introMessage={introMessage}
            introCapabilities={introContext.capabilities}
            introSamplePrompts={introContext.samplePrompts}
          />
        )}
      </section>
    </main>
  );
}
