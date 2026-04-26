"use client";

import { useMemo, useState } from "react";

import {
  CompanyDetailModal,
  dispatchGraphConnectRequest,
  dispatchPartnerConnectRequest,
  LatestNewsModal,
  PartnerDetailModal,
  PersonDetailModal,
} from "@/components/dashboard/GraphEntityModals";
import type {
  A16zCompanyGraphNode,
  A16zCompanyGraphPartner,
  A16zCompanyGraphPerson,
} from "@/lib/server/meshed-network/a16z-crypto-dashboard";
import type { FounderAgentAction, FounderAgentActionTarget } from "@/lib/types";

type ChatHighlightObject = {
  text: string;
  url?: string | null;
  modalType?: "company" | "person" | "partner" | "latest_news";
  companyId?: string | null;
  companyName?: string | null;
  personId?: string | null;
  personName?: string | null;
  partnerId?: string | null;
  partnerName?: string | null;
};

type ChatHighlight = string | ChatHighlightObject;

type ChatMessage = {
  from: "user" | "assistant";
  text: string;
  highlights?: ChatHighlight[];
  introCapabilities?: Array<{ title: string; body: string }>;
  introSamplePrompts?: string[];
  intent?: string;
  layer?: "individual" | "ecosystem" | "resilience";
  specialist?: string;
  suggestedActions?: string[];
  agentActions?: FounderAgentAction[];
  mode?: "openai_agent" | "deterministic_fallback";
  isPending?: boolean;
};

type ChatbotReply = {
  answer: string;
  highlights: ChatHighlight[];
  intent: string;
  layer?: "individual" | "ecosystem" | "resilience";
  specialist?: string;
  suggestedActions?: string[];
  agentActions?: FounderAgentAction[];
  mode?: "openai_agent" | "deterministic_fallback";
  previousResponseId?: string | null;
};

type FounderAgentActionEffect =
  | {
      type: "queue_graph_contact";
      target: FounderAgentActionTarget;
    }
  | {
      type: "open_network_entity";
      target: FounderAgentActionTarget;
    };

type ExecuteFounderAgentActionResponse = {
  ok?: boolean;
  error?: string;
  data?: {
    message: string;
    effects: FounderAgentActionEffect[];
  };
};

type ChatbotClientProps = {
  companyNodes: A16zCompanyGraphNode[];
  currentUserName?: string | null;
  currentUserVerified?: boolean;
  introMessage?: string | null;
  introCapabilities?: Array<{ title: string; body: string }>;
  introSamplePrompts?: string[];
};

type ResolvedHighlightModal =
  | {
      kind: "company";
      company: A16zCompanyGraphNode;
    }
  | {
      kind: "latest_news";
      companyName: string;
      items: A16zCompanyGraphNode["latestNews"];
    }
  | {
      kind: "person";
      person: A16zCompanyGraphPerson;
    }
  | {
      kind: "partner";
      companyName: string;
      partner: A16zCompanyGraphPartner;
    };

function normalizeEntityKey(value: string | null | undefined) {
  return String(value ?? "")
    .toLowerCase()
    .trim();
}

function getAgentLabel(currentUserName?: string | null) {
  const firstName = (currentUserName ?? "").trim().split(/\s+/)[0];
  return firstName ? `${firstName}'s Agent` : "Your Agent";
}

function isHighlightObject(highlight: ChatHighlight): highlight is ChatHighlightObject {
  return typeof highlight === "object" && highlight !== null && "text" in highlight;
}

function AgentThinkingVisualization() {
  const nodes = [
    { left: "8%", top: "54%", size: "0.7rem", color: "#1293C9", delay: "0s" },
    { left: "28%", top: "24%", size: "0.8rem", color: "#2E5CA8", delay: "0.2s" },
    { left: "31%", top: "74%", size: "0.78rem", color: "#54389F", delay: "0.35s" },
    { left: "52%", top: "50%", size: "0.88rem", color: "#8E3AA4", delay: "0.1s" },
    { left: "72%", top: "25%", size: "0.82rem", color: "#E3472C", delay: "0.28s" },
    { left: "88%", top: "60%", size: "0.78rem", color: "#F59E0B", delay: "0.4s" },
  ] as const;

  const links = [
    { left: "12%", top: "52%", width: "24%", rotate: "-28deg", delay: "0s" },
    { left: "13%", top: "57%", width: "24%", rotate: "26deg", delay: "0.2s" },
    { left: "34%", top: "34%", width: "22%", rotate: "22deg", delay: "0.1s" },
    { left: "34%", top: "64%", width: "22%", rotate: "-22deg", delay: "0.35s" },
    { left: "56%", top: "40%", width: "22%", rotate: "-24deg", delay: "0.18s" },
    { left: "56%", top: "55%", width: "28%", rotate: "16deg", delay: "0.42s" },
  ] as const;

  return (
    <>
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white/85 px-4 py-4">
        <div className="flex items-center gap-4">
          <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-2xl border border-slate-100 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.98),rgba(248,250,252,0.92))]">
            <span className="absolute inset-x-3 top-4 h-8 rounded-full bg-[linear-gradient(90deg,rgba(18,147,201,0.14),rgba(142,58,164,0.14),rgba(245,158,11,0.14))] blur-xl animate-pulse" />
            {links.map((link, index) => (
              <span
                key={`link-${index}`}
                className="absolute block h-[2px] origin-left rounded-full bg-[linear-gradient(90deg,rgba(18,147,201,0.38),rgba(142,58,164,0.34),rgba(245,158,11,0.34))]"
                style={{
                  left: link.left,
                  top: link.top,
                  width: link.width,
                  transform: `rotate(${link.rotate})`,
                }}
              >
                <span
                  className="meshed-flow-signal absolute left-0 top-1/2 block h-[6px] w-[28%] -translate-y-1/2 rounded-full bg-[linear-gradient(90deg,#1293C9,#8E3AA4,#F59E0B)] blur-[0.2px]"
                  style={{ animationDelay: link.delay }}
                />
              </span>
            ))}
            {nodes.map((node, index) => (
              <span
                key={`node-${index}`}
                className="meshed-flow-node absolute block rounded-full shadow-[0_0_0_4px_rgba(255,255,255,0.72)]"
                style={{
                  left: node.left,
                  top: node.top,
                  width: node.size,
                  height: node.size,
                  backgroundColor: node.color,
                  transform: "translate(-50%, -50%)",
                  animationDelay: node.delay,
                }}
              />
            ))}
          </div>
          <div className="min-w-0 flex-1">
            <div className="relative h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full w-2/3 rounded-full bg-[linear-gradient(90deg,#1293C9,#8E3AA4,#F59E0B)] opacity-85" />
              <span className="meshed-progress-signal absolute inset-y-0 left-0 w-1/3 rounded-full bg-[linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,0.85),rgba(255,255,255,0))]" />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="meshed-inline-dot h-2.5 w-2.5 rounded-full bg-[#1293C9] [animation-delay:-0.25s]" />
              <span className="meshed-inline-dot h-2.5 w-2.5 rounded-full bg-[#8E3AA4] [animation-delay:-0.1s]" />
              <span className="meshed-inline-dot h-2.5 w-2.5 rounded-full bg-[#F59E0B]" />
              <span className="h-1.5 w-16 rounded-full bg-sky-100" />
              <span className="h-1.5 w-10 rounded-full bg-fuchsia-100" />
              <span className="h-1.5 w-14 rounded-full bg-amber-100" />
            </div>
          </div>
        </div>
        <span className="sr-only">Agent is thinking.</span>
      </div>
      <style jsx>{`
        .meshed-flow-signal {
          animation: meshed-signal-flow 1.65s ease-in-out infinite;
        }

        .meshed-flow-node {
          animation: meshed-node-breathe 1.9s ease-in-out infinite;
        }

        .meshed-progress-signal {
          animation: meshed-progress-sweep 1.8s ease-in-out infinite;
        }

        .meshed-inline-dot {
          animation: meshed-inline-breathe 1.7s ease-in-out infinite;
        }

        @keyframes meshed-signal-flow {
          0% {
            transform: translate(-120%, -50%);
            opacity: 0;
          }
          18% {
            opacity: 1;
          }
          65% {
            opacity: 0.95;
          }
          100% {
            transform: translate(320%, -50%);
            opacity: 0;
          }
        }

        @keyframes meshed-node-breathe {
          0%,
          100% {
            opacity: 0.8;
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.14);
          }
        }

        @keyframes meshed-progress-sweep {
          0% {
            transform: translateX(-120%);
            opacity: 0;
          }
          20% {
            opacity: 0.9;
          }
          100% {
            transform: translateX(320%);
            opacity: 0;
          }
        }

        @keyframes meshed-inline-breathe {
          0%,
          100% {
            opacity: 0.75;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.15);
          }
        }
      `}</style>
    </>
  );
}

export default function ChatbotClient({
  companyNodes,
  currentUserName,
  introMessage = null,
  introCapabilities = [],
  introSamplePrompts = [],
}: ChatbotClientProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    introMessage
      ? [
          {
            from: "assistant",
            text: introMessage,
            intent: "general",
            layer: "individual",
            specialist: "personal_agent",
          },
        ]
      : [],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [previousResponseId, setPreviousResponseId] = useState<string | null>(null);
  const [activeCompany, setActiveCompany] = useState<A16zCompanyGraphNode | null>(null);
  const [activePerson, setActivePerson] = useState<A16zCompanyGraphPerson | null>(null);
  const [activePartner, setActivePartner] = useState<{ companyName: string; partner: A16zCompanyGraphPartner } | null>(null);
  const [activeNews, setActiveNews] = useState<{ companyName: string; items: A16zCompanyGraphNode["latestNews"] } | null>(null);
  const [executingActionKeys, setExecutingActionKeys] = useState<Record<string, boolean>>({});
  const [acceptedActionMessages, setAcceptedActionMessages] = useState<Record<string, string>>({});
  const [introCardsShown, setIntroCardsShown] = useState(false);

  function looksLikePositiveIntroResponse(question: string) {
    const normalized = question.trim().toLowerCase();
    return (
      /^(yes|yeah|yep|sure|ok|okay|please|go ahead|tell me|show me|sounds good|absolutely|let'?s do it|lets do it)/.test(
        normalized,
      ) ||
      normalized.includes("what can you do") ||
      normalized.includes("show me what you can do") ||
      normalized.includes("tell me what you can do")
    );
  }

  async function askSamplePromptNow(prompt: string) {
    if (!introCardsShown && introCapabilities.length > 0) {
      setMessages((previous) => [
        ...previous,
        { from: "assistant", text: "Here are a few strong ways to kick off the conversation.", introCapabilities, introSamplePrompts },
      ]);
      setIntroCardsShown(true);
    }

    await ask(prompt);
  }

  function editSamplePrompt(prompt: string) {
    if (!introCardsShown && introCapabilities.length > 0) {
      setMessages((previous) => [
        ...previous,
        { from: "assistant", text: "Here are a few strong ways to kick off the conversation.", introCapabilities, introSamplePrompts },
      ]);
      setIntroCardsShown(true);
    }

    setInput(prompt);
  }

  const companyLookup = useMemo(() => {
    const map = new Map<string, A16zCompanyGraphNode>();

    for (const node of companyNodes) {
      const keys = [node.id, node.companyId, node.companyName];
      for (const key of keys) {
        const normalized = normalizeEntityKey(key);
        if (normalized && !map.has(normalized)) {
          map.set(normalized, node);
        }
      }
    }

    return map;
  }, [companyNodes]);

  function findCompany(highlight: ChatHighlightObject) {
    const directCompany = companyLookup.get(normalizeEntityKey(highlight.companyId));
    if (directCompany) {
      return directCompany;
    }

    return companyLookup.get(normalizeEntityKey(highlight.companyName)) ?? null;
  }

  function findPersonTarget(target: FounderAgentActionTarget) {
    if (target.kind !== "person") {
      return null;
    }

    const company = findCompany({
      text: target.personName ?? target.companyName ?? "Open person",
      modalType: "person",
      companyId: target.companyId ?? null,
      companyName: target.companyName ?? null,
      personId: target.personId ?? null,
      personName: target.personName ?? null,
    });

    const preferredMatch =
      company?.people.find(
        (person) =>
          normalizeEntityKey(person.id) === normalizeEntityKey(target.personId) ||
          normalizeEntityKey(person.name) === normalizeEntityKey(target.personName),
      ) ?? null;

    if (preferredMatch) {
      return preferredMatch;
    }

    for (const node of companyNodes) {
      const match = node.people.find(
        (person) =>
          normalizeEntityKey(person.id) === normalizeEntityKey(target.personId) ||
          normalizeEntityKey(person.name) === normalizeEntityKey(target.personName),
      );
      if (match) {
        return match;
      }
    }

    return null;
  }

  function findPartnerTarget(target: FounderAgentActionTarget) {
    if (target.kind !== "partner") {
      return null;
    }

    const company = findCompany({
      text: target.partnerName ?? target.companyName ?? "Open partner",
      modalType: "partner",
      companyId: target.companyId ?? null,
      companyName: target.companyName ?? null,
      partnerId: target.partnerId ?? null,
      partnerName: target.partnerName ?? null,
    });

    const preferredMatch =
      company?.partners.find(
        (partner) =>
          normalizeEntityKey(partner.id) === normalizeEntityKey(target.partnerId) ||
          normalizeEntityKey(partner.name) === normalizeEntityKey(target.partnerName),
      ) ?? null;

    if (preferredMatch && company) {
      return {
        companyName: company.companyName,
        partner: preferredMatch,
      };
    }

    for (const node of companyNodes) {
      const match = node.partners.find(
        (partner) =>
          normalizeEntityKey(partner.id) === normalizeEntityKey(target.partnerId) ||
          normalizeEntityKey(partner.name) === normalizeEntityKey(target.partnerName),
      );
      if (match) {
        return {
          companyName: node.companyName,
          partner: match,
        };
      }
    }

    return null;
  }

  function openTarget(target: FounderAgentActionTarget) {
    if (target.kind === "company") {
      const company =
        companyLookup.get(normalizeEntityKey(target.companyId)) ??
        companyLookup.get(normalizeEntityKey(target.companyName)) ??
        null;
      if (company) {
        setActiveCompany(company);
      }
      return;
    }

    if (target.kind === "person") {
      const person = findPersonTarget(target);
      if (person) {
        setActivePerson(person);
      }
      return;
    }

    const partner = findPartnerTarget(target);
    if (partner) {
      setActivePartner(partner);
    }
  }

  function resolveHighlightModal(highlight: ChatHighlightObject): ResolvedHighlightModal | null {
    const company = findCompany(highlight);

    if (highlight.modalType === "company") {
      return company
        ? {
            kind: "company",
            company,
          }
        : null;
    }

    if (highlight.modalType === "latest_news") {
      return company && company.latestNews.length > 0
        ? {
            kind: "latest_news",
            companyName: company.companyName,
            items: company.latestNews,
          }
        : null;
    }

    if (highlight.modalType === "person" && (highlight.personId || highlight.personName)) {
      const person = findPersonTarget({
        kind: "person",
        companyId: highlight.companyId ?? null,
        companyName: highlight.companyName ?? null,
        personId: highlight.personId ?? null,
        personName: highlight.personName ?? null,
      });

      return person
        ? {
            kind: "person",
            person,
          }
        : null;
    }

    if (highlight.modalType === "partner" && (highlight.partnerId || highlight.partnerName)) {
      const partner = findPartnerTarget({
        kind: "partner",
        companyId: highlight.companyId ?? null,
        companyName: highlight.companyName ?? null,
        partnerId: highlight.partnerId ?? null,
        partnerName: highlight.partnerName ?? null,
      });

      return partner
        ? {
            kind: "partner",
            companyName: partner.companyName,
            partner: partner.partner,
          }
        : null;
    }

    return null;
  }

  function applyActionEffect(effect: FounderAgentActionEffect) {
    if (effect.type === "open_network_entity") {
      openTarget(effect.target);
      return;
    }

    if (effect.target.kind === "person") {
      const person = findPersonTarget(effect.target);
      if (person) {
        dispatchGraphConnectRequest(person);
      } else {
        openTarget(effect.target);
      }
      return;
    }

    if (effect.target.kind === "partner") {
      const partner = findPartnerTarget(effect.target);
      if (partner) {
        dispatchPartnerConnectRequest(partner.partner, partner.companyName);
      } else {
        openTarget(effect.target);
      }
      return;
    }

    openTarget(effect.target);
  }

  function actionKey(messageIndex: number, actionId: string) {
    return `${messageIndex}:${actionId}`;
  }

  function openHighlightModal(modal: ResolvedHighlightModal | null) {
    if (!modal) {
      return;
    }

    if (modal.kind === "company") {
      setActiveCompany(modal.company);
      return;
    }

    if (modal.kind === "latest_news") {
      setActiveNews({
        companyName: modal.companyName,
        items: modal.items,
      });
      return;
    }

    if (modal.kind === "person") {
      setActivePerson(modal.person);
      return;
    }

    if (modal.kind === "partner") {
      setActivePartner({
        companyName: modal.companyName,
        partner: modal.partner,
      });
    }
  }

  async function ask(question: string) {
    if (!question.trim() || loading) {
      return;
    }

    if (!introCardsShown && introCapabilities.length > 0 && looksLikePositiveIntroResponse(question)) {
      setMessages((previous) => [
        ...previous,
        { from: "user", text: question },
        {
          from: "assistant",
          text: "Here are a few strong ways to kick off the conversation. Tap one and I'll drop it into chat for you.",
          introCapabilities,
          introSamplePrompts,
          intent: "general",
          layer: "individual",
          specialist: "personal_agent",
        },
      ]);
      setIntroCardsShown(true);
      setInput("");
      return;
    }

    setLoading(true);
    setError("");
    setMessages((previous) => [
      ...previous,
      { from: "user", text: question },
      { from: "assistant", text: "", isPending: true },
    ]);

    try {
      const response = await fetch("/api/chatbot", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          query: question,
          previousResponseId,
        }),
      });
      const payload = await response.json();
      const resolved = payload as {
        ok: boolean;
        data?: ChatbotReply;
        error?: string;
      };

      setMessages((previous) => {
        const next = previous.slice(0, -1);
        if (!resolved.ok) {
          return [...next, { from: "assistant", text: resolved.error ?? "Unexpected error. Please try again.", intent: "general" }];
        }
        if (!resolved.data) {
          return [...next, { from: "assistant", text: "No answer available right now. Please try again.", intent: "general" }];
        }
        setPreviousResponseId(resolved.data.previousResponseId ?? null);
        return [
          ...next,
          {
            from: "assistant",
            text: resolved.data.answer,
            highlights: resolved.data.highlights,
            intent: resolved.data.intent,
            layer: resolved.data.layer,
            specialist: resolved.data.specialist,
            suggestedActions: resolved.data.suggestedActions,
            agentActions: resolved.data.agentActions,
            mode: resolved.data.mode,
          },
        ];
      });
    } catch (err) {
      setError((err as Error).message);
      setMessages((previous) => {
        const next = previous.slice(0, -1);
        return [...next, { from: "assistant", text: "I couldn't reach the Meshed Agent endpoint. Please try again.", intent: "general" }];
      });
    } finally {
      setLoading(false);
      setInput("");
    }
  }

  async function acceptAction(messageIndex: number, action: FounderAgentAction) {
    const key = actionKey(messageIndex, action.id);
    if (executingActionKeys[key]) {
      return;
    }

    setError("");
    setExecutingActionKeys((previous) => ({
      ...previous,
      [key]: true,
    }));

    try {
      const response = await fetch("/api/chatbot/actions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          action,
        }),
      });
      const payload = (await response.json().catch(() => null)) as ExecuteFounderAgentActionResponse | null;
      if (!response.ok || !payload?.ok || !payload.data) {
        throw new Error(payload?.error ?? "Unable to execute this agent action.");
      }

      payload.data.effects.forEach((effect) => {
        applyActionEffect(effect);
      });

      setAcceptedActionMessages((previous) => ({
        ...previous,
        [key]: payload.data!.message,
      }));
      setMessages((previous) => [
        ...previous,
        {
          from: "assistant",
          text: payload.data!.message,
          intent: "general",
          layer: "individual",
          specialist: "personal_agent",
        },
      ]);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to execute this agent action.");
    } finally {
      setExecutingActionKeys((previous) => ({
        ...previous,
        [key]: false,
      }));
    }
  }

  return (
    <>
      <main className="mx-auto mt-4 max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-white bg-white/85 p-6 shadow-sm backdrop-blur sm:p-8">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={`${message.from}-${index}`}
                className={
                  message.from === "user"
                    ? "ml-auto max-w-3xl rounded-[1.4rem] border border-indigo-100 bg-[linear-gradient(180deg,#eef2ff,#e0e7ff)] px-4 py-3 text-sm shadow-sm"
                    : `mr-auto max-w-3xl rounded-[1.5rem] border px-4 py-4 text-sm shadow-sm ${
                        message.isPending
                          ? "border-sky-100 bg-[linear-gradient(180deg,#f8fbff,#eff6ff)]"
                          : "border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8fafc)]"
                      }`
                }
              >
                {message.from === "assistant" ? (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
                        {getAgentLabel(currentUserName)}
                      </span>
                      {message.isPending ? (
                        <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-700">
                          Working
                        </span>
                      ) : null}
                    </div>
                    {message.isPending ? (
                      <AgentThinkingVisualization />
                    ) : message.text ? (
                      <p className="mt-3 leading-7 text-ink">{message.text}</p>
                    ) : null}
                    {message.introCapabilities?.length ? (
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {message.introCapabilities.map((capability) => (
                          <article key={capability.title} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                            <p className="text-sm font-semibold text-ink">{capability.title}</p>
                            <p className="mt-2 text-sm leading-6 text-slate">{capability.body}</p>
                          </article>
                        ))}
                      </div>
                    ) : null}
                    {message.introSamplePrompts?.length ? (
                      <div className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-white px-4 py-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate">Try saying</p>
                        <div className="space-y-3">
                          {message.introSamplePrompts.map((prompt, promptIndex) => (
                            <div key={`${prompt}-${promptIndex}`} className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate">Sample {promptIndex + 1}</p>
                              <p className="mt-2 text-sm leading-6 text-ink">{prompt}</p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    void askSamplePromptNow(prompt);
                                  }}
                                  className="rounded-full border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-sky-700 transition hover:border-sky-300 hover:bg-sky-100"
                                >
                                  Ask this now
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    editSamplePrompt(prompt);
                                  }}
                                  className="rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate transition hover:border-slate-400 hover:bg-slate-50"
                                >
                                  Edit first
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {message.highlights?.length ? (
                      <div className="mt-4 space-y-2">
                        {message.highlights.map((highlight, highlightIndex) => {
                          const highlightLabel = message.intent === "prompt_suggestions" ? "Prompt" : "Insight";

                          if (!isHighlightObject(highlight)) {
                            if (message.intent === "prompt_suggestions") {
                              return (
                                <div
                                  key={`${highlight}-${highlightIndex}`}
                                  className="rounded-2xl border border-slate-200 bg-white px-4 py-4"
                                >
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate">
                                    {highlightLabel} {highlightIndex + 1}
                                  </p>
                                  <p className="mt-2 text-sm leading-6 text-ink">{highlight}</p>
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        void ask(highlight);
                                      }}
                                      className="rounded-full border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-sky-700 transition hover:border-sky-300 hover:bg-sky-100"
                                    >
                                      Ask this now
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        editSamplePrompt(highlight);
                                      }}
                                      className="rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate transition hover:border-slate-400 hover:bg-slate-50"
                                    >
                                      Edit first
                                    </button>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div
                                key={`${highlight}-${highlightIndex}`}
                                className="rounded-2xl border border-slate-200 bg-white px-3 py-3"
                              >
                                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate">
                                  {highlightLabel} {highlightIndex + 1}
                                </p>
                                <p className="mt-1 text-sm leading-6 text-ink">{highlight}</p>
                              </div>
                            );
                          }

                          const resolvedModal = resolveHighlightModal(highlight);
                          const canOpenModal = Boolean(resolvedModal);

                          return (
                            <div
                              key={`${highlight.text}-${highlightIndex}`}
                              className="rounded-2xl border border-slate-200 bg-white px-3 py-3"
                            >
                              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate">
                                {highlightLabel} {highlightIndex + 1}
                              </p>
                              {highlight.url && !canOpenModal ? (
                                <a
                                  href={highlight.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-1 block text-sm leading-6 text-sky-700 underline decoration-sky-200 underline-offset-2 transition hover:text-sky-800"
                                >
                                  {highlight.text}
                                </a>
                              ) : canOpenModal ? (
                                <button
                                  type="button"
                                  onClick={() => openHighlightModal(resolvedModal)}
                                  className="mt-1 flex w-full items-center justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-left text-sm leading-6 text-sky-800 transition hover:border-sky-300 hover:bg-sky-100"
                                >
                                  <span>{highlight.text}</span>
                                  <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-700">
                                    Open details
                                  </span>
                                </button>
                              ) : (
                                <p className="mt-1 text-sm leading-6 text-ink">{highlight.text}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                    {message.agentActions?.length ? (
                      <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-3 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate">
                          Suggested actions
                        </p>
                        <div className="mt-2 space-y-2">
                          {message.agentActions.map((action, actionIndex) => {
                            const key = actionKey(index, action.id);
                            const acceptedMessage = acceptedActionMessages[key];
                            const isExecuting = Boolean(executingActionKeys[key]);

                            return (
                              <div key={`${action.id}-${actionIndex}`} className="rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-3">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                  <div className="min-w-0">
                                    <p className="text-sm leading-6 text-ink">
                                      {actionIndex + 1}. {action.label}
                                    </p>
                                    {action.description ? (
                                      <p className="mt-1 text-xs leading-5 text-slate">{action.description}</p>
                                    ) : null}
                                  </div>
                                  <button
                                    type="button"
                                    disabled={isExecuting || Boolean(acceptedMessage)}
                                    onClick={() => {
                                      void acceptAction(index, action);
                                    }}
                                    className="inline-flex shrink-0 items-center justify-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-sky-700 transition hover:border-sky-300 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {acceptedMessage ? "Accepted" : isExecuting ? "Accepting..." : "Accept"}
                                  </button>
                                </div>
                                {acceptedMessage ? (
                                  <p className="mt-2 text-xs leading-5 text-emerald-700">{acceptedMessage}</p>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : message.suggestedActions?.length ? (
                      <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-3 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate">
                          Suggested actions
                        </p>
                        <div className="mt-2 space-y-2">
                          {message.suggestedActions.map((action, actionIndex) => (
                            <p key={`${action}-${actionIndex}`} className="text-sm leading-6 text-ink">
                              {actionIndex + 1}. {action}
                            </p>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-700">You</p>
                    <p className="mt-2 leading-6 text-ink">{message.text}</p>
                  </>
                )}
              </div>
            ))}
          </div>

          {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void ask(input);
            }}
            className="mt-6 space-y-4"
          >
            <label htmlFor="chat-message" className="sr-only">
              Ask a graph question
            </label>
            <div className="rounded-[1.6rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] p-4 shadow-sm">
              <textarea
                id="chat-message"
                value={input}
                onChange={(event) => {
                  setInput(event.target.value);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void ask(input);
                  }
                }}
                disabled={loading}
                className="mt-4 h-28 w-full resize-y rounded-2xl border border-slate-200 bg-white p-4 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                placeholder="Ask your agent..."
              />
              <div className="mt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accentStrong disabled:opacity-50"
                >
                  {loading ? "Submitting..." : "Submit"}
                </button>
              </div>
            </div>
          </form>
        </section>
      </main>

      {activeCompany ? <CompanyDetailModal company={activeCompany} onClose={() => setActiveCompany(null)} /> : null}

      {activePerson ? (
        <PersonDetailModal
          person={activePerson}
          onClose={() => setActivePerson(null)}
          onConnect={(person) => dispatchGraphConnectRequest(person)}
        />
      ) : null}

      {activePartner ? (
        <PartnerDetailModal
          partner={activePartner.partner}
          companyName={activePartner.companyName}
          onClose={() => setActivePartner(null)}
        />
      ) : null}

      {activeNews ? (
        <LatestNewsModal
          companyName={activeNews.companyName}
          items={activeNews.items}
          onClose={() => setActiveNews(null)}
        />
      ) : null}
    </>
  );
}
