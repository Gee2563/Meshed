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

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    vi.stubGlobal("React", React);
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
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
      }),
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

    const promptButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("I'm heading to ETHDenver."),
    );

    expect(promptButton).toBeTruthy();

    await act(async () => {
      promptButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
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
});
