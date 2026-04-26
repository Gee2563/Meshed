import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireCurrentUser: vi.fn(),
  restartNetworkPreparation: vi.fn(),
}));

vi.mock("@/lib/server/current-user", () => ({
  requireCurrentUser: mocks.requireCurrentUser,
}));

vi.mock("@/lib/server/services/onboarding-service", () => ({
  onboardingService: {
    restartNetworkPreparation: mocks.restartNetworkPreparation,
  },
}));

describe("POST /api/onboarding/network/retry", () => {
  beforeEach(() => {
    mocks.requireCurrentUser.mockReset();
    mocks.restartNetworkPreparation.mockReset();
    mocks.requireCurrentUser.mockResolvedValue({
      id: "usr_world",
      name: "George Morris",
    });
  });

  it("requeues the latest network preparation job for the current member", async () => {
    mocks.restartNetworkPreparation.mockResolvedValue({
      id: "job_retry",
      status: "queued",
      sourceWebsite: "https://example.vc",
    });

    const { POST } = await import("@/app/api/onboarding/network/retry/route");
    const response = await POST();
    const body = await response.json();

    expect(mocks.restartNetworkPreparation).toHaveBeenCalledWith({
      id: "usr_world",
      name: "George Morris",
    });
    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.job).toMatchObject({ id: "job_retry", status: "queued" });
  });
});
