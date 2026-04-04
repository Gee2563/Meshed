import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/server/http";

const mocks = vi.hoisted(() => ({
  requireCurrentUser: vi.fn(),
  createRequest: vi.fn(),
}));

vi.mock("@/lib/server/current-user", () => ({
  requireCurrentUser: mocks.requireCurrentUser,
}));

vi.mock("@/lib/server/services/connection-request-service", () => ({
  connectionRequestService: {
    createRequest: mocks.createRequest,
  },
}));

describe("POST /api/connections/requests", () => {
  beforeEach(() => {
    mocks.requireCurrentUser.mockReset();
    mocks.createRequest.mockReset();
  });

  it("creates a request for the signed-in user", async () => {
    mocks.requireCurrentUser.mockResolvedValue({ id: "usr_sender" });
    mocks.createRequest.mockResolvedValue({
      id: "req_1",
      requesterUserId: "usr_sender",
      recipientUserId: "usr_target",
      status: "pending",
    });

    const { POST } = await import("@/app/api/connections/requests/route");
    const response = await POST(
      new Request("http://localhost/api/connections/requests", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          recipientUserId: "usr_target",
          type: "intro",
          message: "Let's connect on Meshed.",
        }),
      }),
    );

    expect(mocks.createRequest).toHaveBeenCalledWith("usr_sender", {
      recipientUserId: "usr_target",
      type: "intro",
      message: "Let's connect on Meshed.",
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: {
        request: {
          id: "req_1",
          requesterUserId: "usr_sender",
          recipientUserId: "usr_target",
          status: "pending",
        },
      },
    });
  });

  it("returns the service error for duplicate requests", async () => {
    mocks.requireCurrentUser.mockResolvedValue({ id: "usr_sender" });
    mocks.createRequest.mockRejectedValue(
      new ApiError(409, "A Meshed connection request is already pending for this member."),
    );

    const { POST } = await import("@/app/api/connections/requests/route");
    const response = await POST(
      new Request("http://localhost/api/connections/requests", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          recipientUserId: "usr_target",
          type: "intro",
        }),
      }),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "A Meshed connection request is already pending for this member.",
      detail: null,
    });
  });
});
