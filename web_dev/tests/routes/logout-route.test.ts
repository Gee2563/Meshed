import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSessionCookieName: vi.fn(),
}));

vi.mock("@/lib/server/session", () => ({
  createSessionToken: vi.fn(),
  getSessionCookieName: mocks.getSessionCookieName,
}));

describe("POST /api/auth/logout", () => {
  beforeEach(() => {
    mocks.getSessionCookieName.mockReset();
    mocks.getSessionCookieName.mockReturnValue("meshed_session");
  });

  it("returns ok and clears the Meshed session cookie", async () => {
    const { POST } = await import("@/app/api/auth/logout/route");

    const response = await POST();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
    });
    expect(response.headers.get("set-cookie")).toContain("meshed_session=;");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});
