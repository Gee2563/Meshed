import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  ingestWebhookEvent: vi.fn(),
}));

vi.mock("@/lib/server/services/linkedin-activity-service", () => ({
  linkedinActivityService: {
    ingestWebhookEvent: mocks.ingestWebhookEvent,
  },
}));

describe("POST /api/linkedin/webhook", () => {
  beforeEach(() => {
    mocks.ingestWebhookEvent.mockReset();
  });

  it("passes the LinkedIn event into the attestation service", async () => {
    mocks.ingestWebhookEvent.mockResolvedValue({
      status: "attested",
      eventId: "li_evt_123",
      notificationsCreated: 2,
      relationshipId: "0xrelationship",
    });

    const { POST } = await import("@/app/api/linkedin/webhook/route");
    const response = await POST(
      new Request("http://localhost/api/linkedin/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          senderLinkedInUrl: "https://www.linkedin.com/in/alice",
          recipientLinkedInUrl: "https://www.linkedin.com/in/bob",
          action: "message",
          messagePreview: "Hello from LinkedIn",
        }),
      }),
    );

    expect(mocks.ingestWebhookEvent).toHaveBeenCalledWith({
      senderLinkedInUrl: "https://www.linkedin.com/in/alice",
      recipientLinkedInUrl: "https://www.linkedin.com/in/bob",
      action: "message",
      messagePreview: "Hello from LinkedIn",
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: {
        status: "attested",
        eventId: "li_evt_123",
        notificationsCreated: 2,
        relationshipId: "0xrelationship",
      },
    });
  });

  it("rejects invalid webhook payloads", async () => {
    const { POST } = await import("@/app/api/linkedin/webhook/route");
    const response = await POST(
      new Request("http://localhost/api/linkedin/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          senderLinkedInUrl: "not-a-url",
          recipientLinkedInUrl: "https://www.linkedin.com/in/bob",
          action: "message",
        }),
      }),
    );

    expect(mocks.ingestWebhookEvent).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: "Invalid request payload",
    });
  });
});
