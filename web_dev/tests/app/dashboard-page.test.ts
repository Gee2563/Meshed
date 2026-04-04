import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  loadA16zCryptoDashboardData: vi.fn(),
}));

vi.mock("@/lib/server/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/server/meshed-network/a16z-crypto-dashboard", () => ({
  loadA16zCryptoDashboardData: mocks.loadA16zCryptoDashboardData,
}));

vi.mock("@/components/LogoutButton", () => ({
  LogoutButton: () => "LogoutButton",
}));

vi.mock("@/components/ui/Button", () => ({
  Button: (props: { children: React.ReactNode }) => props.children,
}));

describe("dashboard page", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
    mocks.getCurrentUser.mockReset();
    mocks.loadA16zCryptoDashboardData.mockReset();
  });

  it("sends signed-out visitors back to the trust entrypoint", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    mocks.loadA16zCryptoDashboardData.mockResolvedValue(null);

    const { default: DashboardPage } = await import("@/app/dashboard/page");
    const markup = renderToStaticMarkup(await DashboardPage());

    expect(markup).toContain("Session required");
    expect(markup).toContain("Return home");
    expect(markup).not.toContain("LogoutButton");
  });

  it("renders the a16z crypto dashboard for an authenticated user", async () => {
    mocks.getCurrentUser.mockResolvedValue({
      id: "usr_dynamic",
      name: "Avery Collins",
      email: "avery@rho.vc",
      role: "operator",
      bio: "Portfolio operator",
      skills: [],
      sectors: [],
      walletAddress: "0x1234567890123456789012345678901234567890",
      worldVerified: true,
      dynamicUserId: "dyn_123",
      engagementScore: 0,
      reliabilityScore: 0,
      verificationBadges: ["wallet_connected", "world_verified"],
      outsideNetworkAccessEnabled: false,
      createdAt: "2025-01-01T00:00:00.000Z",
    });
    mocks.loadA16zCryptoDashboardData.mockResolvedValue({
      snapshot: {
        scope: "a16z-crypto",
        scope_label: "a16z crypto",
        company_count: 125,
        company_edge_count: 360,
        people_profile_count: 499,
        vertical_count: 103,
        people_count: 499,
        people_company_count: 125,
        people_edge_count: 1988,
        generated_via: "network_pipeline.similarity_scoring",
        top_companies: [
          {
            id: "co_1",
            company_name: "Battlebound",
            vertical: "Gaming",
            location_region: "United States",
            degree: 8,
            people_count: 6,
          },
        ],
        featured_people: [
          {
            id: "p_1",
            name: "Jordan Patel",
            company: "Battlebound",
            suggested_role: "mentor",
            current_pain_point_label: "Go-To-Market Execution",
            network_importance_score: 87,
            trust_signals: ["trusted_mentor"],
          },
        ],
      },
      strongestBridges: [
        {
          id: "edge_1",
          sourceName: "Battlebound",
          targetName: "Alchemy",
          score: 0.78,
          reason: "shared current pain points",
          explanation: "Shared current pain points: Go-To-Market Execution.",
        },
      ],
      topVerticals: [
        {
          vertical: "Gaming",
          color: "#0f766e",
          count: 12,
        },
      ],
    });

    const { default: DashboardPage } = await import("@/app/dashboard/page");
    const markup = renderToStaticMarkup(await DashboardPage());

    expect(markup).toContain("A16z crypto network dashboard");
    expect(markup).toContain("Signed in as Avery Collins");
    expect(markup).toContain("Battlebound");
    expect(markup).toContain("Strongest company bridges");
    expect(markup).toContain("Jordan Patel");
    expect(markup).toContain("LogoutButton");
  });
});
