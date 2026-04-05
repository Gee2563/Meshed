import { describe, expect, it } from "vitest";

import {
  buildDynamicRegistrationPayload,
  getHumanIdvRoute,
  normalizeDynamicNextRoute,
} from "@/lib/auth/dynamic-onboarding";

// These helpers sit on the boundary between Dynamic data and Meshed-specific assumptions.
describe("dynamic onboarding helpers", () => {
  it("builds a Meshed registration payload from a Dynamic user and wallet", () => {
    const payload = buildDynamicRegistrationPayload({
      user: {
        userId: "dyn_123",
        email: "AVERY@RHO.VC",
        firstName: "Avery",
        lastName: "Collins",
      },
      walletAddress: "0x1234567890123456789012345678901234567890",
    });

    expect(payload).toEqual({
      dynamicUserId: "dyn_123",
      email: "avery@rho.vc",
      name: "Avery Collins",
      walletAddress: "0x1234567890123456789012345678901234567890",
    });
  });

  it("falls back to a placeholder email and alias-based display name when Dynamic does not provide email", () => {
    const payload = buildDynamicRegistrationPayload({
      user: {
        lastVerifiedCredentialId: "cred_987",
        alias: "mesh-founder",
      },
      walletAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    });

    expect(payload.email).toBe("cred_987@dynamic.meshed.local");
    expect(payload.name).toBe("mesh-founder");
    expect(payload.dynamicUserId).toBe("cred_987");
  });

  it("returns the human IDV route after Meshed account registration", () => {
    expect(getHumanIdvRoute()).toBe("/human-idv");
  });

  it("normalizes invite-aware next routes coming back from the server", () => {
    expect(normalizeDynamicNextRoute("/onboarding")).toBe("/human-idv");
    expect(normalizeDynamicNextRoute("/human-idv")).toBe("/human-idv");
    expect(normalizeDynamicNextRoute("/unexpected")).toBe("/human-idv");
  });

  it("throws when the Dynamic auth result is missing a stable identity or wallet address", () => {
    expect(() =>
      buildDynamicRegistrationPayload({
        user: { alias: "missing-wallet" },
        walletAddress: "",
      }),
    ).toThrow("Dynamic signup is missing a wallet address.");

    expect(() =>
      buildDynamicRegistrationPayload({
        user: { email: "user@example.com" },
        walletAddress: "0x1234567890123456789012345678901234567890",
      }),
    ).toThrow("Dynamic signup is missing a stable user id.");
  });
});
