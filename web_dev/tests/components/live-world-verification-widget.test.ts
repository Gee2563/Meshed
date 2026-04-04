// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requestWorldRpSignature: vi.fn(),
  submitWorldVerificationResult: vi.fn(),
  idKitRequestWidget: vi.fn(),
  buttonRender: vi.fn(),
}));

vi.mock("@/lib/config/env", () => ({
  clientEnv: {
    appUrl: "http://localhost:3000",
  },
}));

vi.mock("@/lib/auth/world-verification-client", () => ({
  requestWorldRpSignature: mocks.requestWorldRpSignature,
  submitWorldVerificationResult: mocks.submitWorldVerificationResult,
}));

vi.mock("@worldcoin/idkit", () => ({
  IDKitRequestWidget: (props: Record<string, unknown>) => {
    mocks.idKitRequestWidget(props);
    return React.createElement("div", { "data-testid": "idkit-widget" }, props.open ? "widget-open" : "widget-closed");
  },
  orbLegacy: ({ signal }: { signal: string }) => ({
    type: "OrbLegacy",
    signal,
  }),
}));

vi.mock("@/components/ui/Button", () => ({
  Button: (props: {
    children: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
  }) => {
    mocks.buttonRender(props);
    return React.createElement(
      "button",
      {
        disabled: props.disabled,
        onClick: props.onClick,
        type: "button",
      },
      props.children,
    );
  },
}));

describe("LiveWorldVerificationWidget", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    vi.stubGlobal("React", React);
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    mocks.requestWorldRpSignature.mockReset();
    mocks.submitWorldVerificationResult.mockReset();
    mocks.idKitRequestWidget.mockReset();
    mocks.buttonRender.mockReset();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.unstubAllGlobals();
  });

  it("requests an RP signature and opens the widget with the signed context", async () => {
    mocks.requestWorldRpSignature.mockResolvedValue({
      sig: "0xsig",
      nonce: "0xnonce",
      created_at: 111,
      expires_at: 222,
    });

    const { LiveWorldVerificationWidget } = await import("@/components/LiveWorldVerificationWidget");

    await act(async () => {
      root.render(
        React.createElement(LiveWorldVerificationWidget, {
          appId: "app_staging_123",
          rpId: "rp_staging_456",
          action: "meshed-network-access",
          signal: "0xsignal",
          environment: "staging",
          onSuccess: vi.fn(),
        }),
      );
    });

    const button = container.querySelector("button");
    expect(button?.textContent).toBe("Verify with World ID");

    await act(async () => {
      button?.click();
      await Promise.resolve();
    });

    expect(mocks.requestWorldRpSignature).toHaveBeenCalledWith("meshed-network-access");
    expect(container.textContent).toContain("widget-open");

    const widgetProps = mocks.idKitRequestWidget.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(widgetProps).toMatchObject({
      open: true,
      app_id: "app_staging_123",
      action: "meshed-network-access",
      allow_legacy_proofs: true,
      environment: "staging",
      return_to: "http://localhost:3000/human-idv",
      preset: {
        type: "OrbLegacy",
        signal: "0xsignal",
      },
      rp_context: {
        rp_id: "rp_staging_456",
        nonce: "0xnonce",
        created_at: 111,
        expires_at: 222,
        signature: "0xsig",
      },
    });
  });

  it("submits the World result through the shared backend helper and refresh callback", async () => {
    mocks.requestWorldRpSignature.mockResolvedValue({
      sig: "0xsig",
      nonce: "0xnonce",
      created_at: 111,
      expires_at: 222,
    });
    mocks.submitWorldVerificationResult.mockResolvedValue({
      user: {
        id: "usr_123",
        worldVerified: true,
      },
      verification: {
        success: true,
        message: "Verified",
      },
    });
    const onSuccess = vi.fn();

    const { LiveWorldVerificationWidget } = await import("@/components/LiveWorldVerificationWidget");

    await act(async () => {
      root.render(
        React.createElement(LiveWorldVerificationWidget, {
          appId: "app_staging_123",
          rpId: "rp_staging_456",
          action: "meshed-network-access",
          signal: "0xsignal",
          environment: "staging",
          onSuccess,
        }),
      );
    });

    await act(async () => {
      container.querySelector("button")?.click();
      await Promise.resolve();
    });

    const widgetProps = mocks.idKitRequestWidget.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    const result = {
      protocol_version: "3.0",
      action: "meshed-network-access",
      environment: "staging",
      responses: [
        {
          identifier: "orb",
          signal_hash: "0xsignalhash",
          nullifier: "0xnullifier",
        },
      ],
    };

    await act(async () => {
      await (widgetProps.handleVerify as (payload: unknown) => Promise<void>)(result);
    });

    expect(mocks.submitWorldVerificationResult).toHaveBeenCalledWith(result);

    await act(async () => {
      await (widgetProps.onSuccess as () => Promise<void>)();
    });

    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("shows a useful error if the RP signature request fails", async () => {
    mocks.requestWorldRpSignature.mockRejectedValue(new Error("Unable to start World ID verification."));

    const { LiveWorldVerificationWidget } = await import("@/components/LiveWorldVerificationWidget");

    await act(async () => {
      root.render(
        React.createElement(LiveWorldVerificationWidget, {
          appId: "app_staging_123",
          rpId: "rp_staging_456",
          action: "meshed-network-access",
          signal: "0xsignal",
          environment: "staging",
          onSuccess: vi.fn(),
        }),
      );
    });

    await act(async () => {
      container.querySelector("button")?.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain("Unable to start World ID verification.");
    expect(mocks.idKitRequestWidget).not.toHaveBeenCalled();
  });
});
