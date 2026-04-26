import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/config/env", () => ({
  env: {
    OPENAI_API_KEY: "test-openai-key",
    OPENAI_MODEL: "gpt-4.1-mini",
  },
}));

describe("meshedFounderAgentService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses tool results to build a structured founder-agent reply", async () => {
    const parse = vi
      .fn()
      .mockResolvedValueOnce({
        id: "resp_1",
        output_parsed: null,
        output: [
          {
            type: "function_call",
            name: "query_meshed_graph",
            call_id: "call_graph_1",
            parsed_arguments: {
              question: "Who should I meet next week?",
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        id: "resp_2",
        output: [],
        output_parsed: {
          answer: "Your strongest next move is a founder-to-founder introduction with George Smith.",
          intent: "founder_recommendation",
          layer: "individual",
          specialist: "meeting_recommendations",
          highlights: [
            "George Smith has already solved adjacent pain points in your network.",
            {
              text: "Open George Smith profile",
              modalType: "person",
              personName: "George Smith",
              companyName: "Meshed Labs",
            },
          ],
          suggestedActions: [
            "Open George Smith's profile and review the context.",
            "Record a verified intro request from the dashboard.",
          ],
        },
      });

    const queryGraph = vi.fn(() => ({
      intent: "founder_recommendation",
      answer: "George Smith is the strongest recommendation.",
      highlights: ["George Smith is well connected."],
    }));

    const { createMeshedFounderAgentService } = await import("@/lib/server/services/meshed-founder-agent-service");
    const service = createMeshedFounderAgentService({
      createOpenAIClient: () =>
        ({
          responses: {
            parse,
          },
        }) as never,
      model: "gpt-4.1-mini",
    });

    const response = await service.answer({
      question: "Who should I meet next week?",
      previousResponseId: "resp_previous",
      founderContext: {
        founder: {
          id: "usr_founder",
          name: "Teegs",
          email: "teegs@example.com",
          role: "operator",
          bio: "Founder building a network intelligence product.",
          skills: ["fundraising", "partnerships"],
          sectors: ["fintech"],
          worldVerified: true,
          verificationBadges: ["world_verified"],
          outsideNetworkAccessEnabled: true,
        },
        scope: "a16z-crypto",
        scopeLabel: "a16z Crypto",
        memberships: [
          {
            companyId: "co_1",
            companyName: "Meshed Labs",
            sector: "fintech",
            stage: "seed",
            title: "Founder",
            relation: "owner",
            currentPainTags: ["fundraising"],
            resolvedPainTags: ["hiring"],
          },
        ],
        recentInteractions: [
          {
            interactionType: "MATCH_SUGGESTED",
            rewardStatus: "NOT_REWARDABLE",
            verified: true,
            transactionHash: null,
            createdAt: "2026-04-25T16:00:00.000Z",
          },
        ],
      },
      queryGraph,
    });

    expect(queryGraph).toHaveBeenCalledWith("Who should I meet next week?");
    expect(parse).toHaveBeenCalledTimes(2);
    expect(response).toMatchObject({
      answer: "Your strongest next move is a founder-to-founder introduction with George Smith.",
      intent: "founder_recommendation",
      layer: "individual",
      specialist: "meeting_recommendations",
      highlights: [
        "George Smith has already solved adjacent pain points in your network.",
        {
          text: "Open George Smith profile",
          modalType: "person",
          personName: "George Smith",
          companyName: "Meshed Labs",
          url: null,
          companyId: null,
          personId: null,
          partnerId: null,
          partnerName: null,
        },
      ],
      suggestedActions: [
        "Open George Smith's profile and review the context.",
        "Record a verified intro request from the dashboard.",
      ],
      mode: "openai_agent",
      previousResponseId: "resp_2",
    });
    expect(response.agentActions).toMatchObject([
      {
        label: "Open George Smith's profile and review the context.",
        actionType: "OPEN_NETWORK_ENTITY",
        targets: [
          {
            kind: "person",
            personName: "George Smith",
            companyName: "Meshed Labs",
          },
        ],
      },
      {
        label: "Record a verified intro request from the dashboard.",
        actionType: "QUEUE_OUTREACH",
        targets: [
          {
            kind: "person",
            personName: "George Smith",
            companyName: "Meshed Labs",
          },
        ],
      },
      {
        label: "Prepare a concise founder brief for the best matched contacts.",
        actionType: "DRAFT_FOUNDER_BRIEF",
      },
      {
        label: "Review my recent verified interactions before I follow up.",
        actionType: "REVIEW_VERIFIED_INTERACTIONS",
      },
    ]);
  });

  it("sanitizes invalid highlight urls returned by the model", async () => {
    const parse = vi.fn().mockResolvedValue({
      id: "resp_invalid_url",
      output: [],
      output_parsed: {
        answer: "Start with the highlighted founder profile.",
        intent: "founder_recommendation",
        layer: "individual",
        specialist: "meeting_recommendations",
        highlights: [
          {
            text: "Open founder profile",
            url: "not-a-real-url",
          },
        ],
        suggestedActions: ["Open the profile and confirm the intro angle."],
      },
    });

    const { createMeshedFounderAgentService } = await import("@/lib/server/services/meshed-founder-agent-service");
    const service = createMeshedFounderAgentService({
      createOpenAIClient: () =>
        ({
          responses: {
            parse,
          },
        }) as never,
      model: "gpt-4.1-mini",
    });

    const response = await service.answer({
      question: "Who should I meet?",
      founderContext: {
        founder: {
          id: "usr_founder",
          name: "Teegs",
          email: "teegs@example.com",
          role: "operator",
          bio: "Founder building a network intelligence product.",
          skills: ["fundraising"],
          sectors: ["fintech"],
          worldVerified: true,
          verificationBadges: ["world_verified"],
          outsideNetworkAccessEnabled: true,
        },
        scope: "a16z-crypto",
        scopeLabel: "a16z Crypto",
        memberships: [],
        recentInteractions: [],
      },
      queryGraph: vi.fn(() => ({
        intent: "founder_recommendation",
        answer: "Fallback graph answer",
        highlights: [],
      })),
    });

    expect(response.highlights).toEqual([
      {
        text: "Open founder profile",
        url: null,
        modalType: undefined,
        companyId: null,
        companyName: null,
        personId: null,
        personName: null,
        partnerId: null,
        partnerName: null,
      },
    ]);
    expect(response.agentActions).toEqual([]);
  });

  it("falls back to the deterministic graph reply when the model invents a technical issue", async () => {
    const parse = vi.fn().mockResolvedValue({
      id: "resp_bad_model_answer",
      output: [],
      output_parsed: {
        answer: "I am currently experiencing a technical issue accessing the Meshed graph right now.",
        intent: "general",
        layer: "individual",
        specialist: "personal_agent",
        highlights: [],
        suggestedActions: ["Retry later"],
      },
    });

    const queryGraph = vi.fn(() => ({
      intent: "founder_recommendation",
      answer: "These are the strongest people to reach out to from the current network graph.",
      highlights: ["George Smith is a strong bridge for this week."],
    }));

    const { createMeshedFounderAgentService } = await import("@/lib/server/services/meshed-founder-agent-service");
    const service = createMeshedFounderAgentService({
      createOpenAIClient: () =>
        ({
          responses: {
            parse,
          },
        }) as never,
      model: "gpt-4.1-mini",
    });

    const response = await service.answer({
      question: "Who should I coordinate with this week?",
      founderContext: {
        founder: {
          id: "usr_founder",
          name: "Teegs",
          email: "teegs@example.com",
          role: "operator",
          bio: "Founder building a network intelligence product.",
          skills: ["fundraising"],
          sectors: ["fintech"],
          worldVerified: true,
          verificationBadges: ["world_verified"],
          outsideNetworkAccessEnabled: true,
        },
        scope: "a16z-crypto",
        scopeLabel: "a16z Crypto",
        memberships: [],
        recentInteractions: [],
      },
      queryGraph,
    });

    expect(response).toMatchObject({
      answer: "These are the strongest people to reach out to from the current network graph.",
      intent: "founder_recommendation",
      layer: "individual",
      specialist: "meeting_recommendations",
      highlights: ["George Smith is a strong bridge for this week."],
      suggestedActions: [
        "Open the strongest highlighted contact and review the intro path.",
        "Record a verified match or request an intro from the dashboard.",
      ],
      mode: "deterministic_fallback",
      previousResponseId: null,
    });
    expect(response.agentActions).toEqual([]);
  });

  it("returns prompt suggestions instead of graph matches when the founder asks for starter prompts", async () => {
    const queryGraph = vi.fn(() => ({
      intent: "general",
      answer: "Fallback graph answer",
      highlights: ["Graph match that should not be used."],
    }));

    const { createMeshedFounderAgentService } = await import("@/lib/server/services/meshed-founder-agent-service");
    const service = createMeshedFounderAgentService({
      createOpenAIClient: () =>
        ({
          responses: {
            parse: vi.fn(),
          },
        }) as never,
      model: "gpt-4.1-mini",
    });

    const response = await service.answer({
      question: "Suggest some prompts for me",
      founderContext: {
        founder: {
          id: "usr_founder",
          name: "Teegs",
          email: "teegs@example.com",
          role: "operator",
          bio: "Founder building a network intelligence product.",
          skills: ["fundraising"],
          sectors: ["fintech"],
          worldVerified: true,
          verificationBadges: ["world_verified"],
          outsideNetworkAccessEnabled: true,
        },
        scope: "flexpoint-ford",
        scopeLabel: "Flexpoint Ford",
        memberships: [
          {
            companyId: "co_1",
            companyName: "Create Music Group",
            sector: "music",
            stage: "growth",
            title: "Founder",
            relation: "owner",
            currentPainTags: ["fundraising"],
            resolvedPainTags: [],
          },
        ],
        recentInteractions: [],
      },
      queryGraph,
    });

    expect(queryGraph).not.toHaveBeenCalled();
    expect(response).toMatchObject({
      intent: "prompt_suggestions",
      layer: "individual",
      specialist: "personal_agent",
      mode: "openai_agent",
      suggestedActions: [],
      agentActions: [],
    });
    expect(response.highlights).toEqual([
      "Who in Flexpoint Ford has already solved fundraising and is worth meeting first?",
      "What are the strongest people and opportunity matches for Create Music Group right now?",
      "I'm heading to an event soon. Who should my Meshed agent recommend I meet first?",
      "What proactive alerts should I be paying attention to this week?",
      "Which verified interactions or introductions would create the most momentum for me right now?",
    ]);
  });
});
