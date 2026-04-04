import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSessionToken: vi.fn(),
  getSessionCookieName: vi.fn(),
}));

vi.mock("@/lib/server/session", () => ({
  createSessionToken: mocks.createSessionToken,
  getSessionCookieName: mocks.getSessionCookieName,
}));

describe("buildSessionResponse", () => {
  beforeEach(() => {
    mocks.createSessionToken.mockReset();
    mocks.getSessionCookieName.mockReset();
    mocks.createSessionToken.mockResolvedValue("signed-token");
    mocks.getSessionCookieName.mockReturnValue("meshed_session");
  });

  it("creates an ok response and attaches the Meshed session cookie", async () => {
    const { buildSessionResponse } = await import("@/lib/server/session-response");

    const response = await buildSessionResponse({
      userId: "usr_dynamic",
      data: {
        user: { id: "usr_dynamic" },
        nextRoute: "/human-idv",
      },
    });

    expect(mocks.createSessionToken).toHaveBeenCalledWith("usr_dynamic");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: {
        user: { id: "usr_dynamic" },
        nextRoute: "/human-idv",
      },
    });
    expect(response.headers.get("set-cookie")).toContain("meshed_session=signed-token");
  });
});
