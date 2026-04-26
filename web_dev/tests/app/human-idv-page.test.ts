import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  redirect: vi.fn((href: string) => {
    throw new Error(`redirect:${href}`);
  }),
}));

vi.mock("@/lib/server/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

describe("human IDV page", () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockReset();
    mocks.redirect.mockClear();
  });

  it("redirects signed-out visitors home", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const { default: HumanIdvPage } = await import("@/app/human-idv/page");

    await expect(HumanIdvPage()).rejects.toThrow("redirect:/");
    expect(mocks.redirect).toHaveBeenCalledWith("/");
  });

  it("redirects signed-in members into the new onboarding flow", async () => {
    mocks.getCurrentUser.mockResolvedValue({
      id: "usr_world",
      name: "George Morris",
    });

    const { default: HumanIdvPage } = await import("@/app/human-idv/page");

    await expect(HumanIdvPage()).rejects.toThrow("redirect:/agent");
    expect(mocks.redirect).toHaveBeenCalledWith("/agent");
  });
});
