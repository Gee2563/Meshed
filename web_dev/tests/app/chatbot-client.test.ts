// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ChatbotClient from "@/app/chatbot/ChatbotClient";

function createCompanyNodes() {
  return [
    {
      id: "co_eco",
      companyId: "co_eco",
      companyName: "Eco",
      vertical: "Fintech",
      stage: "Series B",
      location: "San Francisco, California, USA",
      locationRegion: "United States",
      website: "https://eco.example",
      flexpointLogoUrl: null,
      flexpointLogoPath: null,
      degree: 7,
      peopleCount: 1,
      colorHex: "#0f766e",
      size: 24,
      currentPainPointTags: ["cash efficiency"],
      resolvedPainPointTags: ["customer churn"],
      peoplePainPointOverview: "Current: Cash Efficiency",
      peopleConnectionSummary: "High signal operator with credibility in cash efficiency.",
      peopleTrustSignalOverview: "Verified Human",
      partners: [],
      latestNews: [],
      people: [
        {
          id: "person_sam_taylor",
          name: "Sam Taylor",
          company: "Eco",
          suggestedRole: "operator",
          currentPainPointLabel: "Cash Efficiency",
          resolvedPainPointsLabel: "Customer Churn",
          contact: "sam@eco.example",
          linkedinUrl: "https://www.linkedin.com/in/sam-taylor-eco",
          networkImportanceScore: 95,
          engagementScore: 92,
          reliabilityScore: 91,
          trustSignals: ["verified_human"],
          relationshipSummary: ["High-trust operator inside the Eco network."],
          connectionSummary: "Relevant for cash efficiency and churn questions.",
          location: "San Francisco, California, USA",
          vertical: "Fintech",
          stage: "Series B",
        },
      ],
    },
  ];
}

describe("ChatbotClient", () => {
  let container: HTMLDivElement;
  let root: Root;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    vi.stubGlobal("React", React);
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        data: {
          answer: "Sam Taylor at Eco looks especially relevant here.",
          highlights: [
            {
              text: "Sam Taylor at Eco looks especially relevant because they have relevant experience with cash efficiency, customer churn and rank highly in the network because they are active, credible, and a strong fit for this type of introduction.",
              modalType: "person",
              companyId: "co_eco",
              companyName: "Eco",
              personId: "person_sam_taylor",
              personName: "Sam Taylor",
            },
          ],
          intent: "founder_recommendation",
          layer: "individual",
          specialist: "meeting_recommendations",
          suggestedActions: [],
          agentActions: [],
          mode: "deterministic_fallback",
          previousResponseId: null,
        },
      }),
    });
    vi.stubGlobal(
      "fetch",
      fetchMock,
    );
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.unstubAllGlobals();
  });

  it("opens the person detail modal when a structured highlight is returned by the agent", async () => {
    await act(async () => {
      root.render(
        React.createElement(ChatbotClient, {
          companyNodes: createCompanyNodes(),
          currentUserName: "George Morris",
          currentUserVerified: true,
        }),
      );
    });

    const textarea = container.querySelector("textarea");
    expect(textarea).toBeTruthy();

    await act(async () => {
      if (textarea instanceof HTMLTextAreaElement) {
        const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
        setter?.call(textarea, "Who should I meet this week?");
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });

    const submitButton = Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Submit");
    expect(submitButton).toBeTruthy();

    await act(async () => {
      submitButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const openDetailsButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Open details"),
    );

    expect(openDetailsButton).toBeTruthy();

    await act(async () => {
      openDetailsButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const modal = document.querySelector('[data-testid="company-person-modal"]');
    expect(modal).toBeTruthy();
    expect(modal?.textContent).toContain("Sam Taylor");
    expect(modal?.textContent).toContain("Eco");
  });

  it("reveals capability cards and sample prompts inside the chat after a positive intro response", async () => {
    await act(async () => {
      root.render(
        React.createElement(ChatbotClient, {
          companyNodes: createCompanyNodes(),
          currentUserName: "George Morris",
          currentUserVerified: true,
          introMessage:
            "Before we jump in, here's what I can do for you.\n\nHi George Smith — I'm your Meshed agent. I'm tuned for a founder or operator working inside Flexpoint Ford, and I can turn graph intelligence, verified interactions, and your setup context into concrete next moves. Just say the word and I'll explain some of the things I can do.",
          introCapabilities: [
            {
              title: "Find people who can unblock you",
              body: "I can look for founders, operators, advisors, and LPs who match the challenges you're working through right now.",
            },
            {
              title: "Spot timely opportunities",
              body: "I can surface intros, conference meetings, collaboration threads, and warm paths across Flexpoint Ford that look actionable now.",
            },
            {
              title: "Keep your follow-through tight",
              body: "I can suggest who to follow up with, what to ask for, and where a verified human handoff is most likely to create value.",
            },
            {
              title: "Work from your setup context",
              body: "As you add channels, I can keep that context in mind alongside the Meshed graph and verified interactions.",
            },
          ],
          introSamplePrompts: [
            "Who in Flexpoint Ford should I meet to accelerate my current priorities?",
            "What are the strongest people and opportunity matches for my company right now?",
          ],
        }),
      );
    });

    const textarea = container.querySelector("textarea");
    expect(textarea).toBeTruthy();

    await act(async () => {
      if (textarea instanceof HTMLTextAreaElement) {
        const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
        setter?.call(textarea, "yes");
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });

    const submitButton = Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Submit");
    expect(submitButton).toBeTruthy();

    await act(async () => {
      submitButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("Find people who can unblock you");
    expect(container.textContent).toContain("Spot timely opportunities");
    expect(container.textContent).toContain("Keep your follow-through tight");
    expect(container.textContent).toContain("Work from your setup context");
    expect(container.textContent).toContain("Who in Flexpoint Ford should I meet to accelerate my current priorities?");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("renders prompt suggestions as prompt cards with ask and edit actions", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ok: true,
        data: {
          answer: "Here are a few strong ways to kick off the conversation.",
          highlights: [
            "Who in Flexpoint Ford should I meet to accelerate my current priorities?",
            "What proactive alerts should I be paying attention to this week?",
          ],
          intent: "prompt_suggestions",
          layer: "individual",
          specialist: "personal_agent",
          suggestedActions: [],
          agentActions: [],
          mode: "deterministic_fallback",
          previousResponseId: null,
        },
      }),
    });

    await act(async () => {
      root.render(
        React.createElement(ChatbotClient, {
          companyNodes: createCompanyNodes(),
          currentUserName: "George Morris",
          currentUserVerified: true,
        }),
      );
    });

    const textarea = container.querySelector("textarea");
    expect(textarea).toBeTruthy();

    await act(async () => {
      if (textarea instanceof HTMLTextAreaElement) {
        const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
        setter?.call(textarea, "Suggest some prompts for me");
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });

    const submitButton = Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Submit");
    expect(submitButton).toBeTruthy();

    await act(async () => {
      submitButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("Prompt 1");
    expect(container.textContent).toContain("Prompt 2");
    expect(container.textContent).toContain("Who in Flexpoint Ford should I meet to accelerate my current priorities?");
    expect(container.textContent).toContain("Ask this now");
    expect(container.textContent).toContain("Edit first");
  });
});
