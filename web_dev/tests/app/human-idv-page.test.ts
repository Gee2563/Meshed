import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/server/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/components/LogoutButton", () => ({
  LogoutButton: () => "LogoutButton",
}));

vi.mock("@/components/WorldVerificationButton", () => ({
  WorldVerificationButton: (props: { signal: string; verified: boolean }) =>
    `WorldVerificationButton:${props.signal}:${props.verified ? "verified" : "pending"}`,
}));

vi.mock("@/components/ui/Button", () => ({
  Button: (props: { children: React.ReactNode }) => props.children,
}));

describe("human IDV page", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
    mocks.getCurrentUser.mockReset();
  });

  it("sends signed-out visitors back to the Dynamic registration entrypoint", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const { default: HumanIdvPage } = await import("@/app/human-idv/page");
    const markup = renderToStaticMarkup(await HumanIdvPage());

    expect(markup).toContain("Session required");
    expect(markup).toContain("Return to Dynamic registration");
    expect(markup).not.toContain("LogoutButton");
  });

  it("shows the signed-in human verification handoff for authenticated users", async () => {
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

    const { default: HumanIdvPage } = await import("@/app/human-idv/page");
    const markup = renderToStaticMarkup(await HumanIdvPage());

    expect(markup).toContain("Finish the trust checkpoint for Avery Collins.");
    expect(markup).toContain("Human verification is still pending.");
    expect(markup).toContain("WorldVerificationButton:usr_dynamic:pending");
    expect(markup).toContain("Return home");
    expect(markup).toContain("LogoutButton");
  });
});
