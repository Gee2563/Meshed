// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  liveWorldVerificationWidget: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mocks.refresh,
  }),
}));

vi.mock("next/dynamic", () => ({
  default: (_loader: unknown) => {
    return (props: {
      appId: string;
      rpId: string;
      action: string;
      signal: string;
      environment: string;
      onSuccess: () => void;
    }) => {
      mocks.liveWorldVerificationWidget(props);
      return React.createElement(
        "div",
        {
          "data-testid": "live-world-widget",
        },
        `LiveWorldVerificationWidget:${props.signal}:${props.appId}:${props.rpId}:${props.action}:${props.environment}`,
      );
    };
  },
}));

vi.mock("@/lib/config/env", () => ({
  clientEnv: {
    worldAppId: "app_staging_123",
    worldRpId: "rp_staging_456",
    worldAction: "meshed-network-access",
    worldEnvironment: "staging",
    useMockWorld: false,
  },
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

describe("WorldVerificationButton", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    vi.stubGlobal("React", React);
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    mocks.refresh.mockReset();
    mocks.liveWorldVerificationWidget.mockReset();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.unstubAllGlobals();
  });

  it("renders the live widget with the current World config for unverified users", async () => {
    const { WorldVerificationButton } = await import("@/components/WorldVerificationButton");

    await act(async () => {
      root.render(React.createElement(WorldVerificationButton, { signal: "0xsignal", verified: false }));
    });

    expect(container.textContent).toContain(
      "LiveWorldVerificationWidget:0xsignal:app_staging_123:rp_staging_456:meshed-network-access:staging",
    );
    expect(mocks.liveWorldVerificationWidget).toHaveBeenCalledTimes(1);
    expect(mocks.liveWorldVerificationWidget.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        appId: "app_staging_123",
        rpId: "rp_staging_456",
        action: "meshed-network-access",
        signal: "0xsignal",
        environment: "staging",
        onSuccess: expect.any(Function),
      }),
    );
  });

  it("refreshes the page after a successful widget verification", async () => {
    const { WorldVerificationButton } = await import("@/components/WorldVerificationButton");

    await act(async () => {
      root.render(React.createElement(WorldVerificationButton, { signal: "0xsignal", verified: false }));
    });

    const onSuccess = mocks.liveWorldVerificationWidget.mock.calls[0]?.[0]?.onSuccess as (() => void) | undefined;
    expect(onSuccess).toBeTypeOf("function");

    await act(async () => {
      onSuccess?.();
    });

    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it("shows the verified state without rendering the widget", async () => {
    const { WorldVerificationButton } = await import("@/components/WorldVerificationButton");

    await act(async () => {
      root.render(React.createElement(WorldVerificationButton, { signal: "0xsignal", verified: true }));
    });

    expect(container.textContent).toContain("World ID verified");
    expect(mocks.liveWorldVerificationWidget).not.toHaveBeenCalled();
  });
});
