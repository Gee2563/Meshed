import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireCurrentUser: vi.fn(),
  execute: vi.fn(),
}));

vi.mock("@/lib/server/current-user", () => ({
  requireCurrentUser: mocks.requireCurrentUser,
}));

vi.mock("@/lib/server/services/meshed-founder-agent-action-service", () => ({
  meshedFounderAgentActionService: {
    execute: mocks.execute,
  },
}));

describe("POST /api/chatbot/actions", () => {
  beforeEach(() => {
    mocks.requireCurrentUser.mockReset();
    mocks.execute.mockReset();
  });

  it("executes an accepted agent action for the signed-in user", async () => {
    mocks.requireCurrentUser.mockResolvedValue({ id: "usr_founder", name: "George Morris" });
    mocks.execute.mockResolvedValue({
      message: "Accepted. I queued Mike Morris for agent outreach.",
      effects: [
        {
          type: "queue_graph_contact",
          target: {
            kind: "person",
            personName: "Mike Morris",
            companyName: "Songbird",
          },
        },
      ],
      interactions: [],
      requests: [],
    });

    const { POST } = await import("@/app/api/chatbot/actions/route");
    const response = await POST(
      new Request("http://localhost/api/chatbot/actions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          action: {
            id: "faa_1",
            label: "Reach out to Mike Morris to discuss your music app and explore potential partnership opportunities.",
            actionType: "QUEUE_OUTREACH",
            targets: [
              {
                kind: "person",
                personName: "Mike Morris",
                companyName: "Songbird",
              },
            ],
          },
        }),
      }),
    );

    expect(mocks.execute).toHaveBeenCalledWith(
      { id: "usr_founder", name: "George Morris" },
      {
        id: "faa_1",
        label: "Reach out to Mike Morris to discuss your music app and explore potential partnership opportunities.",
        actionType: "QUEUE_OUTREACH",
        targets: [
          {
            kind: "person",
            personName: "Mike Morris",
            companyName: "Songbird",
          },
        ],
      },
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: {
        message: "Accepted. I queued Mike Morris for agent outreach.",
        effects: [
          {
            type: "queue_graph_contact",
            target: {
              kind: "person",
              personName: "Mike Morris",
              companyName: "Songbird",
            },
          },
        ],
        interactions: [],
        requests: [],
      },
    });
  });

  it("rejects invalid agent action payloads", async () => {
    mocks.requireCurrentUser.mockResolvedValue({ id: "usr_founder" });

    const { POST } = await import("@/app/api/chatbot/actions/route");
    const response = await POST(
      new Request("http://localhost/api/chatbot/actions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          action: {
            id: "faa_2",
            label: "",
            actionType: "QUEUE_OUTREACH",
            targets: [],
          },
        }),
      }),
    );

    expect(mocks.execute).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
  });
});
