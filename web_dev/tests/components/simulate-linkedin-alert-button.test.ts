// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mocks.refresh,
  }),
}));

describe("SimulateLinkedInAlertButton", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    vi.stubGlobal("React", React);
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    mocks.refresh.mockReset();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.unstubAllGlobals();
  });

  it("calls the simulate route and refreshes the page on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            ok: true,
            data: {
              action: "connect_request",
              direction: "incoming",
              counterpartName: "Theo Mercer",
              ingestion: {
                status: "attested",
                eventId: "li_evt_1",
                notificationsCreated: 2,
                contractCall: {
                  txHash: "0x1234567890abcdef",
                  contractAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                  method: "recordRelationship",
                },
              },
            },
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
            },
          },
        ),
      ),
    );

    const { SimulateLinkedInAlertButton } = await import("@/components/dashboard/SimulateLinkedInAlertButton");

    await act(async () => {
      root.render(React.createElement(SimulateLinkedInAlertButton));
    });

    const button = container.querySelector("button");

    await act(async () => {
      button?.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(global.fetch).toHaveBeenCalledWith("/api/linkedin/simulate-alert", {
      method: "POST",
    });
    expect(container.textContent).toContain("Simulated connection request from Theo Mercer");
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });
});
