import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/server/http";

const mocks = vi.hoisted(() => ({
  requireCurrentUser: vi.fn(),
  acceptRequest: vi.fn(),
}));

vi.mock("@/lib/server/current-user", () => ({
  requireCurrentUser: mocks.requireCurrentUser,
}));

vi.mock("@/lib/server/services/connection-request-service", () => ({
  connectionRequestService: {
    acceptRequest: mocks.acceptRequest,
  },
}));

describe("POST /api/connections/requests/[id]/accept", () => {
  beforeEach(() => {
    mocks.requireCurrentUser.mockReset();
    mocks.acceptRequest.mockReset();
  });

  it("accepts the request for the signed-in user and returns the contract-backed connection", async () => {
    mocks.requireCurrentUser.mockResolvedValue({ id: "usr_recipient" });
    mocks.acceptRequest.mockResolvedValue({
      request: {
        id: "req_1",
        status: "accepted",
        contractAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      },
      connection: {
        id: "conn_1",
        verified: true,
      },
    });

    const { POST } = await import("@/app/api/connections/requests/[id]/accept/route");
    const response = await POST(new Request("http://localhost/api/connections/requests/req_1/accept", {
      method: "POST",
    }), {
      params: Promise.resolve({ id: "req_1" }),
    });

    expect(mocks.acceptRequest).toHaveBeenCalledWith("usr_recipient", "req_1");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: {
        request: {
          id: "req_1",
          status: "accepted",
          contractAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        },
        connection: {
          id: "conn_1",
          verified: true,
        },
      },
    });
  });

  it("returns the service error status when the request can no longer be accepted", async () => {
    mocks.requireCurrentUser.mockResolvedValue({ id: "usr_recipient" });
    mocks.acceptRequest.mockRejectedValue(new ApiError(409, "Connection request is no longer pending."));

    const { POST } = await import("@/app/api/connections/requests/[id]/accept/route");
    const response = await POST(new Request("http://localhost/api/connections/requests/req_1/accept", {
      method: "POST",
    }), {
      params: Promise.resolve({ id: "req_1" }),
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Connection request is no longer pending.",
      detail: null,
    });
  });
});
