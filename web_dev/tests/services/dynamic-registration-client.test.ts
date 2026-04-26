import { describe, expect, it, vi } from "vitest";

import { registerDynamicMeshedAccount } from "@/lib/auth/dynamic-registration-client";

describe("dynamic registration client", () => {
  it("posts the Dynamic registration payload and returns the normalized next route", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(input).toBe("/api/auth/dynamic/register");
      expect(init?.method).toBe("POST");
      expect(init?.headers).toEqual({
        "Content-Type": "application/json",
      });
      expect(init?.body).toBe(
        JSON.stringify({
          dynamicUserId: "dyn_123",
          email: "avery@rho.vc",
          name: "Avery Collins",
          walletAddress: "0x1234567890123456789012345678901234567890",
        }),
      );

      return new Response(
        JSON.stringify({
          ok: true,
          data: {
            nextRoute: "/agent",
          },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    });

    const result = await registerDynamicMeshedAccount(
      {
        dynamicUserId: "dyn_123",
        email: "avery@rho.vc",
        name: "Avery Collins",
        walletAddress: "0x1234567890123456789012345678901234567890",
      },
      { fetch: fetchMock },
    );

    expect(result).toEqual({
      nextRoute: "/agent",
    });
  });

  it("falls back to the Agent route when the server returns an unexpected next route", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          ok: true,
          data: {
            nextRoute: "/unexpected",
          },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    });

    const result = await registerDynamicMeshedAccount(
      {
        dynamicUserId: "dyn_123",
        email: "avery@rho.vc",
        name: "Avery Collins",
        walletAddress: "0x1234567890123456789012345678901234567890",
      },
      { fetch: fetchMock },
    );

    expect(result).toEqual({
      nextRoute: "/agent",
    });
  });

  it("throws the server error message when registration is rejected", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "This Meshed onboarding flow is invitation-only.",
        }),
        {
          status: 403,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    });

    await expect(
      registerDynamicMeshedAccount(
        {
          dynamicUserId: "dyn_123",
          email: "avery@rho.vc",
          name: "Avery Collins",
          walletAddress: "0x1234567890123456789012345678901234567890",
        },
        { fetch: fetchMock },
      ),
    ).rejects.toThrow("This Meshed onboarding flow is invitation-only.");
  });

  it("uses a safe fallback error when the response body is missing or invalid", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response("not-json", {
        status: 500,
        headers: {
          "Content-Type": "text/plain",
        },
      });
    });

    await expect(
      registerDynamicMeshedAccount(
        {
          dynamicUserId: "dyn_123",
          email: "avery@rho.vc",
          name: "Avery Collins",
          walletAddress: "0x1234567890123456789012345678901234567890",
        },
        { fetch: fetchMock },
      ),
    ).rejects.toThrow("Unable to register your Meshed account.");
  });
});
