import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireCurrentUser: vi.fn(),
  getState: vi.fn(),
}));

vi.mock("@/lib/server/current-user", () => ({
  requireCurrentUser: mocks.requireCurrentUser,
}));

vi.mock("@/lib/server/services/onboarding-service", () => ({
  onboardingService: {
    getState: mocks.getState,
  },
}));

describe("GET /api/onboarding/status", () => {
  beforeEach(() => {
    mocks.requireCurrentUser.mockReset();
    mocks.getState.mockReset();
    mocks.requireCurrentUser.mockResolvedValue({
      id: "usr_world",
    });
  });

  it("returns the current onboarding state for the signed-in user", async () => {
    mocks.getState.mockResolvedValue({
      currentStep: "network_preparing",
      networkReady: false,
      latestNetworkJob: {
        id: "job_123",
        status: "running",
      },
    });

    const { GET } = await import("@/app/api/onboarding/status/route");
    const response = await GET();

    expect(mocks.getState).toHaveBeenCalledWith("usr_world");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: {
        currentStep: "network_preparing",
        networkReady: false,
        latestNetworkJob: {
          id: "job_123",
          status: "running",
        },
      },
    });
  });
});
