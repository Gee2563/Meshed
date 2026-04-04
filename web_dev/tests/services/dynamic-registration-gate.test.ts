import { describe, expect, it } from "vitest";

import { getDynamicRegistrationGate } from "@/lib/auth/dynamic-registration-gate";

describe("dynamic registration gate", () => {
  it("waits for Dynamic auth when no authenticated user is available yet", () => {
    expect(
      getDynamicRegistrationGate({
        hasPrimaryWallet: false,
        hasUser: false,
      }),
    ).toBe("awaiting_auth");
  });

  it("waits for Dynamic to provision the primary wallet after auth completes", () => {
    expect(
      getDynamicRegistrationGate({
        hasPrimaryWallet: false,
        hasUser: true,
      }),
    ).toBe("awaiting_wallet");
  });

  it("allows Meshed registration once Dynamic exposes the primary wallet", () => {
    expect(
      getDynamicRegistrationGate({
        hasPrimaryWallet: true,
        hasUser: true,
      }),
    ).toBe("ready_to_register");
  });
});
