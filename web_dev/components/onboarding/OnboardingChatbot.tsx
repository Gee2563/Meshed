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

type OnboardingChatbotProps = {
  currentStep: RegistrationFlowStep;
  currentUserName: string;
  currentUserRole: UserRole;
  vcCompany: CompanySummary | null;
  memberCompany: CompanySummary | null;
  vcOptions: VcOption[];
  socialConnections: UserSocialConnectionSummary[];
  latestNetworkJob: NetworkPreparationJobSummary | null;
  onReady?: () => void | Promise<void>;
};

type ApiResponse<T> = {
  ok?: boolean;
  error?: string;
  data?: T;
};

type QuestionId =
  | "vc_selection"
  | "vc_website"
  | "vc_contact_name"
  | "vc_contact_email"
  | "member_company_name"
  | "member_company_address"
  | "linkedin_url"
  | "email_address"
  | "slack_workspace"
  | "microsoft_teams_workspace"
  | "twitter_handle"
  | "calendar_email"
  | "instagram_handle"
  | "current_pain_points"
  | "resolved_pain_points";

type ChatMessage = {
  id: string;
  from: "assistant" | "user";
  text: string;
  questionId?: QuestionId;
};

type DraftState = {
  selectedCompanyId: string;
  companyName: string;
  website: string;
  pointOfContactName: string;
  pointOfContactEmail: string;
  memberCompanyName: string;
  memberCompanyAddress: string;
  linkedinUrl: string;
  emailAddress: string;
  slackWorkspace: string;
  microsoftTeamsWorkspace: string;
  twitterHandle: string;
  calendarEmail: string;
  instagramHandle: string;
  currentPainPoints: string;
  resolvedPainPoints: string;
};

type QuestionPrompt = {
  prompt: string;
  helper?: string;
  placeholder?: string;
  type?: "text" | "url" | "email";
  canSkip?: boolean;
  quickReplies?: string[];
};

function makeId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeOptionalInput(value: string) {
  const trimmed = value.trim().replace(/^use\s+/i, "");
  if (!trimmed) {
    return "";
  }

  if (/^(skip|none|not now|later)$/i.test(trimmed)) {
    return "";
  }

  return trimmed;
}

function normalizeWebsiteInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  return /^https?:\/\//i.test(trimmed) ? trimmed.replace(/\/+$/, "") : `https://${trimmed.replace(/^\/+/, "").replace(/\/+$/, "")}`;
}

function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function looksLikeUrl(value: string) {
  try {
    const normalized = normalizeWebsiteInput(value);
    if (!normalized) {
      return false;
    }

    const url = new URL(normalized);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function getAccountLabel(
  connections: UserSocialConnectionSummary[],
  provider: UserSocialConnectionSummary["provider"],
) {
  return connections.find((connection) => connection.provider === provider)?.accountLabel ?? "";
}

function getStartingQuestion(step: RegistrationFlowStep) {
  switch (step) {
    case "socials":
      return "linkedin_url" as const;
    case "network_preparing":
    case "ready":
      return null;
    default:
      return "vc_selection" as const;
  }
}

function getVcQuestionOrder(isVcUser: boolean): QuestionId[] {
  return [
    "vc_selection",
    "vc_website",
    "vc_contact_name",
    "vc_contact_email",
    ...(isVcUser ? [] : (["member_company_name", "member_company_address"] as QuestionId[])),
  ];
}

function getSocialQuestionOrder(): QuestionId[] {
  return [
    "linkedin_url",
    "email_address",
    "slack_workspace",
    "microsoft_teams_workspace",
    "twitter_handle",
    "calendar_email",
    "instagram_handle",
    "current_pain_points",
    "resolved_pain_points",
  ];
}

function isListedVcSelection(draft: DraftState, vcOptions: VcOption[]) {
  return Boolean(draft.selectedCompanyId && draft.selectedCompanyId !== "manual" && vcOptions.some((option) => option.id === draft.selectedCompanyId));
}

function getNextQuestion(currentQuestionId: QuestionId, isVcUser: boolean, draft: DraftState, vcOptions: VcOption[]) {
  if (currentQuestionId === "vc_selection" && isListedVcSelection(draft, vcOptions)) {
    return isVcUser ? "linkedin_url" : "member_company_name";
  }

  const allQuestions = [...getVcQuestionOrder(isVcUser), ...getSocialQuestionOrder()];
  const currentIndex = allQuestions.indexOf(currentQuestionId);
  return currentIndex >= 0 ? allQuestions[currentIndex + 1] ?? null : null;
}

function getFinalVcQuestionId(isVcUser: boolean, draft: DraftState, vcOptions: VcOption[]) {
  if (isListedVcSelection(draft, vcOptions)) {
    return isVcUser ? "vc_selection" : "member_company_address";
  }

  return isVcUser ? "vc_contact_email" : "member_company_address";
}

function describeSelection(draft: DraftState, vcOptions: VcOption[]) {
  const selectedOption = vcOptions.find((option) => option.id === draft.selectedCompanyId);
  if (selectedOption) {
    return selectedOption.name;
  }

  return draft.companyName || "Manual VC";
}

function getPromptForQuestion(questionId: QuestionId, draft: DraftState, vcOptions: VcOption[]): QuestionPrompt {
  switch (questionId) {
    case "vc_selection":
      return {
        prompt: "First, which VC should I anchor your Meshed network to?",
        helper: "Pick one below or type the VC name if it is not listed yet.",
        placeholder: "Type your VC name",
        quickReplies: vcOptions.slice(0, 6).map((option) => option.name),
      };
    case "vc_website":
      return {
        prompt: `Great. What website should I use for ${describeSelection(draft, vcOptions)}?`,
        helper: "This is the site Meshed will inspect for portfolio, investment, and people pages.",
        placeholder: "https://yourvc.com",
        type: "url",
        quickReplies: draft.website ? [draft.website] : undefined,
      };
    case "vc_contact_name":
      return {
        prompt: "Who is the best point of contact at that VC for Meshed to keep in context?",
        helper: "A partner, platform lead, or operations contact works well here.",
        placeholder: "Dana Partner",
      };
    case "vc_contact_email":
      return {
        prompt: "And what is the best point-of-contact email?",
        placeholder: "partner@yourvc.com",
        type: "email",
      };
    case "member_company_name":
      return {
        prompt: "What company do you represent?",
        helper: "Meshed uses this to tie your verified profile to the right operating business.",
        placeholder: "Acme AI",
      };
    case "member_company_address":
      return {
        prompt: "What is your company address?",
        placeholder: "123 Market St, San Francisco, CA",
      };
    case "linkedin_url":
      return {
        prompt: "Now let's wire up your channels. What LinkedIn URL should your Meshed agent use?",
        helper: "You can say skip if you want to come back later.",
        placeholder: "https://www.linkedin.com/in/your-handle",
        type: "url",
        canSkip: true,
      };
    case "email_address":
      return {
        prompt: "Which email inbox should Meshed treat as your coordination home base?",
        placeholder: "you@company.com",
        type: "email",
        canSkip: true,
      };
    case "slack_workspace":
      return {
        prompt: "What Slack workspace should I register for your agent?",
        placeholder: "meshed.slack.com",
        canSkip: true,
      };
    case "microsoft_teams_workspace":
      return {
        prompt: "Do you want to add Microsoft Teams as well?",
        placeholder: "meshed.onmicrosoft.com",
        canSkip: true,
      };
    case "twitter_handle":
      return {
        prompt: "What Twitter / X handle should Meshed watch for signals and outreach context?",
        placeholder: "@yourhandle",
        canSkip: true,
      };
    case "calendar_email":
      return {
        prompt: "What calendar email should I use for meeting recommendations and scheduling context?",
        placeholder: "calendar@company.com",
        type: "email",
        canSkip: true,
      };
    case "instagram_handle":
      return {
        prompt: "Any Instagram account to register for brand and event context?",
        placeholder: "@yourhandle",
        canSkip: true,
      };
    case "current_pain_points":
      return {
        prompt: "What 1-3 pain points should Meshed prioritize first for you?",
        helper: "Examples: fundraising, enterprise sales, hiring, partnerships, compliance. Comma-separated is perfect.",
        placeholder: "fundraising, enterprise sales, hiring",
        canSkip: true,
      };
    case "resolved_pain_points":
      return {
        prompt: "And what has your team already gotten good at solving?",
        helper: "These become strength signals for match suggestions and agent outreach.",
        placeholder: "growth experiments, GTM positioning",
        canSkip: true,
      };
  }
}

function getSummaryRows(draft: DraftState, isVcUser: boolean) {
  return [
    { label: "VC", value: draft.companyName || "Not answered yet" },
    { label: "VC site", value: draft.website || "Not answered yet" },
    { label: "POC", value: draft.pointOfContactName || "Not answered yet" },
    { label: "POC email", value: draft.pointOfContactEmail || "Not answered yet" },
    ...(isVcUser
      ? []
      : [
          { label: "Your company", value: draft.memberCompanyName || "Not answered yet" },
          { label: "Company address", value: draft.memberCompanyAddress || "Not answered yet" },
        ]),
    { label: "LinkedIn", value: draft.linkedinUrl || "Skipped for now" },
    { label: "Email", value: draft.emailAddress || "Skipped for now" },
    { label: "Slack", value: draft.slackWorkspace || "Skipped for now" },
    { label: "Teams", value: draft.microsoftTeamsWorkspace || "Skipped for now" },
    { label: "Twitter / X", value: draft.twitterHandle || "Skipped for now" },
    { label: "Calendar", value: draft.calendarEmail || "Skipped for now" },
    { label: "Instagram", value: draft.instagramHandle || "Skipped for now" },
    { label: "Current pain points", value: draft.currentPainPoints || "Not captured yet" },
    { label: "Solved strengths", value: draft.resolvedPainPoints || "Not captured yet" },
  ];
}

export function OnboardingChatbot({
  currentStep,
  currentUserName,
  currentUserRole,
  vcCompany,
  memberCompany,
  vcOptions,
  socialConnections,
  latestNetworkJob,
  onReady,
}: OnboardingChatbotProps) {
  const router = useRouter();
  const isVcUser = currentUserRole === "investor";
  const painPointCompany = memberCompany ?? vcCompany;
  const [step, setStep] = useState<RegistrationFlowStep>(currentStep);
  const [job, setJob] = useState<NetworkPreparationJobSummary | null>(latestNetworkJob);
  const [draft, setDraft] = useState<DraftState>({
    selectedCompanyId: vcCompany?.id ?? "",
    companyName: vcCompany?.name ?? "",
    website: vcCompany?.website ?? "",
    pointOfContactName: vcCompany?.pointOfContactName ?? "",
    pointOfContactEmail: vcCompany?.pointOfContactEmail ?? "",
    memberCompanyName: memberCompany?.name ?? "",
    memberCompanyAddress: memberCompany?.address ?? "",
    linkedinUrl: getAccountLabel(socialConnections, "linkedin"),
    emailAddress: getAccountLabel(socialConnections, "email"),
    slackWorkspace: getAccountLabel(socialConnections, "slack"),
    microsoftTeamsWorkspace: getAccountLabel(socialConnections, "microsoft_teams"),
    twitterHandle: getAccountLabel(socialConnections, "twitter"),
    calendarEmail: getAccountLabel(socialConnections, "calendar"),
    instagramHandle: getAccountLabel(socialConnections, "instagram"),
    currentPainPoints: painPointCompany?.currentPainTags.join(", ") ?? "",
    resolvedPainPoints: painPointCompany?.resolvedPainTags.join(", ") ?? "",
  });
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const introText =
      currentStep === "socials"
        ? `Nice, ${currentUserName} - your VC context is set. I'll finish your Agent setup by registering the channels and pain points that will make Meshed useful on day one.`
        : currentStep === "network_preparing"
          ? `Nice, ${currentUserName} - your answers are in. Meshed is now preparing your network in the background.`
          : currentStep === "ready"
            ? `Nice, ${currentUserName} - your Agent setup is complete and your network is ready.`
            : `Nice, ${currentUserName} - I'll set up your Meshed agent conversationally so this feels more like a real guide than a static form.`;

    return [{ id: makeId("msg"), from: "assistant" as const, text: introText }];
  });
  const [currentQuestionId, setCurrentQuestionId] = useState<QuestionId | null>(() => getStartingQuestion(currentStep));
  const [inputValue, setInputValue] = useState("");
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const summaryRows = useMemo(() => getSummaryRows(draft, isVcUser), [draft, isVcUser]);
  const portfolioCount = Number((job?.result?.summary as { portfolio_company_count?: number } | undefined)?.portfolio_company_count ?? 0);
  const lpCount = Number((job?.result?.summary as { lp_contact_count?: number } | undefined)?.lp_contact_count ?? 0);
  const scannedCompanyCount = Number((job?.result?.summary as { company_scan_count?: number } | undefined)?.company_scan_count ?? 0);

  const currentPrompt = currentQuestionId ? getPromptForQuestion(currentQuestionId, draft, vcOptions) : null;

  useEffect(() => {
    if (!currentQuestionId) {
      return;
    }

    const prompt = getPromptForQuestion(currentQuestionId, draft, vcOptions);
    setMessages((previous) => {
      const recentPrompt = previous.slice(-2).find((message) => message.questionId === currentQuestionId);
      if (recentPrompt) {
        return previous;
      }

      const nextMessages: ChatMessage[] = [
        ...previous,
        { id: makeId("msg"), from: "assistant", text: prompt.prompt, questionId: currentQuestionId },
      ];
      if (prompt.helper) {
        nextMessages.push({ id: makeId("msg"), from: "assistant", text: prompt.helper });
      }
      return nextMessages;
    });

    if (prompt.quickReplies?.length) {
      setInputValue("");
    } else if (currentQuestionId === "vc_website" && draft.website) {
      setInputValue(draft.website);
    } else {
      const fieldValueMap: Partial<Record<QuestionId, string>> = {
        vc_contact_name: draft.pointOfContactName,
        vc_contact_email: draft.pointOfContactEmail,
        member_company_name: draft.memberCompanyName,
        member_company_address: draft.memberCompanyAddress,
        linkedin_url: draft.linkedinUrl,
        email_address: draft.emailAddress,
        slack_workspace: draft.slackWorkspace,
        microsoft_teams_workspace: draft.microsoftTeamsWorkspace,
        twitter_handle: draft.twitterHandle,
        calendar_email: draft.calendarEmail,
        instagram_handle: draft.instagramHandle,
        current_pain_points: draft.currentPainPoints,
        resolved_pain_points: draft.resolvedPainPoints,
      };

      setInputValue(fieldValueMap[currentQuestionId] ?? "");
    }
  }, [currentQuestionId, draft, vcOptions]);

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
        setStep("ready");
        setMessages((previous) => [
          ...previous,
          {
            id: makeId("msg"),
            from: "assistant",
            text: "Your network is ready. I'm opening your Meshed agent now.",
          },
        ]);
        window.clearInterval(interval);
        if (onReady) {
          void Promise.resolve(onReady());
        }
      }
    }, 8000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [step]);

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
      setMessages((previous) => [
        ...previous,
        {
          id: makeId("msg"),
          from: "assistant",
          text: "I restarted the network-preparation agent. I'll keep polling and let you know when the graph is ready.",
        },
      ]);
      setStep("network_preparing");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to restart network preparation.");
    } finally {
      setPending(false);
    }
  }

  function applyAnswer(questionId: QuestionId, rawAnswer: string, currentDraft: DraftState) {
    const answer = questionId === "vc_website" ? normalizeWebsiteInput(rawAnswer) : normalizeOptionalInput(rawAnswer);

    switch (questionId) {
      case "vc_selection": {
        if (!answer) {
          return { error: "Tell me which VC to anchor Meshed to." };
        }

        const matchedOption =
          vcOptions.find((option) => option.id === answer) ??
          vcOptions.find((option) => option.name.toLowerCase() === answer.toLowerCase()) ??
          vcOptions.find((option) => option.website.toLowerCase() === normalizeWebsiteInput(answer).toLowerCase());

        if (matchedOption) {
          return {
            nextDraft: {
              ...currentDraft,
              selectedCompanyId: matchedOption.id,
              companyName: matchedOption.name,
              website: matchedOption.website || currentDraft.website,
              pointOfContactName: currentDraft.pointOfContactName || matchedOption.pointOfContactName || "",
              pointOfContactEmail: currentDraft.pointOfContactEmail || matchedOption.pointOfContactEmail || "",
            },
            userEcho: matchedOption.name,
          };
        }

        return {
          nextDraft: {
            ...currentDraft,
            selectedCompanyId: "manual",
            companyName: answer,
          },
          userEcho: answer,
        };
      }
      case "vc_website":
        if (!answer || !looksLikeUrl(answer)) {
          return { error: "Give me a valid VC website so the background agent has a real starting point." };
        }
        return { nextDraft: { ...currentDraft, website: answer }, userEcho: answer };
      case "vc_contact_name":
        if (!answer) {
          return { error: "I still need a point-of-contact name for the VC." };
        }
        return { nextDraft: { ...currentDraft, pointOfContactName: answer }, userEcho: answer };
      case "vc_contact_email":
        if (!answer || !looksLikeEmail(answer)) {
          return { error: "Give me a valid point-of-contact email so Meshed can keep the right human in the loop." };
        }
        return { nextDraft: { ...currentDraft, pointOfContactEmail: answer.toLowerCase() }, userEcho: answer.toLowerCase() };
      case "member_company_name":
        if (!answer) {
          return { error: "Tell me the company you represent so Meshed can route value back to the right team." };
        }
        return { nextDraft: { ...currentDraft, memberCompanyName: answer }, userEcho: answer };
      case "member_company_address":
        if (!answer) {
          return { error: "I still need your company address to finish the company profile." };
        }
        return { nextDraft: { ...currentDraft, memberCompanyAddress: answer }, userEcho: answer };
      case "linkedin_url":
        if (answer && !looksLikeUrl(answer)) {
          return { error: "That LinkedIn URL does not look valid yet. Paste the full profile URL or say skip." };
        }
        return { nextDraft: { ...currentDraft, linkedinUrl: answer }, userEcho: answer || "Skip LinkedIn for now" };
      case "email_address":
        if (answer && !looksLikeEmail(answer)) {
          return { error: "That email address does not look valid yet. Give me a valid inbox or say skip." };
        }
        return { nextDraft: { ...currentDraft, emailAddress: answer.toLowerCase() }, userEcho: answer || "Skip email for now" };
      case "slack_workspace":
        return { nextDraft: { ...currentDraft, slackWorkspace: answer }, userEcho: answer || "Skip Slack for now" };
      case "microsoft_teams_workspace":
        return { nextDraft: { ...currentDraft, microsoftTeamsWorkspace: answer }, userEcho: answer || "Skip Teams for now" };
      case "twitter_handle":
        return { nextDraft: { ...currentDraft, twitterHandle: answer }, userEcho: answer || "Skip Twitter / X for now" };
      case "calendar_email":
        if (answer && !looksLikeEmail(answer)) {
          return { error: "That calendar email does not look valid yet. Give me a valid inbox or say skip." };
        }
        return { nextDraft: { ...currentDraft, calendarEmail: answer.toLowerCase() }, userEcho: answer || "Skip calendar for now" };
      case "instagram_handle":
        return { nextDraft: { ...currentDraft, instagramHandle: answer }, userEcho: answer || "Skip Instagram for now" };
      case "current_pain_points":
        return { nextDraft: { ...currentDraft, currentPainPoints: answer }, userEcho: answer || "No current pain points to add yet" };
      case "resolved_pain_points":
        return { nextDraft: { ...currentDraft, resolvedPainPoints: answer }, userEcho: answer || "No solved strengths to add yet" };
    }
  }

  async function persistVcSelection(nextDraft: DraftState) {
    const response = await fetch("/api/onboarding/vc", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        selectedCompanyId: nextDraft.selectedCompanyId && nextDraft.selectedCompanyId !== "manual" ? nextDraft.selectedCompanyId : null,
        companyName: nextDraft.selectedCompanyId === "manual" ? nextDraft.companyName : null,
        website: nextDraft.website,
        pointOfContactName: nextDraft.pointOfContactName,
        pointOfContactEmail: nextDraft.pointOfContactEmail,
        memberCompanyName: isVcUser ? null : nextDraft.memberCompanyName,
        memberCompanyAddress: isVcUser ? null : nextDraft.memberCompanyAddress,
      }),
    });

    const body = (await response.json().catch(() => null)) as ApiResponse<{
      networkJob?: NetworkPreparationJobSummary | null;
    }> | null;

    if (!response.ok || !body?.ok) {
      throw new Error(body?.error ?? "Unable to save your VC context.");
    }

    setJob(body.data?.networkJob ?? null);
  }

  async function persistSocials(nextDraft: DraftState) {
    const response = await fetch("/api/onboarding/socials", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        linkedinUrl: nextDraft.linkedinUrl,
        emailAddress: nextDraft.emailAddress,
        slackWorkspace: nextDraft.slackWorkspace,
        microsoftTeamsWorkspace: nextDraft.microsoftTeamsWorkspace,
        twitterHandle: nextDraft.twitterHandle,
        calendarEmail: nextDraft.calendarEmail,
        instagramHandle: nextDraft.instagramHandle,
        currentPainPoints: nextDraft.currentPainPoints,
        resolvedPainPoints: nextDraft.resolvedPainPoints,
      }),
    });

    const body = (await response.json().catch(() => null)) as ApiResponse<{
      nextRoute?: string;
      networkReady?: boolean;
    }> | null;

    if (!response.ok || !body?.ok) {
      throw new Error(body?.error ?? "Unable to save your social graph.");
    }

    if (body.data?.networkReady || body.data?.nextRoute === "/dashboard") {
      setMessages((previous) => [
        ...previous,
        {
          id: makeId("msg"),
          from: "assistant",
          text: "Beautiful. Your network is ready, so I'm opening your Meshed agent.",
        },
      ]);
      if (onReady) {
        await Promise.resolve(onReady());
      } else {
        router.replace("/agent");
        router.refresh();
      }
      return;
    }

    setStep("network_preparing");
    setMessages((previous) => [
      ...previous,
      {
        id: makeId("msg"),
        from: "assistant",
        text: "Perfect. I have everything I need, and your background scraping agent is now preparing the network graph.",
      },
    ]);
    router.refresh();
  }

  async function handleAnswer(submittedValue?: string) {
    if (!currentQuestionId || pending) {
      return;
    }

    const rawAnswer = submittedValue ?? inputValue;
    const result = applyAnswer(currentQuestionId, rawAnswer, draft);
    if ("error" in result && result.error) {
      setErrorMessage(result.error);
      return;
    }

    const nextDraft = result.nextDraft;
    if (!nextDraft) {
      return;
    }

    setPending(true);
    setErrorMessage(null);
    setMessages((previous) => [...previous, { id: makeId("msg"), from: "user", text: result.userEcho }]);
    setDraft(nextDraft);

    try {
      const nextQuestionId = getNextQuestion(currentQuestionId, isVcUser, nextDraft, vcOptions);
      const lastVcQuestion = getFinalVcQuestionId(isVcUser, nextDraft, vcOptions);
      const lastSocialQuestion = getSocialQuestionOrder().slice(-1)[0];

      if (currentQuestionId === lastVcQuestion) {
        await persistVcSelection(nextDraft);
        setMessages((previous) => [
          ...previous,
          {
            id: makeId("msg"),
            from: "assistant",
            text: "Great - your VC context is locked in. Next I'll wire up the channels and pain points that make your Meshed agent proactive.",
          },
        ]);
        setStep("socials");
      }

      if (currentQuestionId === lastSocialQuestion) {
        await persistSocials(nextDraft);
        setCurrentQuestionId(null);
        setInputValue("");
        return;
      }

      setCurrentQuestionId(nextQuestionId);
      setInputValue("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to continue Agent setup.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_320px]">
      <div className="rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">Agent setup chat</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Your Meshed agent is gathering context.</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            Instead of a static form, Meshed will gather your VC context, social surfaces, and pain points conversationally while keeping the background prep flow intact.
          </p>
        </div>

        <div className="space-y-4 px-6 py-6">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.from === "assistant" ? "justify-start" : "justify-end"}`}>
              <div
                className={`max-w-[92%] rounded-3xl px-4 py-3 text-sm leading-6 shadow-sm ${
                  message.from === "assistant"
                    ? "border border-slate-200 bg-slate-50 text-slate-800"
                    : "bg-sky-600 text-white"
                }`}
              >
                {message.text}
              </div>
            </div>
          ))}

          {errorMessage ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</div>
          ) : null}

          {step === "network_preparing" ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Background agent</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Status</p>
                  <p className="mt-2 text-sm font-medium text-slate-900">{job?.status.replace(/_/g, " ") ?? "queued"}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Portfolio companies</p>
                  <p className="mt-2 text-sm font-medium text-slate-900">{portfolioCount}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">LP / advisor contacts</p>
                  <p className="mt-2 text-sm font-medium text-slate-900">{lpCount}</p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-4">
                <p className="text-sm font-medium text-slate-900">
                  {job?.statusMessage ?? "Meshed is preparing your network graph and portfolio context."}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {job?.status === "ready"
                    ? `The agent completed scans across ${scannedCompanyCount} company websites.`
                    : job?.status === "failed"
                      ? job.errorMessage ?? "The first preparation pass did not complete."
                      : `So far we have scanned ${scannedCompanyCount} company websites and will keep going in the background.`}
                </p>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
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
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Ready</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                Your network is ready. Open the dashboard to start using the World-backed trust layer and your Meshed agent.
              </p>
          <div className="mt-4">
                <Button href="/agent">Open Agent</Button>
              </div>
            </div>
          ) : null}
        </div>

        {currentQuestionId ? (
          <div className="border-t border-slate-200 px-6 py-5">
            {currentPrompt?.quickReplies?.length ? (
              <div className="mb-4 flex flex-wrap gap-2">
                {currentPrompt.quickReplies.map((quickReply) => (
                  <button
                    key={quickReply}
                    type="button"
                    onClick={() => handleAnswer(quickReply)}
                    disabled={pending}
                    className="rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {quickReply}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type={currentPrompt?.type ?? "text"}
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleAnswer();
                  }
                }}
                placeholder={currentPrompt?.placeholder ?? "Type your answer"}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
              <Button type="button" onClick={() => void handleAnswer()} disabled={pending}>
                {pending ? "Saving..." : "Send"}
              </Button>
            </div>

            {currentPrompt?.canSkip ? (
              <div className="mt-3">
                <Button type="button" variant="ghost" onClick={() => void handleAnswer("skip")} disabled={pending}>
                  Skip for now
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <aside className="space-y-4">
        <div className="rounded-[2rem] border border-slate-200 bg-white px-5 py-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Live summary</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            As you answer, Meshed builds the profile your verified agent will use for matching, outreach, and alerts.
          </p>
          <div className="mt-4 space-y-3">
            {summaryRows.map((row) => (
              <div key={row.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{row.label}</p>
                <p className="mt-1 text-sm text-slate-800">{row.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white px-5 py-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">What happens next</p>
          <ol className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
            <li>1. Meshed records your VC context and team anchors.</li>
            <li>2. Your verified AI Doppelganger gets the channels it can use.</li>
            <li>3. Pain points become the first filters for matches, intros, and opportunities.</li>
            <li>4. The scraping agent prepares the network graph in the background.</li>
          </ol>
        </div>
      </aside>
    </div>
  );
}
