import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/server/http";

const mocks = vi.hoisted(() => ({
  register: vi.fn(),
  createSessionToken: vi.fn(),
  getSessionCookieName: vi.fn(),
}));

vi.mock("@/lib/server/services/world-registration-service", () => ({
  worldRegistrationService: {
    register: mocks.register,
  },
}));

vi.mock("@/lib/server/session", () => ({
  createSessionToken: mocks.createSessionToken,
  getSessionCookieName: mocks.getSessionCookieName,
}));

describe("POST /api/auth/world/register", () => {
  beforeEach(() => {
    mocks.register.mockReset();
    mocks.createSessionToken.mockReset();
    mocks.getSessionCookieName.mockReset();
    mocks.getSessionCookieName.mockReturnValue("meshed_session");
  });

  it("registers the World-verified user and writes the Meshed session cookie", async () => {
    mocks.register.mockResolvedValue({
      user: {
        id: "usr_world",
      },
      onboardingProfile: {
        id: "onb_world",
      },
      nextRoute: "/agent",
      isNewUser: true,
    });
    mocks.createSessionToken.mockResolvedValue("signed-token");

    const { POST } = await import("@/app/api/auth/world/register/route");
    const response = await POST(
      new Request("http://localhost/api/auth/world/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "George Morris",
          email: "george@example.com",
          role: "operator",
          verification: {
            protocol_version: "3.0",
            nonce: "0xnonce",
            action: "meshed-network-access",
            environment: "staging",
            responses: [{ identifier: "orb" }],
          },
        }),
      }),
    );

    expect(mocks.register).toHaveBeenCalledWith({
      name: "George Morris",
      email: "george@example.com",
      role: "operator",
      verification: {
        protocol_version: "3.0",
        nonce: "0xnonce",
        action: "meshed-network-access",
        environment: "staging",
        responses: [{ identifier: "orb" }],
      },
    });
    expect(mocks.createSessionToken).toHaveBeenCalledWith("usr_world");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: {
        user: {
          id: "usr_world",
        },
        onboardingProfile: {
          id: "onb_world",
        },
        nextRoute: "/agent",
        isNewUser: true,
      },
    });
    expect(response.headers.get("set-cookie")).toContain("meshed_session=signed-token");
  });

  it("returns a 400 response when the request payload is invalid", async () => {
    const { POST } = await import("@/app/api/auth/world/register/route");
    const response = await POST(
      new Request("http://localhost/api/auth/world/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "",
          email: "not-an-email",
          role: "unknown",
          verification: {},
        }),
      }),
    );

    expect(mocks.register).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
  });

  it("returns the service error when World registration is rejected", async () => {
    mocks.register.mockRejectedValue(new ApiError(409, "That email is already attached to another Meshed account."));

    const { POST } = await import("@/app/api/auth/world/register/route");
    const response = await POST(
      new Request("http://localhost/api/auth/world/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "George Morris",
          email: "george@example.com",
          role: "operator",
          verification: {
            protocol_version: "3.0",
            nonce: "0xnonce",
            action: "meshed-network-access",
            environment: "staging",
            responses: [{ identifier: "orb" }],
          },
        }),
      }),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "That email is already attached to another Meshed account.",
      detail: null,
    });
  });
});
