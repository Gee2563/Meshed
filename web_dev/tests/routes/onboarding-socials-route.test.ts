import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireCurrentUser: vi.fn(),
  saveSocials: vi.fn(),
}));

vi.mock("@/lib/server/current-user", () => ({
  requireCurrentUser: mocks.requireCurrentUser,
}));

vi.mock("@/lib/server/services/onboarding-service", () => ({
  onboardingService: {
    saveSocials: mocks.saveSocials,
  },
}));

describe("POST /api/onboarding/socials", () => {
  beforeEach(() => {
    mocks.requireCurrentUser.mockReset();
    mocks.saveSocials.mockReset();
    mocks.requireCurrentUser.mockResolvedValue({
      id: "usr_world",
      name: "George Morris",
    });
  });

  it("stores the social connection payload for the current member", async () => {
    mocks.saveSocials.mockResolvedValue({
      nextRoute: "/agent",
      networkReady: false,
    });

    const { POST } = await import("@/app/api/onboarding/socials/route");
    const response = await POST(
      new Request("http://localhost/api/onboarding/socials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          linkedinUrl: "https://www.linkedin.com/in/george-morris",
          emailAddress: "george@example.com",
          slackWorkspace: "meshed.slack.com",
          microsoftTeamsWorkspace: "",
          twitterHandle: "@georgemorris",
          calendarEmail: "calendar@example.com",
          instagramHandle: "",
          currentPainPoints: "fundraising, hiring",
          resolvedPainPoints: "growth loops",
        }),
      }),
    );

    expect(mocks.saveSocials).toHaveBeenCalledWith(
      { id: "usr_world", name: "George Morris" },
      expect.objectContaining({
        linkedinUrl: "https://www.linkedin.com/in/george-morris",
        emailAddress: "george@example.com",
        currentPainPoints: "fundraising, hiring",
      }),
    );
    expect(response.status).toBe(200);
  });
});
