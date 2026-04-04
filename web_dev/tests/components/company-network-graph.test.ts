// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const instances: Array<{
    container: Element;
    data: unknown;
    options: unknown;
    handlers: Record<string, (payload: { nodes?: unknown[]; edges?: unknown[] }) => void>;
    fit: ReturnType<typeof vi.fn>;
    focus: ReturnType<typeof vi.fn>;
    setData: ReturnType<typeof vi.fn>;
    destroy: ReturnType<typeof vi.fn>;
  }> = [];

  class MockNetwork {
    container: Element;
    data: unknown;
    options: unknown;
    handlers: Record<string, (payload: { nodes?: unknown[]; edges?: unknown[] }) => void>;
    fit: ReturnType<typeof vi.fn>;
    focus: ReturnType<typeof vi.fn>;
    setData: ReturnType<typeof vi.fn>;
    destroy: ReturnType<typeof vi.fn>;

    constructor(container: Element, data: unknown, options: unknown) {
      this.container = container;
      this.data = data;
      this.options = options;
      this.handlers = {};
      this.fit = vi.fn();
      this.focus = vi.fn();
      this.setData = vi.fn((nextData: unknown) => {
        this.data = nextData;
      });
      this.destroy = vi.fn();

      instances.push(this);
    }

    on(eventName: string, handler: (payload: { nodes?: unknown[]; edges?: unknown[] }) => void) {
      this.handlers[eventName] = handler;
    }
  }

  return {
    instances,
    MockNetwork,
  };
});

vi.mock("vis-network/standalone", () => ({
  Network: mocks.MockNetwork,
}));

vi.mock("@/components/ui/Button", () => ({
  Button: (props: {
    children: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
  }) =>
    React.createElement(
      "button",
      {
        disabled: props.disabled,
        onClick: props.onClick,
        type: "button",
      },
      props.children,
    ),
}));

function createGraphProps() {
  return {
    nodes: [
      {
        id: "co_1",
        companyId: "co_1",
        companyName: "Battlebound",
        vertical: "Gaming",
        stage: "Series A",
        location: "Los Angeles, California, USA",
        locationRegion: "United States",
        website: "https://battlebound.example",
        degree: 8,
        peopleCount: 2,
        colorHex: "#0f766e",
        size: 28,
        currentPainPointTags: ["hiring", "ops_scaling"],
        resolvedPainPointTags: ["gtm"],
        peoplePainPointOverview: "Current: Hiring Bottlenecks (2)",
        peopleConnectionSummary: "Shared GTM support routes.",
        peopleTrustSignalOverview: "Trusted Mentor (1), Rising Contributor (1)",
        people: [
          {
            id: "p_1",
            name: "Alex Wilson",
            company: "Battlebound",
            suggestedRole: "mentor",
            currentPainPointLabel: "Hiring Bottlenecks",
            resolvedPainPointsLabel: "Go-To-Market Execution",
            contact: "alex.wilson19@battlebound.example; +1-555-0101",
            linkedinUrl: "https://www.linkedin.com/in/alex-wilson-389",
            networkImportanceScore: 99,
            engagementScore: 99,
            reliabilityScore: 98,
            trustSignals: ["rising_contributor", "trusted_mentor"],
            relationshipSummary: ["Worked across 8 portfolio companies"],
            connectionSummary: "Mixed Pain Point Similarity: Hiring Bottlenecks, GTM.",
            location: "Los Angeles, California, USA",
            vertical: "Gaming",
            stage: "Series A",
          },
          {
            id: "p_2",
            name: "Jordan Patel",
            company: "Battlebound",
            suggestedRole: "operator",
            currentPainPointLabel: "Operational Scaling",
            resolvedPainPointsLabel: "Pricing and Packaging",
            contact: "jordan.patel9@battlebound.example",
            linkedinUrl: "https://www.linkedin.com/in/jordan-patel-111",
            networkImportanceScore: 87,
            engagementScore: 92,
            reliabilityScore: 90,
            trustSignals: ["verified_operator"],
            relationshipSummary: ["Shared 4 strong collaborations"],
            connectionSummary: "Resolved-to-Current Match: Pricing and Packaging, Operational Scaling.",
            location: "Los Angeles, California, USA",
            vertical: "Gaming",
            stage: "Series A",
          },
        ],
      },
      {
        id: "co_2",
        companyId: "co_2",
        companyName: "Alchemy",
        vertical: "Developer infrastructure",
        stage: "Private company",
        location: "San Francisco, California, USA",
        locationRegion: "United States",
        website: "https://alchemy.com",
        degree: 10,
        peopleCount: 1,
        colorHex: "#ca8a04",
        size: 30,
        currentPainPointTags: ["security"],
        resolvedPainPointTags: ["tech_debt"],
        peoplePainPointOverview: "Current: Security Incidents (2)",
        peopleConnectionSummary: "Shared infrastructure routes.",
        peopleTrustSignalOverview: "Trusted Mentor (1)",
        people: [
          {
            id: "p_3",
            name: "Taylor Kim",
            company: "Alchemy",
            suggestedRole: "mentor",
            currentPainPointLabel: "Security Incidents",
            resolvedPainPointsLabel: "Technical Debt",
            contact: "taylor.kim@alchemy.com",
            linkedinUrl: "https://www.linkedin.com/in/taylor-kim-222",
            networkImportanceScore: 91,
            engagementScore: 95,
            reliabilityScore: 94,
            trustSignals: ["trusted_mentor"],
            relationshipSummary: ["6 strong network collaborations"],
            connectionSummary: "Mixed Pain Point Similarity: Security Incidents.",
            location: "San Francisco, California, USA",
            vertical: "Developer infrastructure",
            stage: "Private company",
          },
        ],
      },
    ],
    edges: [
      {
        id: "edge_1",
        sourceId: "co_1",
        targetId: "co_2",
        sourceName: "Battlebound",
        targetName: "Alchemy",
        score: 0.78,
        reason: "shared current pain points",
        explanation: "Shared current pain points: Go-To-Market Execution.",
        color: "#16a34a",
        width: 2.5,
      },
    ],
  };
}

describe("CompanyNetworkGraph", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    vi.stubGlobal("React", React);
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.spyOn(window, "postMessage").mockImplementation(() => undefined);
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });

    mocks.instances.length = 0;
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders the graph shell and updates the detail panel when a node is selected", async () => {
    const { CompanyNetworkGraph } = await import("@/components/dashboard/CompanyNetworkGraph");
    const graphProps = createGraphProps();

    await act(async () => {
      root.render(React.createElement(CompanyNetworkGraph, graphProps));

      await Promise.resolve();
    });

    expect(container.textContent).toContain("Browse the company network");
    expect(container.textContent).toContain("Select a company or bridge");
    expect(container.querySelector('[data-testid="company-network-graph"]')).not.toBeNull();
    const graphStage = container.querySelector('[data-testid="company-network-stage"]');
    const detailPanel = container.querySelector('[data-testid="company-network-details"]');
    expect(graphStage?.contains(detailPanel ?? null)).toBe(true);
    expect(mocks.instances).toHaveLength(1);

    const network = mocks.instances[0];

    await act(async () => {
      network.handlers.click?.({ nodes: ["co_1"], edges: ["edge_1"] });
    });

    expect(network.focus).toHaveBeenCalledWith("co_1", expect.any(Object));
    expect(container.textContent).toContain("Selected company");
    expect(container.textContent).toContain("Battlebound");
    expect(container.textContent).toContain("battlebound.example");
    expect(container.textContent).toContain("Current pain points");
    expect(container.textContent).toContain("Alex Wilson");
    expect(container.textContent).toContain("Strongest bridges");

    const personButton = [...container.querySelectorAll("button")].find((button) =>
      button.textContent?.includes("Alex Wilson"),
    );

    expect(personButton).toBeDefined();

    await act(async () => {
      personButton?.click();
    });

    expect(container.querySelector('[data-testid="company-person-modal"]')).not.toBeNull();
    expect(container.textContent).toContain("People details");
    expect(container.textContent).toContain("alex.wilson19@battlebound.example");
    expect(container.textContent).toContain("Trusted Mentor");

    const connectButton = [...container.querySelectorAll("button")].find((button) =>
      button.textContent?.includes("Connect on Meshed"),
    );
    expect(connectButton).toBeDefined();

    await act(async () => {
      connectButton?.click();
    });

    expect(window.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "meshed:graph-connect-request",
        payload: expect.objectContaining({
          id: "p_1",
          name: "Alex Wilson",
        }),
      }),
      "http://localhost:3000",
    );
  });

  it("renders bridge details only when the click targets an edge without a node", async () => {
    const { CompanyNetworkGraph } = await import("@/components/dashboard/CompanyNetworkGraph");
    const graphProps = createGraphProps();

    await act(async () => {
      root.render(React.createElement(CompanyNetworkGraph, graphProps));
      await Promise.resolve();
    });

    const network = mocks.instances[0];

    await act(async () => {
      network.handlers.click?.({ nodes: [], edges: ["edge_1"] });
    });

    expect(container.textContent).toContain("Selected bridge");
    expect(container.textContent).toContain("Battlebound to Alchemy");
    expect(container.textContent).not.toContain("People in this node");
  });

  it("filters the network with search and keeps reset wired to the vis instance", async () => {
    const { CompanyNetworkGraph } = await import("@/components/dashboard/CompanyNetworkGraph");
    const graphProps = createGraphProps();

    await act(async () => {
      root.render(React.createElement(CompanyNetworkGraph, graphProps));

      await Promise.resolve();
    });

    const network = mocks.instances[0];
    const input = container.querySelector('input[type="search"]') as HTMLInputElement | null;
    const buttons = [...container.querySelectorAll("button")];
    const clearButton = buttons.find((button) => button.textContent?.includes("Clear"));
    const resetButton = buttons.find((button) => button.textContent?.includes("Reset view"));

    expect(input).not.toBeNull();
    expect(clearButton?.disabled).toBe(true);

    await act(async () => {
      const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
      valueSetter?.call(input, "alchemy");
      input!.dispatchEvent(new Event("input", { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain("1 matching company in focus.");
    expect(clearButton?.disabled).toBe(false);
    expect(network.setData).toHaveBeenCalled();

    await act(async () => {
      resetButton?.click();
    });

    expect(network.fit).toHaveBeenCalled();
  });
});
