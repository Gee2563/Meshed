import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn((href: string) => {
    throw new Error(`redirect:${href}`);
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

describe("onboarding page", () => {
  beforeEach(() => {
    mocks.redirect.mockClear();
  });

  it("redirects legacy onboarding visits into agent setup mode", async () => {
    const { default: OnboardingPage } = await import("@/app/onboarding/page");

    expect(() => OnboardingPage()).toThrow("redirect:/agent?mode=setup");
    expect(mocks.redirect).toHaveBeenCalledWith("/agent?mode=setup");
  });
});
