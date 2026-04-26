import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  deleteByUserId: vi.fn(),
  getSessionCookieName: vi.fn(),
}));

vi.mock("@/lib/server/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/server/repositories/world-verification-nullifier-repository", () => ({
  worldVerificationNullifierRepository: {
    deleteByUserId: mocks.deleteByUserId,
  },
}));

vi.mock("@/lib/server/session", () => ({
  createSessionToken: vi.fn(),
  getSessionCookieName: mocks.getSessionCookieName,
}));

describe("POST /api/auth/logout", () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockReset();
    mocks.deleteByUserId.mockReset();
    mocks.getSessionCookieName.mockReset();

    mocks.getCurrentUser.mockResolvedValue({
      id: "usr_1",
    });
    mocks.deleteByUserId.mockResolvedValue(1);
    mocks.getSessionCookieName.mockReturnValue("meshed_session");
  });

  it("clears the current user's World replay mappings before clearing the Meshed session cookie", async () => {
    const { POST } = await import("@/app/api/auth/logout/route");

    const response = await POST();

    expect(mocks.deleteByUserId).toHaveBeenCalledWith("usr_1");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
    });
    expect(response.headers.get("set-cookie")).toContain("meshed_session=;");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("still clears the session cookie when there is no signed-in user", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce(null);

    const { POST } = await import("@/app/api/auth/logout/route");

    const response = await POST();

    expect(mocks.deleteByUserId).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("meshed_session=;");
  });
});
