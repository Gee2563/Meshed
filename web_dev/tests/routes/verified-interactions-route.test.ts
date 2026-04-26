import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireCurrentUser: vi.fn(),
  recordInteraction: vi.fn(),
}));

vi.mock("@/lib/server/current-user", () => ({
  requireCurrentUser: mocks.requireCurrentUser,
}));

vi.mock("@/lib/server/services/verified-interaction-service", () => ({
  verifiedInteractionService: {
    recordInteraction: mocks.recordInteraction,
  },
}));

describe("POST /api/verified-interactions", () => {
  beforeEach(() => {
    mocks.requireCurrentUser.mockReset();
    mocks.recordInteraction.mockReset();
  });

  it("records a follow-up verified interaction for the current user", async () => {
    mocks.requireCurrentUser.mockResolvedValue({ id: "usr_actor" });
    mocks.recordInteraction.mockResolvedValue({
      id: "int_reward",
      interactionType: "REWARD_EARNED",
      rewardStatus: "EARNED",
      verified: true,
    });

    const { POST } = await import("@/app/api/verified-interactions/route");
    const response = await POST(
      new Request("http://localhost/api/verified-interactions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          interactionType: "REWARD_EARNED",
          targetUserId: "usr_target",
          metadata: {
            reason: "Collaboration completed",
          },
        }),
      }),
    );

    expect(mocks.recordInteraction).toHaveBeenCalledWith({
      interactionType: "REWARD_EARNED",
      actorUserId: "usr_actor",
      targetUserId: "usr_target",
      authorizedByUserId: null,
      companyId: null,
      painPointTag: null,
      matchScore: null,
      transactionHash: null,
      rewardStatus: undefined,
      metadata: {
        reason: "Collaboration completed",
        source: "manual_verified_interaction",
      },
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: {
        interaction: {
          id: "int_reward",
          interactionType: "REWARD_EARNED",
          rewardStatus: "EARNED",
          verified: true,
        },
      },
    });
  });

  it("rejects invalid payloads", async () => {
    mocks.requireCurrentUser.mockResolvedValue({ id: "usr_actor" });

    const { POST } = await import("@/app/api/verified-interactions/route");
    const response = await POST(
      new Request("http://localhost/api/verified-interactions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          interactionType: "NOT_A_REAL_TYPE",
        }),
      }),
    );

    expect(mocks.recordInteraction).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
  });
});
