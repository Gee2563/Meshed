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

describe("POST /api/matches/suggest", () => {
  beforeEach(() => {
    mocks.requireCurrentUser.mockReset();
    mocks.recordInteraction.mockReset();
  });

  it("records a match suggestion for the current user", async () => {
    mocks.requireCurrentUser.mockResolvedValue({ id: "usr_actor" });
    mocks.recordInteraction.mockResolvedValue({
      id: "int_match",
      interactionType: "MATCH_SUGGESTED",
      verified: true,
    });

    const { POST } = await import("@/app/api/matches/suggest/route");
    const response = await POST(
      new Request("http://localhost/api/matches/suggest", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          targetUserId: "usr_target",
          companyId: "co_1",
          painPointTag: "pricing",
          matchScore: 91,
          metadata: {
            reason: "Shared GTM motion",
          },
        }),
      }),
    );

    expect(mocks.recordInteraction).toHaveBeenCalledWith({
      interactionType: "MATCH_SUGGESTED",
      actorUserId: "usr_actor",
      targetUserId: "usr_target",
      companyId: "co_1",
      painPointTag: "pricing",
      matchScore: 91,
      metadata: {
        reason: "Shared GTM motion",
        source: "dashboard_match_suggestion",
      },
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: {
        interaction: {
          id: "int_match",
          interactionType: "MATCH_SUGGESTED",
          verified: true,
        },
      },
    });
  });

  it("rejects invalid payloads", async () => {
    mocks.requireCurrentUser.mockResolvedValue({ id: "usr_actor" });

    const { POST } = await import("@/app/api/matches/suggest/route");
    const response = await POST(
      new Request("http://localhost/api/matches/suggest", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          targetUserId: "",
        }),
      }),
    );

    expect(mocks.recordInteraction).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
  });
});
