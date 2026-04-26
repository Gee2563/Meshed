import OpenAI from "openai";
import { zodResponsesFunction, zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

import { env } from "@/lib/config/env";
import type { FounderAgentAction, FounderAgentActionTarget, UserSummary, VerifiedInteractionSummary } from "@/lib/types";

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

export type ChatHighlight = string | ChatHighlightObject;

export type GraphChatReply = {
  intent: string;
  answer: string;
  highlights: ChatHighlight[];
};

export type MeshedAgentLayer = "individual" | "ecosystem" | "resilience";

export type MeshedAgentSpecialist =
  | "personal_agent"
  | "conference_planning"
  | "opportunity_discovery"
  | "meeting_recommendations"
  | "proactive_alerts"
  | "logistics_support"
  | "graph_intelligence"
  | "portfolio_matching"
  | "lp_advisor_founder_coordination"
  | "value_routing"
  | "resilience_coach";

export type MeshedFounderAgentReply = GraphChatReply & {
  layer: MeshedAgentLayer;
  specialist: MeshedAgentSpecialist;
  suggestedActions: string[];
  agentActions: FounderAgentAction[];
  mode: "openai_agent" | "deterministic_fallback";
  previousResponseId?: string | null;
};

export type FounderMembershipContext = {
  companyId: string;
  companyName: string;
  sector: string;
  stage: string;
  title: string;
  relation: string;
  currentPainTags: string[];
  resolvedPainTags: string[];
};

export type FounderContext = {
  founder: Pick<
    UserSummary,
    | "id"
    | "name"
    | "email"
    | "role"
    | "bio"
    | "skills"
    | "sectors"
    | "worldVerified"
    | "verificationBadges"
    | "outsideNetworkAccessEnabled"
  >;
  scope: string;
  scopeLabel: string;
  memberships: FounderMembershipContext[];
  recentInteractions: Array<{
    interactionType: VerifiedInteractionSummary["interactionType"];
    rewardStatus: VerifiedInteractionSummary["rewardStatus"];
    verified: boolean;
    transactionHash?: string | null;
    createdAt: string;
  }>;
};

type MeshedFounderAgentInput = {
  question: string;
  previousResponseId?: string | null;
  founderContext: FounderContext;
  queryGraph(question: string): GraphChatReply;
};

type OpenAiFunctionCall = {
  type: string;
  name?: string;
  call_id?: string;
  parsed_arguments?: unknown;
};

type OpenAiToolResponse = {
  output: OpenAiFunctionCall[];
  output_parsed: MeshedFounderAgentStructuredReply | null;
  id: string;
};

type ToolOutputItem = {
  type: "function_call_output";
  call_id: string;
  output: string;
};

const chatHighlightObjectSchema = z.object({
  text: z.string().min(1),
  // The Responses API rejects JSON schema `format: "uri"` here, so keep this
  // as a plain string and validate/sanitize it after parsing.
  url: z.string().nullable().optional(),
  modalType: z.enum(["company", "person", "partner", "latest_news"]).nullable().optional(),
  companyId: z.string().nullable().optional(),
  companyName: z.string().nullable().optional(),
  personId: z.string().nullable().optional(),
  personName: z.string().nullable().optional(),
  partnerId: z.string().nullable().optional(),
  partnerName: z.string().nullable().optional(),
});

const meshedFounderAgentReplySchema = z.object({
  answer: z.string().min(1),
  intent: z.string().min(1),
  layer: z.enum(["individual", "ecosystem", "resilience"]),
  specialist: z.enum([
    "personal_agent",
    "conference_planning",
    "opportunity_discovery",
    "meeting_recommendations",
    "proactive_alerts",
    "logistics_support",
    "graph_intelligence",
    "portfolio_matching",
    "lp_advisor_founder_coordination",
    "value_routing",
    "resilience_coach",
  ]),
  highlights: z.array(z.union([z.string().min(1), chatHighlightObjectSchema])).max(6).default([]),
  suggestedActions: z.array(z.string().min(1)).max(4).default([]),
});

type MeshedFounderAgentStructuredReply = z.infer<typeof meshedFounderAgentReplySchema>;

function defaultOpenAIClientFactory() {
  return new OpenAI({ apiKey: env.OPENAI_API_KEY });
}

function normalizeQuestion(question: string) {
  return question.trim();
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeKey(value: string | null | undefined) {
  return normalizeText(value ?? "").toLowerCase();
}

function normalizeOptionalUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).toString();
  } catch {
    return null;
  }
}

function buildFounderContextSummary(context: FounderContext) {
  return {
    founder: {
      id: context.founder.id,
      name: context.founder.name,
      role: context.founder.role,
      bio: context.founder.bio,
      skills: context.founder.skills,
      sectors: context.founder.sectors,
      worldVerified: context.founder.worldVerified,
      verificationBadges: context.founder.verificationBadges,
      outsideNetworkAccessEnabled: context.founder.outsideNetworkAccessEnabled,
    },
    scope: {
      id: context.scope,
      label: context.scopeLabel,
    },
    memberships: context.memberships.map((membership) => ({
      companyId: membership.companyId,
      companyName: membership.companyName,
      sector: membership.sector,
      stage: membership.stage,
      title: membership.title,
      relation: membership.relation,
      currentPainTags: membership.currentPainTags,
      resolvedPainTags: membership.resolvedPainTags,
    })),
    recentInteractions: context.recentInteractions,
  };
}

function buildInstructions(context: FounderContext) {
  return [
    "You are Meshed Agent, a verified AI Doppelganger for a founder inside Meshed.",
    "Your job is to continuously discover people, opportunities, and actions that can accelerate the founder's startup journey.",
    "Use the available tools before making claims about the Meshed graph, founder context, or verified interactions.",
    "Do not claim there is a technical issue, access issue, missing graph access, or an outage unless a tool explicitly returns an error.",
    "Never invent private identity details. You may reference only privacy-preserving trust signals like verified human status, trust badges, recent verified interactions, and public company/network context.",
    "Choose one dominant layer for every answer:",
    "- individual: personal agent, conference planning, opportunity discovery, meeting recommendations, proactive alerts, logistics support",
    "- ecosystem: graph intelligence, portfolio matching, advisor/founder coordination, value routing",
    "- resilience: help the founder protect focus, reduce coordination risk, and maintain execution continuity",
    "Keep the answer concrete and action-oriented. Prefer 2-4 crisp suggested actions.",
    `Current founder: ${context.founder.name} (${context.founder.role}) in scope ${context.scopeLabel}.`,
  ].join("\n");
}

export function isPromptSuggestionRequest(question: string) {
  const normalized = normalizeText(question).toLowerCase();
  return (
    /suggest(?:ed)?(?:\s+\w+){0,3}\s+prompts?/.test(normalized) ||
    /sample prompts?/.test(normalized) ||
    /starter prompts?/.test(normalized) ||
    /prompt ideas/.test(normalized) ||
    /suggest(?:ed)?(?:\s+\w+){0,3}\s+questions?/.test(normalized) ||
    /what should i ask/.test(normalized) ||
    /questions should i ask/.test(normalized) ||
    /give me (?:some )?(?:questions|prompts|examples)/.test(normalized) ||
    /examples? of what to say/.test(normalized)
  );
}

function buildPromptSuggestionHighlights(context: FounderContext) {
  const membershipCompanyName = context.memberships[0]?.companyName ?? null;
  const rawPainTag = context.memberships.flatMap((membership) => membership.currentPainTags)[0] ?? null;
  const primaryPainTag = rawPainTag ? formatPromptTag(rawPainTag) : null;

  if (context.founder.role === "investor") {
    return [
      `Which founders, operators, and advisors in ${context.scopeLabel} should I coordinate with this week?`,
      `What are the strongest verified introductions I should make across ${context.scopeLabel} right now?`,
      "Where is there a live pain-point match that deserves a human-backed intro this week?",
      "Which recent verified interactions are most at risk of going cold if I do nothing?",
      "What opportunities should my Meshed agent surface before my next partner meeting?",
    ];
  }

  if (context.founder.role === "employee") {
    return [
      primaryPainTag
        ? `Which teams in ${context.scopeLabel} are feeling ${primaryPainTag.toLowerCase()} and look like a strong fit for my help?`
        : `Where can I be most useful across ${context.scopeLabel} this week?`,
      "Which founders or operators should I proactively offer help to right now?",
      "What warm introductions would let me support the right teams without creating noise?",
      "Where is there a verified interaction I should follow up on before it fades?",
      "What opportunities should my Meshed agent surface for me to support this month?",
    ];
  }

  return [
    primaryPainTag
      ? `Who in ${context.scopeLabel} has already solved ${primaryPainTag.toLowerCase()} and is worth meeting first?`
      : `Who in ${context.scopeLabel} should I meet to accelerate my current priorities?`,
    `What are the strongest people and opportunity matches for ${membershipCompanyName ?? "my company"} right now?`,
    "I'm heading to an event soon. Who should my Meshed agent recommend I meet first?",
    "What proactive alerts should I be paying attention to this week?",
    "Which verified interactions or introductions would create the most momentum for me right now?",
  ];
}

function formatPromptTag(tag: string) {
  return tag
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function buildPromptSuggestionReply(
  founderContext: FounderContext,
  mode: "openai_agent" | "deterministic_fallback" = "deterministic_fallback",
): MeshedFounderAgentReply {
  return {
    answer:
      "Here are a few strong ways to kick off the conversation. Pick one exactly as written, or ask me to tailor them around fundraising, partnerships, hiring, events, or follow-up priorities.",
    intent: "prompt_suggestions",
    layer: "individual",
    specialist: "personal_agent",
    highlights: buildPromptSuggestionHighlights(founderContext),
    suggestedActions: [],
    agentActions: [],
    mode,
    previousResponseId: null,
  };
}

function mapToolReplyToHighlights(reply: GraphChatReply) {
  return reply.highlights.slice(0, 4);
}

function buildGraphGroundingSummary(reply: GraphChatReply) {
  return {
    intent: reply.intent,
    answer: reply.answer,
    highlights: mapToolReplyToHighlights(reply),
  };
}

function buildInitialFounderPrompt(question: string, context: FounderContext, graphReply: GraphChatReply) {
  return [
    `Founder question: ${normalizeQuestion(question)}`,
    "Founder context snapshot:",
    JSON.stringify(buildFounderContextSummary(context), null, 2),
    "Current Meshed graph brief for this question:",
    JSON.stringify(buildGraphGroundingSummary(graphReply), null, 2),
    "Use the graph brief confidently unless a later tool output gives better evidence.",
  ].join("\n\n");
}

function looksLikeFalseTechnicalIssue(answer: string) {
  const text = normalizeText(answer).toLowerCase();
  return /(technical issue|issue accessing|unable to access|cannot access|can't access|currently experiencing|retry later|graph issue|tool issue|service issue)/.test(
    text,
  );
}

function sanitizeHighlights(
  highlights: Array<
    | string
    | {
        text: string;
        url?: string | null;
        modalType?: "company" | "person" | "partner" | "latest_news" | null;
        companyId?: string | null;
        companyName?: string | null;
        personId?: string | null;
        personName?: string | null;
        partnerId?: string | null;
        partnerName?: string | null;
      }
  >,
): ChatHighlight[] {
  return highlights.map((highlight) => {
    if (typeof highlight === "string") {
      return highlight;
    }

    return {
      text: highlight.text,
      url: normalizeOptionalUrl(highlight.url),
      modalType: highlight.modalType ?? undefined,
      companyId: highlight.companyId ?? null,
      companyName: highlight.companyName ?? null,
      personId: highlight.personId ?? null,
      personName: highlight.personName ?? null,
      partnerId: highlight.partnerId ?? null,
      partnerName: highlight.partnerName ?? null,
    };
  });
}

function buildFallbackSuggestedActions(reply: GraphChatReply): string[] {
  if (reply.intent === "founder_recommendation") {
    return [
      "Open the strongest highlighted contact and review the intro path.",
      "Record a verified match or request an intro from the dashboard.",
    ];
  }

  if (reply.intent === "latest_news_for_company" || reply.intent === "companies_with_recent_news") {
    return [
      "Open the latest news detail and capture one timely follow-up.",
      "Route the follow-up to the best founder, advisor, or operator contact in Meshed.",
    ];
  }

  return [
    "Open the highlighted entity details from the graph.",
    "Turn the best insight into a verified interaction in the dashboard.",
  ];
}

function targetLabel(target: FounderAgentActionTarget) {
  return target.personName ?? target.partnerName ?? target.companyName ?? "the recommended contact";
}

function toActionTarget(highlight: ChatHighlight): FounderAgentActionTarget | null {
  if (typeof highlight === "string") {
    return null;
  }

  if (highlight.modalType === "person" && (highlight.personId || highlight.personName)) {
    return {
      kind: "person",
      personId: highlight.personId ?? null,
      personName: highlight.personName ?? null,
      companyId: highlight.companyId ?? null,
      companyName: highlight.companyName ?? null,
    };
  }

  if (highlight.modalType === "partner" && (highlight.partnerId || highlight.partnerName)) {
    return {
      kind: "partner",
      partnerId: highlight.partnerId ?? null,
      partnerName: highlight.partnerName ?? null,
      companyId: highlight.companyId ?? null,
      companyName: highlight.companyName ?? null,
    };
  }

  if (highlight.modalType === "company" || highlight.modalType === "latest_news") {
    if (!highlight.companyId && !highlight.companyName) {
      return null;
    }
    return {
      kind: "company",
      companyId: highlight.companyId ?? null,
      companyName: highlight.companyName ?? null,
    };
  }

  return null;
}

function dedupeTargets(targets: FounderAgentActionTarget[]) {
  const seen = new Set<string>();
  return targets.filter((target) => {
    const key = [
      target.kind,
      target.personId ?? target.personName ?? "",
      target.partnerId ?? target.partnerName ?? "",
      target.companyId ?? target.companyName ?? "",
    ].join(":");
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function actionId(label: string, index: number) {
  return `faa_${normalizeKey(label).replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "").slice(0, 32) || "action"}_${index + 1}`;
}

function buildFounderAgentActions(input: {
  intent: string;
  highlights: ChatHighlight[];
  suggestedActions: string[];
  founderContext: FounderContext;
}): FounderAgentAction[] {
  const availableTargets = dedupeTargets(input.highlights.map(toActionTarget).filter((target): target is FounderAgentActionTarget => target !== null));
  const actions: FounderAgentAction[] = [];

  function appendAction(action: FounderAgentAction | null) {
    if (!action) {
      return;
    }
    if (actions.some((existing) => existing.id === action.id || existing.label === action.label)) {
      return;
    }
    actions.push(action);
  }

  input.suggestedActions.forEach((label, index) => {
    const normalizedLabel = normalizeKey(label);
    const matchedTargets = dedupeTargets(
      availableTargets.filter((target) => {
        const name = normalizeKey(target.personName ?? target.partnerName ?? target.companyName ?? null);
        return Boolean(name) && normalizedLabel.includes(name);
      }),
    );

    const looksLikeEntityOpen = /open|review|inspect|details|profile/.test(normalizedLabel);
    const looksLikeOutreach = /reach out|engage|connect|intro|meeting|follow up|discuss|share with|contact/.test(normalizedLabel);

    if (matchedTargets.length > 0 && looksLikeEntityOpen && !looksLikeOutreach) {
      appendAction({
        id: actionId(label, index),
        label,
        actionType: "OPEN_NETWORK_ENTITY",
        description: `Open ${targetLabel(matchedTargets[0])} from the Meshed graph.`,
        targets: [matchedTargets[0]],
      });
      return;
    }

    if (matchedTargets.length > 0 || (looksLikeOutreach && availableTargets.length > 0)) {
      const outreachTargets = matchedTargets.length > 0 ? matchedTargets : [availableTargets[0]];
      appendAction({
        id: actionId(label, index),
        label,
        actionType: "QUEUE_OUTREACH",
        description: `Let the Meshed agent queue outreach for ${outreachTargets.map(targetLabel).join(", ")}.`,
        targets: outreachTargets,
      });
      return;
    }

    if (/(pitch|value proposition|market potential|one pager|brief|talk track|share with)/.test(normalizedLabel)) {
      appendAction({
        id: actionId(label, index),
        label,
        actionType: "DRAFT_FOUNDER_BRIEF",
        description: "Draft a concise founder-ready pitch or outreach brief from your current Meshed profile.",
        targets: [],
      });
      return;
    }

    if (/(verified interaction|verified interactions|recent interactions|interaction history|recent verified)/.test(normalizedLabel)) {
      appendAction({
        id: actionId(label, index),
        label,
        actionType: "REVIEW_VERIFIED_INTERACTIONS",
        description: "Summarize your recent verified interactions and reward state.",
        targets: [],
      });
      return;
    }

    if (looksLikeEntityOpen && availableTargets.length > 0) {
      appendAction({
        id: actionId(label, index),
        label,
        actionType: "OPEN_NETWORK_ENTITY",
        description: `Open ${targetLabel(availableTargets[0])} from the Meshed graph.`,
        targets: [availableTargets[0]],
      });
    }
  });

  if (actions.length === 0 && input.intent === "founder_recommendation" && availableTargets.length > 0) {
    appendAction({
      id: actionId("Queue outreach", 0),
      label: `Queue outreach to ${targetLabel(availableTargets[0])}.`,
      actionType: "QUEUE_OUTREACH",
      description: "Queue the strongest recommendation into the Meshed people workflow.",
      targets: [availableTargets[0]],
    });
  }

  if (
    actions.every((action) => action.actionType !== "DRAFT_FOUNDER_BRIEF") &&
    (input.intent === "founder_recommendation" || input.intent === "general") &&
    input.founderContext.memberships.length > 0
  ) {
    appendAction({
      id: actionId("Draft founder brief", actions.length),
      label: "Prepare a concise founder brief for the best matched contacts.",
      actionType: "DRAFT_FOUNDER_BRIEF",
      description: "Generate a short pitch the Meshed agent can use for outreach.",
      targets: [],
    });
  }

  if (actions.every((action) => action.actionType !== "REVIEW_VERIFIED_INTERACTIONS") && input.founderContext.recentInteractions.length > 0) {
    appendAction({
      id: actionId("Review verified interactions", actions.length),
      label: "Review my recent verified interactions before I follow up.",
      actionType: "REVIEW_VERIFIED_INTERACTIONS",
      description: "Summarize recent human-backed actions, reward state, and on-chain records.",
      targets: [],
    });
  }

  return actions.slice(0, 4);
}

export function buildDeterministicMeshedFounderReply(
  reply: GraphChatReply,
  founderContext?: FounderContext,
): MeshedFounderAgentReply {
  const suggestedActions = buildFallbackSuggestedActions(reply);
  return {
    ...reply,
    layer: reply.intent === "founder_recommendation" ? "individual" : "ecosystem",
    specialist: reply.intent === "founder_recommendation" ? "meeting_recommendations" : "graph_intelligence",
    suggestedActions,
    agentActions: founderContext
      ? buildFounderAgentActions({
          intent: reply.intent,
          highlights: reply.highlights,
          suggestedActions,
          founderContext,
        })
      : [],
    mode: "deterministic_fallback",
    previousResponseId: null,
  };
}

export function createMeshedFounderAgentService(deps?: {
  createOpenAIClient?: typeof defaultOpenAIClientFactory;
  model?: string;
}) {
  return {
    isAvailable() {
      return Boolean(env.OPENAI_API_KEY);
    },

    async answer(input: MeshedFounderAgentInput): Promise<MeshedFounderAgentReply> {
      if (!env.OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY is not configured.");
      }

      if (isPromptSuggestionRequest(input.question)) {
        return buildPromptSuggestionReply(input.founderContext, "openai_agent");
      }

      const client = (deps?.createOpenAIClient ?? defaultOpenAIClientFactory)();
      const initialGraphReply = input.queryGraph(input.question);
      const founderContextTool = zodResponsesFunction({
        name: "get_founder_context",
        description: "Get the current founder's verified-human context, company context, and recent verified interactions.",
        parameters: z.object({}),
      });
      const graphQueryTool = zodResponsesFunction({
        name: "query_meshed_graph",
        description: "Query the Meshed graph for people, opportunities, bridges, coverage exposure, pain points, and company news.",
        parameters: z.object({
          question: z.string().min(1),
        }),
      });
      const recentInteractionTool = zodResponsesFunction({
        name: "get_recent_verified_interactions",
        description: "Fetch recent verified interactions for this founder, including reward states and on-chain references when available.",
        parameters: z.object({
          limit: z.number().int().min(1).max(8).default(5),
        }),
      });

      const tools = [founderContextTool, graphQueryTool, recentInteractionTool];
      const toolHandlers: Record<string, (args: unknown) => Promise<unknown>> = {
        get_founder_context: async () => buildFounderContextSummary(input.founderContext),
        query_meshed_graph: async (args) => {
          const parsed = z.object({ question: z.string().min(1) }).parse(args);
          const reply = input.queryGraph(parsed.question);
          return {
            ...reply,
            highlights: mapToolReplyToHighlights(reply),
          };
        },
        get_recent_verified_interactions: async (args) => {
          const parsed = z.object({ limit: z.number().int().min(1).max(8).default(5) }).parse(args);
          return input.founderContext.recentInteractions.slice(0, parsed.limit);
        },
      };

      const responseFormat = zodTextFormat(meshedFounderAgentReplySchema, "meshed_founder_agent_reply");
      const model = deps?.model ?? env.OPENAI_MODEL;
      const instructions = buildInstructions(input.founderContext);
      const toolErrors: string[] = [];
      let response = (await client.responses.parse({
        model,
        input: buildInitialFounderPrompt(input.question, input.founderContext, initialGraphReply),
        instructions,
        previous_response_id: input.previousResponseId ?? undefined,
        tools,
        tool_choice: {
          type: "function",
          name: "query_meshed_graph",
        },
        text: {
          format: responseFormat,
        },
      })) as OpenAiToolResponse;

      for (let turn = 0; turn < 6; turn += 1) {
        const functionCalls = response.output.filter(
          (item) => item.type === "function_call" && item.name && item.call_id,
        );

        if (functionCalls.length === 0) {
          const parsed = meshedFounderAgentReplySchema.parse(response.output_parsed);
          const sanitizedHighlights = sanitizeHighlights(parsed.highlights);

          if (toolErrors.length === 0 && looksLikeFalseTechnicalIssue(parsed.answer)) {
            return buildDeterministicMeshedFounderReply(initialGraphReply, input.founderContext);
          }

          return {
            answer: normalizeText(parsed.answer),
            intent: parsed.intent,
            layer: parsed.layer,
            specialist: parsed.specialist,
            highlights: sanitizedHighlights,
            suggestedActions: parsed.suggestedActions,
            agentActions: buildFounderAgentActions({
              intent: parsed.intent,
              highlights: sanitizedHighlights,
              suggestedActions: parsed.suggestedActions,
              founderContext: input.founderContext,
            }),
            mode: "openai_agent",
            previousResponseId: response.id,
          };
        }

        const toolOutputs: ToolOutputItem[] = [];
        for (const call of functionCalls) {
          const handler = call.name ? toolHandlers[call.name] : null;
          if (!handler || !call.call_id) {
            continue;
          }

          try {
            const result = await handler(call.parsed_arguments ?? {});
            toolOutputs.push({
              type: "function_call_output",
              call_id: call.call_id,
              output: JSON.stringify(result),
            });
          } catch (error) {
            const message = error instanceof Error ? error.message : "Tool execution failed.";
            toolErrors.push(message);
            toolOutputs.push({
              type: "function_call_output",
              call_id: call.call_id,
              output: JSON.stringify({
                error: message,
              }),
            });
          }
        }

        response = (await client.responses.parse({
          model,
          instructions,
          previous_response_id: response.id,
          input: toolOutputs,
          tools,
          text: {
            format: responseFormat,
          },
        })) as OpenAiToolResponse;
      }

      throw new Error("Meshed Agent exceeded the tool-turn limit.");
    },
  };
}

export const meshedFounderAgentService = createMeshedFounderAgentService();
