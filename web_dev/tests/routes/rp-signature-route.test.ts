import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createRpSignature: vi.fn(),
}));

vi.mock("@/lib/config/env", () => ({
  env: {
    WORLD_ACTION: "meshed-network-access",
  },
}));

vi.mock("@/lib/server/services/world-verification-service", () => ({
  worldVerificationService: {
    createRpSignature: mocks.createRpSignature,
  },
}));

describe("POST /api/rp-signature", () => {
  beforeEach(() => {
    mocks.createRpSignature.mockReset();
  });

  it("returns the World RP signature in the shape expected by the staging client flow", async () => {
    mocks.createRpSignature.mockReturnValue({
      sig: "0xsig",
      nonce: "0xnonce",
      created_at: 111,
      expires_at: 222,
    });

    const { POST } = await import("@/app/api/rp-signature/route");
    const response = await POST(
      new Request("http://localhost/api/rp-signature", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "world-test-action",
        }),
      }),
    );

    expect(mocks.createRpSignature).toHaveBeenCalledWith("world-test-action");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      sig: "0xsig",
      nonce: "0xnonce",
      created_at: 111,
      expires_at: 222,
    });
  });

  it("falls back to the configured default action when the client omits one", async () => {
    mocks.createRpSignature.mockReturnValue({
      sig: "0xsig",
      nonce: "0xnonce",
      created_at: 111,
      expires_at: 222,
    });

    const { POST } = await import("@/app/api/rp-signature/route");
    const response = await POST(
      new Request("http://localhost/api/rp-signature", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      }),
    );

    expect(mocks.createRpSignature).toHaveBeenCalledWith("meshed-network-access");
    expect(response.status).toBe(200);
  });

  it("returns a 400 response for an invalid request payload", async () => {
    const { POST } = await import("@/app/api/rp-signature/route");
    const response = await POST(
      new Request("http://localhost/api/rp-signature", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "",
        }),
      }),
    );

    expect(mocks.createRpSignature).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid request payload",
      detail: expect.any(Object),
    });
  });
});
