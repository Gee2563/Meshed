import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/server/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/components/DynamicRegistrationPanel", () => ({
  DynamicRegistrationPanel: () => "DynamicRegistrationPanel",
}));

vi.mock("@/components/LogoutButton", () => ({
  LogoutButton: () => "LogoutButton",
}));

describe("home page", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
    mocks.getCurrentUser.mockReset();
  });

  it("shows the simplified product-first landing page to signed-out visitors", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const { default: HomePage } = await import("@/app/page");
    const markup = renderToStaticMarkup(await HomePage());

    expect(markup).toContain("/meshed-logo.png");
    expect(markup).toContain("Sign in to Meshed.");
    expect(markup).toContain("DynamicRegistrationPanel");
    expect(markup).not.toContain("LogoutButton");
  });

  it("shows the signed-in session state when a user already exists", async () => {
    mocks.getCurrentUser.mockResolvedValue({
      id: "usr_dynamic",
      name: "Avery Collins",
      email: "avery@rho.vc",
      role: "operator",
      bio: "Portfolio operator",
      skills: [],
      sectors: [],
      walletAddress: "0x1234567890123456789012345678901234567890",
      worldVerified: false,
      dynamicUserId: "dyn_123",
      engagementScore: 0,
      reliabilityScore: 0,
      verificationBadges: ["wallet_connected"],
      outsideNetworkAccessEnabled: false,
      createdAt: "2025-01-01T00:00:00.000Z",
    });

    const { default: HomePage } = await import("@/app/page");
    const markup = renderToStaticMarkup(await HomePage());

    expect(markup).toContain("Welcome back, Avery Collins.");
    expect(markup).toContain("Session active");
    expect(markup).toContain("LogoutButton");
    expect(markup).toContain("Continue to human IDV");
  });
});
