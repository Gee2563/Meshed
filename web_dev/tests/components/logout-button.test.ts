// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  runLogoutFlow: vi.fn(),
}));

vi.mock("@/lib/auth/logout-flow", () => ({
  runLogoutFlow: mocks.runLogoutFlow,
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

describe("LogoutButton", () => {
  let container: HTMLDivElement;
  let root: Root;
  let fetchMock: ReturnType<typeof vi.fn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    vi.stubGlobal("React", React);
    fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    mocks.runLogoutFlow.mockReset();

    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    consoleErrorSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it("shows a pending state and passes the Meshed logout dependencies into the shared flow", async () => {
    const deferred = createDeferredPromise<void>();
    mocks.runLogoutFlow.mockImplementationOnce(async () => deferred.promise);

    const { LogoutButton } = await import("@/components/LogoutButton");

    await act(async () => {
      root.render(React.createElement(LogoutButton));
    });

    const button = container.querySelector("button");
    expect(button?.textContent).toBe("Log out");
    expect(button?.disabled).toBe(false);

    await act(async () => {
      button?.click();
      await Promise.resolve();
    });

    expect(button?.textContent).toBe("Logging out...");
    expect(button?.disabled).toBe(true);
    expect(mocks.runLogoutFlow).toHaveBeenCalledTimes(1);

    const input = mocks.runLogoutFlow.mock.calls[0]?.[0] as {
      clearServerSession: () => Promise<Response>;
      redirect: (href: string) => void;
    };

    await input.clearServerSession();

    expect(fetchMock).toHaveBeenCalledWith("/api/auth/logout", {
      method: "POST",
      cache: "no-store",
      credentials: "same-origin",
    });

    deferred.resolve();
    await act(async () => {
      await Promise.resolve();
    });
  });

  it("renders the failure message and restores the button when logout fails", async () => {
    mocks.runLogoutFlow.mockRejectedValueOnce(new Error("boom"));

    const { LogoutButton } = await import("@/components/LogoutButton");

    await act(async () => {
      root.render(React.createElement(LogoutButton));
    });

    const button = container.querySelector("button");

    await act(async () => {
      button?.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(button?.textContent).toBe("Log out");
    expect(button?.disabled).toBe(false);
    expect(container.textContent).toContain("Logout failed. Please try again.");
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it("wires a redirect callback into the shared logout flow", async () => {
    mocks.runLogoutFlow.mockResolvedValueOnce(undefined);

    const { LogoutButton } = await import("@/components/LogoutButton");

    await act(async () => {
      root.render(React.createElement(LogoutButton));
    });

    const button = container.querySelector("button");

    await act(async () => {
      button?.click();
      await Promise.resolve();
    });

    const input = mocks.runLogoutFlow.mock.calls[0]?.[0] as {
      redirect: (href: string) => void;
    };

    expect(input.redirect).toEqual(expect.any(Function));
  });
});
