import { beforeEach, describe, expect, it, vi } from "vitest";

const createDynamicClient = vi.fn();
const initializeClient = vi.fn();
const logout = vi.fn();
const waitForClientInitialized = vi.fn();

vi.mock("@dynamic-labs-sdk/client", () => ({
  createDynamicClient,
  initializeClient,
  logout,
  waitForClientInitialized,
}));

// Protect logout against SDK initialization edge cases that only appear in the browser.
describe("clearDynamicBrowserSession", () => {
  beforeEach(() => {
    vi.resetModules();
    createDynamicClient.mockReset();
    initializeClient.mockReset();
    logout.mockReset();
    waitForClientInitialized.mockReset();
    globalThis.document = { cookie: "" } as Document;
  });

  it("uses the default Dynamic client when one is already initialized", async () => {
    logout.mockResolvedValueOnce(undefined);

    vi.doMock("@/lib/config/env", () => ({
      clientEnv: {
        appUrl: "http://localhost:3000",
        dynamicEnvironmentId: "217bebe9-3f23-46ff-9806-7925c1d898f2",
        useMockDynamic: false,
      },
    }));

    const { clearDynamicBrowserSession } = await import("@/lib/auth/dynamic-browser-logout");

    await clearDynamicBrowserSession();

    expect(logout).toHaveBeenCalledTimes(1);
    expect(createDynamicClient).not.toHaveBeenCalled();
    expect(document.cookie).toContain("DYNAMIC_JWT_TOKEN=");
  });

  it("creates and initializes a fallback Dynamic client when no default client is available", async () => {
    const fallbackClient = {
      initStatus: "uninitialized",
    };

    logout.mockRejectedValueOnce(new Error("No default client"));
    logout.mockResolvedValueOnce(undefined);
    createDynamicClient.mockReturnValue(fallbackClient);
    initializeClient.mockResolvedValue(undefined);

    vi.doMock("@/lib/config/env", () => ({
      clientEnv: {
        appUrl: "http://localhost:3000",
        dynamicEnvironmentId: "217bebe9-3f23-46ff-9806-7925c1d898f2",
        useMockDynamic: false,
      },
    }));

    const { clearDynamicBrowserSession } = await import("@/lib/auth/dynamic-browser-logout");

    await clearDynamicBrowserSession();

    expect(createDynamicClient).toHaveBeenCalledWith({
      autoInitialize: false,
      environmentId: "217bebe9-3f23-46ff-9806-7925c1d898f2",
      metadata: {
        name: "Meshed",
        universalLink: "http://localhost:3000",
      },
    });
    expect(initializeClient).toHaveBeenCalledWith(fallbackClient);
    expect(logout).toHaveBeenNthCalledWith(2, fallbackClient);
    expect(document.cookie).toContain("DYNAMIC_JWT_TOKEN=");
  });

  it("does nothing except cookie cleanup when Dynamic is mocked", async () => {
    vi.doMock("@/lib/config/env", () => ({
      clientEnv: {
        appUrl: "http://localhost:3000",
        dynamicEnvironmentId: undefined,
        useMockDynamic: true,
      },
    }));

    const { clearDynamicBrowserSession } = await import("@/lib/auth/dynamic-browser-logout");

    await clearDynamicBrowserSession();

    expect(logout).not.toHaveBeenCalled();
    expect(createDynamicClient).not.toHaveBeenCalled();
    expect(document.cookie).toContain("DYNAMIC_JWT_TOKEN=");
  });
});
