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
  const [phase, setPhase] = useState<"setup" | "live">(setupMode || currentStep !== "ready" ? "setup" : "live");
  const [setupStartingStep, setSetupStartingStep] = useState<RegistrationFlowStep>(setupMode ? "vc_company" : currentStep);
  const [companyNodes, setCompanyNodes] = useState<A16zCompanyGraphNode[]>(initialCompanyNodes);
  const [loadingLiveAgent, setLoadingLiveAgent] = useState(false);
  const [experienceError, setExperienceError] = useState<string | null>(null);
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
      setIntroMessage(
        buildLiveIntroMessage({
          currentUserName,
          vcCompanyName: body.data.vcCompanyName,
          memberCompanyName: body.data.memberCompanyName,
          currentPainTags: body.data.currentPainTags ?? [],
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
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-700">Meshed Agent</p>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              {phase === "setup"
                ? setupMode
                  ? `Let's refresh ${currentUserName}'s setup.`
                  : `Let's prepare ${currentUserName}'s Meshed agent.`
                : "Your AI Doppelganger is live."}
            </h1>
            <p className="text-base leading-7 text-slate-600">
              {phase === "setup"
                ? "Your Agent now owns setup chat. It captures VC context, social surfaces, and pain points before flowing directly into the live Meshed assistant."
                : "Now that setup is complete, your Agent can help with opportunity discovery, proactive alerts, coordination, and verified human handoffs across Meshed."}
            </p>
            {loadingLiveAgent ? (
              <p className="text-sm font-medium text-sky-700">Switching your setup chat into the live Meshed agent...</p>
            ) : null}
            {experienceError ? <p className="text-sm text-rose-700">{experienceError}</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {phase === "live" ? (
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
            {phase === "live" ? (
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
        ) : (
          <ChatbotClient
            companyNodes={companyNodes}
            currentUserName={currentUserName}
            currentUserVerified={currentUserVerified}
            introMessage={introMessage}
          />
        )}
      </section>
    </main>
  );
}
