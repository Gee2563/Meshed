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

describe("CompanyNetworkGraph", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    vi.stubGlobal("React", React);
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
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
    vi.unstubAllGlobals();
  });

  it("renders the graph shell and updates the detail panel when a node is selected", async () => {
    const { CompanyNetworkGraph } = await import("@/components/dashboard/CompanyNetworkGraph");

    await act(async () => {
      root.render(
        React.createElement(CompanyNetworkGraph, {
          nodes: [
            {
              id: "co_1",
              companyId: "co_1",
              companyName: "Battlebound",
              vertical: "Gaming",
              stage: "Series A",
              location: "Los Angeles, California, USA",
              locationRegion: "United States",
              degree: 8,
              peopleCount: 6,
              colorHex: "#0f766e",
              size: 28,
              peoplePainPointOverview: "Current: Hiring Bottlenecks (2)",
              peopleConnectionSummary: "Shared GTM support routes.",
            },
            {
              id: "co_2",
              companyId: "co_2",
              companyName: "Alchemy",
              vertical: "Developer infrastructure",
              stage: "Private company",
              location: "San Francisco, California, USA",
              locationRegion: "United States",
              degree: 10,
              peopleCount: 5,
              colorHex: "#ca8a04",
              size: 30,
              peoplePainPointOverview: "Current: Security Incidents (2)",
              peopleConnectionSummary: "Shared infrastructure routes.",
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
        }),
      );

      await Promise.resolve();
    });

    expect(container.textContent).toContain("Browse the company network");
    expect(container.textContent).toContain("Select a company or bridge");
    expect(container.querySelector('[data-testid="company-network-graph"]')).not.toBeNull();
    expect(mocks.instances).toHaveLength(1);

    const network = mocks.instances[0];

    await act(async () => {
      network.handlers.selectNode?.({ nodes: ["co_1"] });
    });

    expect(network.focus).toHaveBeenCalledWith("co_1", expect.any(Object));
    expect(container.textContent).toContain("Selected company");
    expect(container.textContent).toContain("Battlebound");
    expect(container.textContent).toContain("Shared GTM support routes.");
    expect(container.textContent).toContain("Strongest bridges");
  });

  it("filters the network with search and keeps reset wired to the vis instance", async () => {
    const { CompanyNetworkGraph } = await import("@/components/dashboard/CompanyNetworkGraph");

    await act(async () => {
      root.render(
        React.createElement(CompanyNetworkGraph, {
          nodes: [
            {
              id: "co_1",
              companyId: "co_1",
              companyName: "Battlebound",
              vertical: "Gaming",
              stage: "Series A",
              location: "Los Angeles, California, USA",
              locationRegion: "United States",
              degree: 8,
              peopleCount: 6,
              colorHex: "#0f766e",
              size: 28,
              peoplePainPointOverview: "Current: Hiring Bottlenecks (2)",
              peopleConnectionSummary: "Shared GTM support routes.",
            },
            {
              id: "co_2",
              companyId: "co_2",
              companyName: "Alchemy",
              vertical: "Developer infrastructure",
              stage: "Private company",
              location: "San Francisco, California, USA",
              locationRegion: "United States",
              degree: 10,
              peopleCount: 5,
              colorHex: "#ca8a04",
              size: 30,
              peoplePainPointOverview: "Current: Security Incidents (2)",
              peopleConnectionSummary: "Shared infrastructure routes.",
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
        }),
      );

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
