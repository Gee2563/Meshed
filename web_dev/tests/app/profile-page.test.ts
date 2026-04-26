import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  ensureDemoState: vi.fn(),
  listDemoUsers: vi.fn(),
  listRecentForUser: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock("@/lib/server/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/server/services/connection-request-service", () => ({
  connectionRequestService: {
    ensureDemoState: mocks.ensureDemoState,
  },
}));

vi.mock("@/lib/server/repositories/user-repository", () => ({
  userRepository: {
    listDemoUsers: mocks.listDemoUsers,
  },
}));

vi.mock("@/lib/server/services/verified-interaction-service", () => ({
  verifiedInteractionService: {
    listRecentForUser: mocks.listRecentForUser,
  },
}));

vi.mock("@/lib/server/prisma", () => ({
  prisma: {
    companyMembership: {
      findMany: mocks.findMany,
    },
  },
}));

vi.mock("@/components/LogoutButton", () => ({
  LogoutButton: () => "LogoutButton",
}));

vi.mock("@/components/ui/Button", () => ({
  Button: (props: { children: React.ReactNode }) => props.children,
}));

describe("profile page", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
    mocks.getCurrentUser.mockReset();
    mocks.ensureDemoState.mockReset();
    mocks.listDemoUsers.mockReset();
    mocks.listRecentForUser.mockReset();
    mocks.findMany.mockReset();
  });

  it("shows the session-required fallback when signed out", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const { default: ProfilePage } = await import("@/app/profile/page");
    const markup = renderToStaticMarkup(await ProfilePage());

    expect(markup).toContain("Session required");
    expect(markup).toContain("Return home");
  });

  it("renders trust state and connection summaries for a signed-in user", async () => {
    mocks.getCurrentUser.mockResolvedValue({
      id: "usr_dynamic",
      name: "Avery Collins",
      email: "avery@meshed.app",
      role: "operator",
      bio: "Portfolio operator",
      skills: [],
      sectors: [],
      linkedinUrl: null,
      walletAddress: "0x1234567890123456789012345678901234567890",
      worldVerified: true,
      dynamicUserId: "dyn_123",
      engagementScore: 0,
      reliabilityScore: 0,
      verificationBadges: ["wallet_connected", "world_verified"],
      outsideNetworkAccessEnabled: false,
      createdAt: "2025-01-01T00:00:00.000Z",
    });
    mocks.ensureDemoState.mockResolvedValue({
      pendingIncomingRequests: [
        {
          id: "req_1",
          requesterName: "Theo Mercer",
          message: "Let's connect on Meshed.",
        },
      ],
      connectedContactIds: ["usr_consultant_nina"],
      outgoingPendingContactIds: ["usr_operator_iris"],
    });
    mocks.findMany.mockResolvedValue([
      {
        id: "mem_1",
        relation: "owner",
        title: "Portfolio lead",
        company: {
          name: "MeshPay",
          sector: "Fintech",
          stage: "Series A",
        },
      },
    ]);
    mocks.listDemoUsers.mockResolvedValue([
      {
        id: "usr_consultant_nina",
        name: "Nina Volkov",
      },
      {
        id: "usr_operator_iris",
        name: "Iris Hale",
      },
    ]);
    mocks.listRecentForUser.mockResolvedValue([
      {
        id: "int_1",
        interactionType: "INTRO_ACCEPTED",
        actorUserId: "usr_dynamic",
        targetUserId: "usr_consultant_nina",
        authorizedByUserId: null,
        companyId: null,
        painPointTag: null,
        matchScore: null,
        verified: true,
        actorWorldVerified: true,
        actorWorldNullifier: "0xactor",
        actorVerificationLevel: null,
        targetWorldVerified: true,
        targetWorldNullifier: "0xtarget",
        targetVerificationLevel: null,
        rewardStatus: "REWARDABLE",
        transactionHash: null,
        metadata: null,
        createdAt: "2026-04-02T09:00:00.000Z",
        updatedAt: "2026-04-02T09:00:00.000Z",
      },
    ]);

    const { default: ProfilePage } = await import("@/app/profile/page");
    const markup = renderToStaticMarkup(await ProfilePage());

    expect(markup).toContain("Avery Collins");
    expect(markup).toContain("MeshPay");
    expect(markup).toContain("Nina Volkov");
    expect(markup).toContain("Theo Mercer");
    expect(markup).toContain("Recent verified interactions");
    expect(markup).toContain("LogoutButton");
  });
});
