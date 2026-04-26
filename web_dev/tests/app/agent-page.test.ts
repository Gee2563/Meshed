import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getState: vi.fn(),
  loadDashboardData: vi.fn(),
  agentExperience: vi.fn(),
}));

vi.mock("@/lib/server/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/server/services/onboarding-service", () => ({
  onboardingService: {
    getState: mocks.getState,
  },
}));

vi.mock("@/lib/server/meshed-network/a16z-crypto-dashboard", () => ({
  loadDashboardData: mocks.loadDashboardData,
}));

vi.mock("@/components/agent/AgentExperience", () => ({
  AgentExperience: (props: Record<string, unknown>) => {
    mocks.agentExperience(props);
    return "AgentExperience";
  },
}));

vi.mock("@/components/LogoutButton", () => ({
  LogoutButton: () => "LogoutButton",
}));

describe("agent page", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
    mocks.getCurrentUser.mockReset();
    mocks.getState.mockReset();
    mocks.loadDashboardData.mockReset();
    mocks.agentExperience.mockReset();
  });

  it("passes setup state into the unified Agent experience when setup is still in progress", async () => {
    mocks.getCurrentUser.mockResolvedValue({
      id: "usr_world",
      name: "George Morris",
      email: "george@example.com",
      role: "operator",
      worldVerified: true,
    });
    mocks.getState.mockResolvedValue({
      user: {
        role: "operator",
      },
      currentStep: "vc_company",
      vcCompany: null,
      memberCompany: null,
      vcOptions: [],
      socialConnections: [],
      latestNetworkJob: null,
    });

    const { default: AgentPage } = await import("@/app/agent/page");
    const markup = renderToStaticMarkup(await AgentPage({}));

    expect(markup).toContain("AgentExperience");
    expect(mocks.agentExperience).toHaveBeenCalledTimes(1);
    expect(mocks.agentExperience.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        currentUserName: "George Morris",
        currentStep: "vc_company",
        setupMode: false,
      }),
    );
  });

  it("passes live graph context into the unified Agent experience once setup is complete", async () => {
    mocks.getCurrentUser.mockResolvedValue({
      id: "usr_world",
      name: "George Morris",
      email: "george@example.com",
      role: "operator",
      worldVerified: true,
    });
    mocks.getState.mockResolvedValue({
      user: {
        role: "operator",
      },
      currentStep: "ready",
      vcCompany: {
        name: "Flexpoint Ford",
        website: "https://flexpointford.com",
      },
      memberCompany: null,
      vcOptions: [],
      socialConnections: [],
      latestNetworkJob: null,
    });
    mocks.loadDashboardData.mockResolvedValue({
      companyGraph: {
        nodes: [],
      },
    });

    const { default: AgentPage } = await import("@/app/agent/page");
    const markup = renderToStaticMarkup(await AgentPage({}));

    expect(markup).toContain("AgentExperience");
    expect(mocks.agentExperience).toHaveBeenCalledTimes(1);
    expect(mocks.agentExperience.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        currentUserName: "George Morris",
        currentStep: "ready",
        initialCompanyNodes: [],
      }),
    );
  });
});
