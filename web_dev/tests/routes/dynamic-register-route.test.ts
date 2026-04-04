import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  register: vi.fn(),
  createSessionToken: vi.fn(),
  getSessionCookieName: vi.fn(),
}));

vi.mock("@/lib/server/services/dynamic-registration-service", () => ({
  dynamicRegistrationService: {
    register: mocks.register,
  },
}));

vi.mock("@/lib/server/session", () => ({
  createSessionToken: mocks.createSessionToken,
  getSessionCookieName: mocks.getSessionCookieName,
}));

describe("POST /api/auth/dynamic/register", () => {
  beforeEach(() => {
    mocks.register.mockReset();
    mocks.createSessionToken.mockReset();
    mocks.getSessionCookieName.mockReset();
    mocks.getSessionCookieName.mockReturnValue("meshed_session");
  });

  it("registers the Dynamic user and writes the Meshed session cookie", async () => {
    mocks.register.mockResolvedValue({
      user: {
        id: "usr_dynamic",
      },
      onboardingProfile: {
        id: "onb_dynamic",
      },
      nextRoute: "/human-idv",
      contractArtifact: null,
    });
    mocks.createSessionToken.mockResolvedValue("signed-token");

    const { POST } = await import("@/app/api/auth/dynamic/register/route");
    const response = await POST(
      new Request("http://localhost/api/auth/dynamic/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress: "0x1234567890123456789012345678901234567890",
          dynamicUserId: "dyn_123",
          email: "georgegds92+1@gmail.com",
          name: "George",
        }),
      }),
    );

    expect(mocks.register).toHaveBeenCalledWith({
      walletAddress: "0x1234567890123456789012345678901234567890",
      dynamicUserId: "dyn_123",
      email: "georgegds92+1@gmail.com",
      name: "George",
    });
    expect(mocks.createSessionToken).toHaveBeenCalledWith("usr_dynamic");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: {
        user: {
          id: "usr_dynamic",
        },
        onboardingProfile: {
          id: "onb_dynamic",
        },
        nextRoute: "/human-idv",
        contractArtifact: null,
      },
    });
    expect(response.headers.get("set-cookie")).toContain("meshed_session=signed-token");
  });

  it("returns a 400 response when the request payload is invalid", async () => {
    const { POST } = await import("@/app/api/auth/dynamic/register/route");
    const response = await POST(
      new Request("http://localhost/api/auth/dynamic/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress: "0x123",
          dynamicUserId: "",
          email: "not-an-email",
          name: "",
        }),
      }),
    );

    expect(mocks.register).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: "Invalid request payload",
    });
  });
});
