// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  runWorldVerification: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mocks.refresh,
  }),
}));

vi.mock("@/lib/config/env", () => ({
  clientEnv: {
    worldAppId: "app_staging_123",
    worldRpId: "rp_staging_456",
    useMockWorld: false,
  },
}));

vi.mock("@/lib/auth/world-verification-client", () => ({
  runWorldVerification: mocks.runWorldVerification,
}));

vi.mock("@/components/ui/Button", () => ({
  Button: (props: {
    children: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
  }) =>
    React.createElement(
      "button",
      {
        disabled: props.disabled,
        onClick: props.onClick,
        type: "button",
      },
      props.children,
    ),
}));

function createDeferredPromise<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });

  return { promise, resolve, reject };
}

describe("WorldVerificationButton", () => {
  let container: HTMLDivElement;
  let root: Root;
  let windowOpenMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    vi.stubGlobal("React", React);
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    mocks.refresh.mockReset();
    mocks.runWorldVerification.mockReset();
    windowOpenMock = vi.fn();
    vi.stubGlobal("open", windowOpenMock);
    window.open = windowOpenMock as typeof window.open;
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.unstubAllGlobals();
  });

  it("opens the World connector and refreshes once verification succeeds", async () => {
    const popup = {
      closed: false,
      close: vi.fn(),
      focus: vi.fn(),
      location: { href: "" },
    };
    windowOpenMock.mockReturnValue(popup);

    const deferred = createDeferredPromise<{
      verification: {
        message: string;
      };
    }>();
    mocks.runWorldVerification.mockImplementationOnce(async (input) => deferred.promise);

    const { WorldVerificationButton } = await import("@/components/WorldVerificationButton");

    await act(async () => {
      root.render(React.createElement(WorldVerificationButton, { signal: "0xsignal", verified: false }));
    });

    const button = container.querySelector("button");

    await act(async () => {
      button?.click();
      await Promise.resolve();
    });

    expect(button?.textContent).toBe("Opening World ID...");
    expect(container.textContent).toContain("Preparing the World ID staging handoff...");
    expect(windowOpenMock).toHaveBeenCalledWith("", "meshed_world_id");

    const input = mocks.runWorldVerification.mock.calls[0]?.[0] as {
      signal: string;
      onConnectorReady?: (connectorUri: string) => void | Promise<void>;
    };

    await act(async () => {
      await input.onConnectorReady?.("world://connector");
      await Promise.resolve();
    });

    expect(input.signal).toBe("0xsignal");
    expect(popup.location.href).toBe("world://connector");
    expect(popup.focus).toHaveBeenCalled();
    expect(container.textContent).toContain("World ID opened in a new tab or app.");
    expect(container.querySelector("a")?.getAttribute("href")).toBe("world://connector");

    deferred.resolve({
      verification: {
        message: "Verified",
      },
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain("Verified");
  });

  it("shows the manual launch fallback when the browser blocks the popup", async () => {
    windowOpenMock.mockReturnValue(null);
    mocks.runWorldVerification.mockImplementationOnce(async (input) => {
      await input.onConnectorReady?.("world://connector");
      throw new Error("Verification cancelled");
    });

    const { WorldVerificationButton } = await import("@/components/WorldVerificationButton");

    await act(async () => {
      root.render(React.createElement(WorldVerificationButton, { signal: "0xsignal", verified: false }));
    });

    const button = container.querySelector("button");

    await act(async () => {
      button?.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(windowOpenMock).toHaveBeenCalledWith("", "meshed_world_id");
    expect(windowOpenMock).toHaveBeenCalledWith("world://connector", "_blank");
    expect(container.textContent).toContain("Open World ID using the manual link below");
    expect(container.querySelector("a")?.getAttribute("href")).toBe("world://connector");
    expect(container.textContent).toContain("Verification cancelled");
  });
});
