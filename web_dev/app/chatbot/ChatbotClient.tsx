"use client";

import { useMemo, useState } from "react";

import {
  CompanyDetailModal,
  dispatchGraphConnectRequest,
  LatestNewsModal,
  PartnerDetailModal,
  PersonDetailModal,
} from "@/components/dashboard/GraphEntityModals";
import type {
  A16zCompanyGraphNode,
  A16zCompanyGraphPartner,
  A16zCompanyGraphPerson,
} from "@/lib/server/meshed-network/a16z-crypto-dashboard";

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
  intent?: string;
  isPending?: boolean;
};

type ChatbotReply = {
  answer: string;
  highlights: ChatHighlight[];
  intent: string;
};

type ChatbotClientProps = {
  companyNodes: A16zCompanyGraphNode[];
};

const samplePrompts = [
  "Which LP has the most exposure to Music and live events?",
  "Given my pain points in fundraising in my industry (Music & live events), who should I reach out to?",
  "Which companies are most connected in this network?",
  "What are the strongest bridges for GeoVera Holdings?",
  "Which companies are facing customer churn?",
  "Show me the latest news for Baker Hill.",
];

function getIntentLabel(intent?: string) {
  switch (intent) {
    case "lp_exposure":
      return "LP exposure";
    case "lp_company_coverage":
      return "LP coverage";
    case "lp_coverage_for_company":
      return "Company LPs";
    case "founder_recommendation":
      return "Outreach recommendation";
    case "top_connected_companies":
      return "Connected companies";
    case "bridge_insights":
      return "Bridge insights";
    case "companies_by_vertical":
      return "Vertical mapping";
    case "companies_with_pain_point":
      return "Pain-point scan";
    case "who_solved_pain_point":
      return "Resolved signals";
    case "latest_news_for_company":
      return "Company news";
    case "companies_with_recent_news":
      return "Recent news";
    default:
      return "Graph answer";
  }
}

function normalizeEntityKey(value: string | null | undefined) {
  return String(value ?? "")
    .toLowerCase()
    .trim();
}

function isHighlightObject(highlight: ChatHighlight): highlight is ChatHighlightObject {
  return typeof highlight === "object" && highlight !== null && "text" in highlight;
}

export default function ChatbotClient({ companyNodes }: ChatbotClientProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeCompany, setActiveCompany] = useState<A16zCompanyGraphNode | null>(null);
  const [activePerson, setActivePerson] = useState<A16zCompanyGraphPerson | null>(null);
  const [activePartner, setActivePartner] = useState<{ companyName: string; partner: A16zCompanyGraphPartner } | null>(null);
  const [activeNews, setActiveNews] = useState<{ companyName: string; items: A16zCompanyGraphNode["latestNews"] } | null>(null);

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

  function openHighlightModal(highlight: ChatHighlightObject) {
    const company = findCompany(highlight);

    if (highlight.modalType === "company") {
      if (company) {
        setActiveCompany(company);
      }
      return;
    }

    if (highlight.modalType === "latest_news") {
      if (company && company.latestNews.length > 0) {
        setActiveNews({
          companyName: company.companyName,
          items: company.latestNews,
        });
      }
      return;
    }

    if (highlight.modalType === "person") {
      const preferredMatch =
        company?.people.find(
          (person) =>
            normalizeEntityKey(person.id) === normalizeEntityKey(highlight.personId) ||
            normalizeEntityKey(person.name) === normalizeEntityKey(highlight.personName),
        ) ?? null;

      if (preferredMatch) {
        setActivePerson(preferredMatch);
        return;
      }

      for (const node of companyNodes) {
        const match = node.people.find(
          (person) =>
            normalizeEntityKey(person.id) === normalizeEntityKey(highlight.personId) ||
            normalizeEntityKey(person.name) === normalizeEntityKey(highlight.personName),
        );
        if (match) {
          setActivePerson(match);
          return;
        }
      }
      return;
    }

    if (highlight.modalType === "partner") {
      const preferredMatch =
        company?.partners.find(
          (partner) =>
            normalizeEntityKey(partner.id) === normalizeEntityKey(highlight.partnerId) ||
            normalizeEntityKey(partner.name) === normalizeEntityKey(highlight.partnerName),
        ) ?? null;

      if (preferredMatch && company) {
        setActivePartner({
          companyName: company.companyName,
          partner: preferredMatch,
        });
        return;
      }

      for (const node of companyNodes) {
        const match = node.partners.find(
          (partner) =>
            normalizeEntityKey(partner.id) === normalizeEntityKey(highlight.partnerId) ||
            normalizeEntityKey(partner.name) === normalizeEntityKey(highlight.partnerName),
        );
        if (match) {
          setActivePartner({
            companyName: node.companyName,
            partner: match,
          });
          return;
        }
      }
    }
  }

  async function ask(question: string) {
    if (!question.trim() || loading) {
      return;
    }

    setLoading(true);
    setError("");
    setMessages((previous) => [
      ...previous,
      { from: "user", text: question },
      { from: "assistant", text: "Analyzing your graph and ranking the best matches...", isPending: true },
    ]);

    try {
      const response = await fetch("/api/chatbot", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ query: question }),
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
        return [
          ...next,
          {
            from: "assistant",
            text: resolved.data.answer,
            highlights: resolved.data.highlights,
            intent: resolved.data.intent,
          },
        ];
      });
    } catch (err) {
      setError((err as Error).message);
      setMessages((previous) => {
        const next = previous.slice(0, -1);
        return [...next, { from: "assistant", text: "I couldn't reach the graph assistant endpoint. Please try again.", intent: "general" }];
      });
    } finally {
      setLoading(false);
      setInput("");
    }
  }

  return (
    <>
      <main className="mx-auto mt-4 max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-white bg-white/85 p-6 shadow-sm backdrop-blur sm:p-8">
          <h1 className="text-3xl font-bold text-ink">Meshed Graph Copilot</h1>
          <p className="mt-2 text-sm text-slate">
            Demo chatbot over the portfolio graph. Use it to explore LP exposure, people recommendations, bridge opportunities, pain points, and company news.
          </p>

          <div className="mt-6 space-y-4">
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
                        Meshed Copilot
                      </span>
                      <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate">
                        {getIntentLabel(message.intent)}
                      </span>
                      {message.isPending ? (
                        <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-700">
                          Working
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 leading-7 text-ink">{message.text}</p>
                    {message.highlights?.length ? (
                      <div className="mt-4 space-y-2">
                        {message.highlights.map((highlight, highlightIndex) => {
                          if (!isHighlightObject(highlight)) {
                            return (
                              <div
                                key={`${highlight}-${highlightIndex}`}
                                className="rounded-2xl border border-slate-200 bg-white px-3 py-3"
                              >
                                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate">
                                  Insight {highlightIndex + 1}
                                </p>
                                <p className="mt-1 text-sm leading-6 text-ink">{highlight}</p>
                              </div>
                            );
                          }

                          const canOpenModal = Boolean(highlight.modalType);

                          return (
                            <div
                              key={`${highlight.text}-${highlightIndex}`}
                              className="rounded-2xl border border-slate-200 bg-white px-3 py-3"
                            >
                              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate">
                                Insight {highlightIndex + 1}
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
                                  onClick={() => openHighlightModal(highlight)}
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
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink">Ask a graph question</p>
                  <p className="mt-1 text-xs text-slate">Try an LP, company, bridge, pain-point, or news question.</p>
                </div>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                  Demo ready
                </span>
              </div>
              <textarea
                id="chat-message"
                value={input}
                onChange={(event) => {
                  setInput(event.target.value);
                }}
                disabled={loading}
                className="mt-4 h-28 w-full resize-y rounded-2xl border border-slate-200 bg-white p-4 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                placeholder="Type your question..."
              />
              <div className="mt-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate">Suggested prompts</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {samplePrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => {
                        void ask(prompt);
                      }}
                      className="rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate transition hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-50"
                      disabled={loading}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accentStrong disabled:opacity-50"
              >
                {loading ? "Asking..." : "Ask"}
              </button>
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
