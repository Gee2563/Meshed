import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/server/http";

const mocks = vi.hoisted(() => ({
  requireCurrentUser: vi.fn(),
  verifyUser: vi.fn(),
}));

vi.mock("@/lib/server/current-user", () => ({
  requireCurrentUser: mocks.requireCurrentUser,
}));

vi.mock("@/lib/server/services/world-verification-service", () => ({
  worldVerificationService: {
    verifyUser: mocks.verifyUser,
  },
}));

describe("POST /api/auth/world/verify", () => {
  beforeEach(() => {
    mocks.requireCurrentUser.mockReset();
    mocks.verifyUser.mockReset();
  });

  it("verifies the IDKit payload for the current user and returns the updated account state", async () => {
    mocks.requireCurrentUser.mockResolvedValue({
      id: "usr_world",
      worldVerified: false,
    });
    mocks.verifyUser.mockResolvedValue({
      user: {
        id: "usr_world",
        worldVerified: true,
      },
      verification: {
        success: true,
        environment: "staging",
        message: "Verified",
      },
    });

    const { POST } = await import("@/app/api/auth/world/verify/route");
    const response = await POST(
      new Request("http://localhost/api/auth/world/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          protocol_version: "3.0",
          nonce: "0xnonce",
          action: "meshed-network-access",
          environment: "staging",
          responses: [
            {
              identifier: "orb",
              proof: "0xproof",
              merkle_root: "0xroot",
              nullifier: "0xnullifier",
            },
          ],
        }),
      }),
    );

    expect(mocks.verifyUser).toHaveBeenCalledWith(
      {
        id: "usr_world",
        worldVerified: false,
      },
      expect.objectContaining({
        protocol_version: "3.0",
        action: "meshed-network-access",
        environment: "staging",
      }),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: {
        user: {
          id: "usr_world",
          worldVerified: true,
        },
        verification: {
          success: true,
          environment: "staging",
          message: "Verified",
        },
      },
    });
  });

  it("returns a 400 response when the IDKit payload is invalid", async () => {
    mocks.requireCurrentUser.mockResolvedValue({
      id: "usr_world",
      worldVerified: false,
    });

    const { POST } = await import("@/app/api/auth/world/verify/route");
    const response = await POST(
      new Request("http://localhost/api/auth/world/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          protocol_version: "3.0",
          nonce: "",
          environment: "staging",
          responses: [],
        }),
      }),
    );

    expect(mocks.verifyUser).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: "Invalid request payload",
    });
  });

  it("returns a 401 response when there is no authenticated Meshed session", async () => {
    mocks.requireCurrentUser.mockRejectedValue(new ApiError(401, "Authentication required."));

    const { POST } = await import("@/app/api/auth/world/verify/route");
    const response = await POST(
      new Request("http://localhost/api/auth/world/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          protocol_version: "3.0",
          nonce: "0xnonce",
          action: "meshed-network-access",
          environment: "staging",
          responses: [
            {
              identifier: "orb",
            },
          ],
        }),
      }),
    );

    expect(mocks.verifyUser).not.toHaveBeenCalled();
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Authentication required.",
      detail: null,
    });
  });

  it("returns a 409 response when the World proof was already used for this action", async () => {
    mocks.requireCurrentUser.mockResolvedValue({
      id: "usr_world",
      worldVerified: false,
    });
    mocks.verifyUser.mockRejectedValue(new ApiError(409, "World verification for this action was already used."));

    const { POST } = await import("@/app/api/auth/world/verify/route");
    const response = await POST(
      new Request("http://localhost/api/auth/world/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          protocol_version: "3.0",
          nonce: "0xnonce",
          action: "meshed-network-access",
          environment: "staging",
          responses: [
            {
              identifier: "orb",
            },
          ],
        }),
      }),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "World verification for this action was already used.",
      detail: null,
    });
  });
});
