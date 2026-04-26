import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireCurrentUser: vi.fn(),
  acceptNotification: vi.fn(),
}));

vi.mock("@/lib/server/current-user", () => ({
  requireCurrentUser: mocks.requireCurrentUser,
}));

vi.mock("@/lib/server/services/agent-notification-service", () => ({
  agentNotificationService: {
    acceptNotification: mocks.acceptNotification,
  },
}));

describe("POST /api/agent-notifications/[id]/accept", () => {
  beforeEach(() => {
    mocks.requireCurrentUser.mockReset();
    mocks.acceptNotification.mockReset();
    mocks.requireCurrentUser.mockResolvedValue({
      id: "usr_world",
      name: "George Morris",
      role: "operator",
    });
  });

  it("executes the notification's agent action for the signed-in user", async () => {
    mocks.acceptNotification.mockResolvedValue({
      notification: {
        id: "notif_1",
        status: "acted_on",
      },
      execution: {
        message: "Accepted. I queued Theo Mercer for agent outreach.",
      },
    });

    const { POST } = await import("@/app/api/agent-notifications/[id]/accept/route");
    const response = await POST(
      new Request("http://localhost/api/agent-notifications/notif_1/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionId: "act_1",
        }),
      }),
      {
        params: Promise.resolve({
          id: "notif_1",
        }),
      },
    );

    expect(mocks.acceptNotification).toHaveBeenCalledWith(
      { id: "usr_world", name: "George Morris", role: "operator" },
      {
        notificationId: "notif_1",
        actionId: "act_1",
      },
    );
    expect(response.status).toBe(200);
  });
});
