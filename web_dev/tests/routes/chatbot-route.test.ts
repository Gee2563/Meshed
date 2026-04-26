import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  readFile: vi.fn(),
  requireCurrentUser: vi.fn(),
  getState: vi.fn(),
  listRecentForUser: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
  readFile: mocks.readFile,
}));

vi.mock("@/lib/server/current-user", () => ({
  requireCurrentUser: mocks.requireCurrentUser,
}));

vi.mock("@/lib/server/services/onboarding-service", () => ({
  onboardingService: {
    getState: mocks.getState,
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

vi.mock("@/lib/server/services/meshed-founder-agent-service", async () => {
  const actual = await vi.importActual<typeof import("@/lib/server/services/meshed-founder-agent-service")>(
    "@/lib/server/services/meshed-founder-agent-service",
  );

  return {
    ...actual,
    meshedFounderAgentService: {
      isAvailable: () => false,
    },
  };
});

describe("POST /api/chatbot", () => {
  beforeEach(() => {
    mocks.readFile.mockReset();
    mocks.requireCurrentUser.mockReset();
    mocks.getState.mockReset();
    mocks.listRecentForUser.mockReset();
    mocks.findMany.mockReset();

    mocks.requireCurrentUser.mockResolvedValue({
      id: "usr_world",
      name: "George Morris",
      email: "george@example.com",
      role: "operator",
      bio: "",
      skills: [],
      sectors: [],
      worldVerified: true,
      verificationBadges: ["world_verified"],
      outsideNetworkAccessEnabled: false,
    });
    mocks.getState.mockResolvedValue({
      vcCompany: {
        name: "Flexpoint Ford",
        website: "https://flexpointford.com",
      },
    });
    mocks.listRecentForUser.mockResolvedValue([]);
    mocks.findMany.mockResolvedValue([]);
    mocks.readFile.mockImplementation(async (pathLike: string) => {
      if (pathLike.endsWith("people_network_data.json")) {
        return JSON.stringify({ nodes: [] });
      }

      return JSON.stringify({ nodes: [], edges: [] });
    });
  });

  it("uses the onboarding VC scope instead of the email fallback so graph highlights stay aligned with the live dashboard", async () => {
    const { POST } = await import("@/app/api/chatbot/route");
    const response = await POST(
      new Request("http://localhost/api/chatbot", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          query: "Who should I meet this week?",
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        ok: true,
        data: expect.objectContaining({
          scope: "flexpoint-ford",
          scopeLabel: "Flexpoint Ford",
        }),
      }),
    );
  });
});
