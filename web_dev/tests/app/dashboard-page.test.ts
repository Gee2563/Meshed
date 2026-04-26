import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  loadDashboardData: vi.fn(),
  ensureDemoState: vi.fn(),
  listDemoUsers: vi.fn(),
  listNotificationsForUser: vi.fn(),
  syncForUser: vi.fn(),
  listRecentForUser: vi.fn(),
  findLatestByUserId: vi.fn(),
  findUnique: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock("@/lib/server/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/server/meshed-network/a16z-crypto-dashboard", () => ({
  loadDashboardData: mocks.loadDashboardData,
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

vi.mock("@/lib/server/services/linkedin-activity-service", () => ({
  linkedinActivityService: {
    listNotificationsForUser: mocks.listNotificationsForUser,
  },
}));

vi.mock("@/lib/server/services/agent-notification-service", () => ({
  agentNotificationService: {
    syncForUser: mocks.syncForUser,
  },
}));

vi.mock("@/lib/server/services/verified-interaction-service", () => ({
  verifiedInteractionService: {
    listRecentForUser: mocks.listRecentForUser,
  },
}));

vi.mock("@/lib/server/repositories/network-preparation-job-repository", () => ({
  networkPreparationJobRepository: {
    findLatestByUserId: mocks.findLatestByUserId,
  },
}));

vi.mock("@/lib/server/prisma", () => ({
  prisma: {
    onboardingProfile: {
      findUnique: mocks.findUnique,
    },
    company: {
      findUnique: mocks.findUnique,
    },
    companyMembership: {
      findMany: mocks.findMany,
    },
  },
}));

vi.mock("@/components/LogoutButton", () => ({
  LogoutButton: () => "LogoutButton",
}));

vi.mock("@/components/dashboard/CompanyNetworkGraph", () => ({
  CompanyNetworkGraph: () => "CompanyNetworkGraph",
}));

vi.mock("@/components/dashboard/ConnectionsPanel", () => ({
  ConnectionsPanel: () => "ConnectionsPanel",
}));

vi.mock("@/components/dashboard/AgentNotificationsPanel", () => ({
  AgentNotificationsPanel: () => "AgentNotificationsPanel",
}));

vi.mock("@/components/ui/Button", () => ({
  Button: (props: { children: React.ReactNode }) => props.children,
}));

describe("dashboard page", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
    mocks.getCurrentUser.mockReset();
    mocks.loadDashboardData.mockReset();
    mocks.ensureDemoState.mockReset();
    mocks.listDemoUsers.mockReset();
    mocks.listNotificationsForUser.mockReset();
    mocks.syncForUser.mockReset();
    mocks.listRecentForUser.mockReset();
    mocks.findLatestByUserId.mockReset();
    mocks.findUnique.mockReset();
    mocks.findMany.mockReset();
  });

  it("sends signed-out visitors back to the trust entrypoint", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    mocks.loadDashboardData.mockResolvedValue(null);

    const { default: DashboardPage } = await import("@/app/dashboard/page");
    const markup = renderToStaticMarkup(await DashboardPage());

    expect(markup).toContain("Session required");
    expect(markup).toContain("Return home");
    expect(markup).not.toContain("LogoutButton");
  });

  it("renders the dashboard for an authenticated user", async () => {
    mocks.getCurrentUser.mockResolvedValue({
      id: "usr_dynamic",
      name: "Avery Collins",
      email: "avery@a16z.com",
      role: "operator",
      bio: "Portfolio operator",
      skills: [],
      sectors: [],
      walletAddress: "0x1234567890123456789012345678901234567890",
      worldVerified: true,
      dynamicUserId: "dyn_123",
      engagementScore: 0,
      reliabilityScore: 0,
      verificationBadges: ["wallet_connected", "world_verified"],
      outsideNetworkAccessEnabled: false,
      createdAt: "2025-01-01T00:00:00.000Z",
    });
    mocks.loadDashboardData.mockResolvedValue({
      snapshot: {
        scope: "a16z-crypto",
        scope_label: "a16z crypto",
        company_count: 125,
        company_edge_count: 360,
        people_profile_count: 499,
        vertical_count: 103,
        people_count: 499,
        people_company_count: 125,
        people_edge_count: 1988,
        generated_via: "network_pipeline.similarity_scoring",
        top_companies: [
          {
            id: "co_1",
            company_name: "Battlebound",
            vertical: "Gaming",
            location_region: "United States",
            degree: 8,
            people_count: 6,
          },
        ],
        featured_people: [
          {
            id: "p_1",
            name: "Jordan Patel",
            company: "Battlebound",
            suggested_role: "mentor",
            current_pain_point_label: "Go-To-Market Execution",
            network_importance_score: 87,
            trust_signals: ["trusted_mentor"],
          },
        ],
      },
      strongestBridges: [
        {
          id: "edge_1",
          sourceName: "Battlebound",
          targetName: "Alchemy",
          score: 0.78,
          reason: "shared current pain points",
          explanation: "Shared current pain points: Go-To-Market Execution.",
        },
      ],
      topVerticals: [
        {
          vertical: "Gaming",
          color: "#0f766e",
          count: 12,
        },
      ],
      companyGraph: {
        nodes: [
          {
            id: "co_1",
            companyId: "co_1",
            companyName: "Battlebound",
            vertical: "Gaming",
            stage: "Series A",
            location: "Los Angeles, California, USA",
            locationRegion: "United States",
            website: "https://battlebound.example",
            flexpointLogoUrl: null,
            flexpointLogoPath: null,
            degree: 8,
            peopleCount: 6,
            colorHex: "#0f766e",
            size: 28,
            currentPainPointTags: ["hiring"],
            resolvedPainPointTags: ["gtm"],
            peoplePainPointOverview: "Current: Hiring Bottlenecks (2)",
            peopleConnectionSummary: "Shared GTM support routes.",
            peopleTrustSignalOverview: "Trusted Mentor (1)",
            partners: [],
            latestNews: [],
            people: [
              {
                id: "p_1",
                name: "Jordan Patel",
                company: "Battlebound",
                suggestedRole: "mentor",
                currentPainPointLabel: "Go-To-Market Execution",
                resolvedPainPointsLabel: "Hiring Bottlenecks",
                contact: "jordan@battlebound.example",
                linkedinUrl: "https://www.linkedin.com/in/jordan-patel-1",
                networkImportanceScore: 87,
                engagementScore: 95,
                reliabilityScore: 93,
                trustSignals: ["trusted_mentor"],
                relationshipSummary: ["Worked across 3 portfolio teams"],
                connectionSummary: "Shared GTM support routes.",
                location: "Los Angeles, California, USA",
                vertical: "Gaming",
                stage: "Series A",
              },
            ],
          },
        ],
        edges: [
          {
            id: "edge_1",
            sourceId: "co_1",
            targetId: "co_2",
            sourceName: "Battlebound",
            targetName: "Alchemy",
            score: 0.78,
            reason: "shared current pain points",
            explanation: "Shared current pain points: Go-To-Market Execution.",
            color: "#16a34a",
            width: 2.5,
          },
        ],
      },
    });
    mocks.ensureDemoState.mockResolvedValue({
      pendingIncomingRequests: [],
      connectedContactIds: ["usr_mentor_theo"],
      outgoingPendingContactIds: ["usr_operator_iris"],
    });
    mocks.listDemoUsers.mockResolvedValue([
      {
        id: "usr_mentor_theo",
        name: "Theo Mercer",
        email: "theo@signalstack.example",
        role: "mentor",
        bio: "",
        skills: ["Partnerships"],
        sectors: ["fintech"],
        linkedinUrl: "https://www.linkedin.com/in/theo-mercer",
        walletAddress: null,
        worldVerified: true,
        dynamicUserId: null,
        engagementScore: 88,
        reliabilityScore: 91,
        verificationBadges: ["world_verified"],
        outsideNetworkAccessEnabled: false,
        createdAt: "2025-01-01T00:00:00.000Z",
      },
      {
        id: "usr_operator_iris",
        name: "Iris Hale",
        email: "iris@orbitflow.example",
        role: "operator",
        bio: "",
        skills: ["Operations"],
        sectors: ["infra"],
        linkedinUrl: "https://www.linkedin.com/in/iris-hale",
        walletAddress: null,
        worldVerified: true,
        dynamicUserId: null,
        engagementScore: 82,
        reliabilityScore: 86,
        verificationBadges: ["world_verified"],
        outsideNetworkAccessEnabled: false,
        createdAt: "2025-01-01T00:00:00.000Z",
      },
    ]);
    mocks.listNotificationsForUser.mockResolvedValue([]);
    mocks.syncForUser.mockResolvedValue([]);
    mocks.listRecentForUser.mockResolvedValue([]);
    mocks.findLatestByUserId.mockResolvedValue(null);
    mocks.findUnique.mockResolvedValue(null);
    mocks.findMany
      .mockResolvedValueOnce([
        {
          id: "mem_current",
          userId: "usr_dynamic",
          company: {
            id: "co_current",
            name: "Rho Ventures",
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "mem_1",
          userId: "usr_mentor_theo",
          company: {
            id: "co_signalstack",
            name: "SignalStack",
          },
        },
        {
          id: "mem_2",
          userId: "usr_operator_iris",
          company: {
            id: "co_orbitflow",
            name: "OrbitFlow",
          },
        },
      ]);

    const { default: DashboardPage } = await import("@/app/dashboard/page");
    const markup = renderToStaticMarkup(await DashboardPage());

    expect(markup).toContain("Welcome to your a16z meshed network");
    expect(markup).toContain("a16z&#x27;s Meshed Network Interactive Graph");
    expect(markup).toContain("CompanyNetworkGraph");
    expect(markup).toContain("Meshed people connections");
    expect(markup).toContain("AgentNotificationsPanel");
    expect(markup).toContain("ConnectionsPanel");
    expect(markup).toContain("Trusted coordination starts with a verified human");
  });
});
