// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/Button", () => ({
  Button: (props: {
    children: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
    variant?: string;
  }) =>
    React.createElement(
      "button",
      {
        disabled: props.disabled,
        onClick: props.onClick,
        type: "button",
        "data-variant": props.variant ?? "primary",
      },
      props.children,
    ),
}));

vi.mock("@/components/dashboard/SimulateLinkedInAlertButton", () => ({
  SimulateLinkedInAlertButton: () => React.createElement("div", null, "SimulateLinkedInAlertButton"),
}));

describe("ConnectionsPanel", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    vi.stubGlobal("React", React);
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.unstubAllGlobals();
  });

  it("requests an intro for an available contact and stores the interaction", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            ok: true,
            data: {
              request: {
                id: "req_1",
                requesterUserId: "usr_current",
                recipientUserId: "usr_mentor",
                status: "pending",
              },
              interaction: {
                id: "int_1",
                interactionType: "INTRO_REQUESTED",
                verified: true,
                rewardStatus: "NOT_REWARDABLE",
                actorWorldVerified: true,
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

    const { ConnectionsPanel } = await import("@/components/dashboard/ConnectionsPanel");

    await act(async () => {
      root.render(
        React.createElement(ConnectionsPanel, {
          contacts: [
            {
              id: "usr_mentor",
              name: "Theo Mercer",
              company: "SignalStack",
              role: "mentor",
              why: "Strong portfolio operator match.",
              contact: "theo@signalstack.io",
              linkedinUrl: "https://linkedin.com/in/theo",
              suggestedConnectionType: "mentorship",
              worldVerified: true,
            },
          ],
          notifications: [],
          pendingIncomingRequests: [],
          connectedContactIds: [],
          outgoingPendingContactIds: [],
          recentInteractions: [],
        }),
      );
    });

    const sendButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Request Intro",
    );

    await act(async () => {
      sendButton?.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(global.fetch).toHaveBeenCalledWith("/api/connections/requests", expect.objectContaining({ method: "POST" }));
    expect(container.textContent).toContain("Intro requested for Theo Mercer. Verified interaction recorded.");
  });

  it("accepts an incoming request and marks the contact connected", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            ok: true,
            data: {
              request: {
                id: "req_2",
                requesterUserId: "usr_consultant",
                recipientUserId: "usr_current",
                status: "accepted",
              },
              connection: {
                id: "conn_1",
                verified: true,
              },
              interaction: {
                id: "int_accepted",
                interactionType: "INTRO_ACCEPTED",
                verified: true,
                rewardStatus: "REWARDABLE",
                actorWorldVerified: true,
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

    const { ConnectionsPanel } = await import("@/components/dashboard/ConnectionsPanel");

    await act(async () => {
      root.render(
        React.createElement(ConnectionsPanel, {
          contacts: [
            {
              id: "usr_consultant",
              name: "Nina Volkov",
              company: "MeshPay",
              role: "consultant",
              why: "Already collaborated on pricing work.",
              contact: "nina@meshpay.io",
              linkedinUrl: "https://linkedin.com/in/nina",
              suggestedConnectionType: "consulting",
              worldVerified: true,
            },
          ],
          notifications: [],
          pendingIncomingRequests: [
            {
              id: "req_2",
              requesterUserId: "usr_consultant",
              recipientUserId: "usr_current",
              requesterName: "Nina Volkov",
              requesterRole: "consultant",
              requesterCompany: "MeshPay",
              requesterContact: "nina@meshpay.io",
              requesterLinkedinUrl: "https://linkedin.com/in/nina",
              type: "consulting",
              status: "pending",
              message: "Let's formalize this consulting relationship.",
              acceptedConnectionId: null,
              contractAddress: null,
              contractNetwork: null,
              generationMode: null,
              contractTxHash: null,
              metadata: null,
              createdAt: "2026-04-01T09:00:00.000Z",
              respondedAt: null,
            },
          ],
          connectedContactIds: [],
          outgoingPendingContactIds: [],
          recentInteractions: [],
        }),
      );
    });

    const acceptButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Accept Verified Intro",
    );

    await act(async () => {
      acceptButton?.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(global.fetch).toHaveBeenCalledWith("/api/connections/requests/req_2/accept", {
      method: "POST",
    });
    expect(container.textContent).toContain("Accepted Nina Volkov's intro. Verified interaction recorded.");
    expect(container.textContent).toContain("Connected");
  });

  it("opens a graph profile handoff in the connections panel", async () => {
    vi.stubGlobal("fetch", vi.fn());

    const { ConnectionsPanel } = await import("@/components/dashboard/ConnectionsPanel");

    await act(async () => {
      root.render(
        React.createElement(ConnectionsPanel, {
          contacts: [],
          notifications: [],
          pendingIncomingRequests: [],
          connectedContactIds: [],
          outgoingPendingContactIds: [],
          recentInteractions: [],
        }),
      );
    });

    await act(async () => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: "meshed:graph-connect-request",
            payload: {
              id: "graph_person_1",
              name: "Alex Wilson",
              company: "Battlebound",
              role: "mentor",
              linkedinUrl: "https://linkedin.com/in/alex-wilson",
            },
          },
          origin: "http://localhost:3000",
        }),
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain("Alex Wilson");
    expect(container.textContent).toContain("Graph profile only");
  });

  it("renders a World Chain explorer link when an interaction has an on-chain transaction", async () => {
    vi.stubGlobal("fetch", vi.fn());

    const { ConnectionsPanel } = await import("@/components/dashboard/ConnectionsPanel");

    await act(async () => {
      root.render(
        React.createElement(ConnectionsPanel, {
          contacts: [
            {
              id: "usr_founder",
              name: "Jordan Lee",
              company: "RelayOS",
              role: "operator",
              why: "Already aligned on enterprise rollout work.",
              contact: "jordan@relayos.com",
              linkedinUrl: "https://linkedin.com/in/jordan",
              suggestedConnectionType: "consulting",
              worldVerified: true,
            },
          ],
          notifications: [],
          pendingIncomingRequests: [],
          connectedContactIds: [],
          outgoingPendingContactIds: [],
          recentInteractions: [
            {
              id: "int_chain",
              interactionType: "INTRO_ACCEPTED",
              actorUserId: "usr_current",
              targetUserId: "usr_founder",
              authorizedByUserId: null,
              companyId: null,
              painPointTag: null,
              matchScore: 95,
              verified: true,
              actorWorldVerified: true,
              actorWorldNullifier: "0xactor",
              actorVerificationLevel: null,
              targetWorldVerified: true,
              targetWorldNullifier: "0xtarget",
              targetVerificationLevel: null,
              rewardStatus: "REWARDABLE",
              transactionHash: "0xworldtx",
              metadata: {
                worldChain: {
                  explorerUrl: "https://worldchain-sepolia.explorer.alchemy.com/tx/0xworldtx",
                },
              },
              createdAt: "2026-04-01T09:00:00.000Z",
              updatedAt: "2026-04-01T09:00:00.000Z",
            },
          ],
        }),
      );
    });

    const txLink = Array.from(container.querySelectorAll("a")).find(
      (link) => link.textContent === "0xworldtx",
    );

    expect(container.textContent).toContain("Verified interaction recorded");
    expect(txLink?.getAttribute("href")).toBe("https://worldchain-sepolia.explorer.alchemy.com/tx/0xworldtx");
  });
});
