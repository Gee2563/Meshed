import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BadgeKey } from "@/lib/types";

function createInput() {
  return {
    requester: {
      id: "usr_requester",
      name: "Nina Volkov",
      email: "nina@northmesh.io",
      role: "consultant" as const,
      bio: "",
      skills: [],
      sectors: [],
      walletAddress: "0x2222222222222222222222222222222222222222",
      worldVerified: true,
      engagementScore: 0,
      reliabilityScore: 0,
      verificationBadges: ["world_verified", "wallet_connected"] as BadgeKey[],
      createdAt: "2026-04-01T09:00:00.000Z",
    },
    recipient: {
      id: "usr_recipient",
      name: "Maya Sterling",
      email: "maya@northstar.vc",
      role: "company" as const,
      bio: "",
      skills: [],
      sectors: [],
      walletAddress: "0x3333333333333333333333333333333333333333",
      worldVerified: true,
      engagementScore: 0,
      reliabilityScore: 0,
      verificationBadges: ["world_verified", "wallet_connected"] as BadgeKey[],
      createdAt: "2026-04-01T09:00:00.000Z",
    },
    request: {
      id: "req_1",
      requesterUserId: "usr_requester",
      recipientUserId: "usr_recipient",
      requesterName: "Nina Volkov",
      requesterRole: "consultant" as const,
      requesterCompany: "NorthMesh",
      requesterContact: "nina@northmesh.io",
      requesterLinkedinUrl: "https://www.linkedin.com/in/nina-volkov-meshed",
      type: "consulting" as const,
      status: "pending" as const,
      message: "Let's formalize this connection on Meshed.",
      createdAt: "2026-04-01T09:00:00.000Z",
    },
  };
}

describe("connection contract service", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns a deterministic mock contract deployment while mock flare is enabled", async () => {
    vi.doMock("@/lib/config/env", () => ({
      env: {
        USE_MOCK_FLARE: true,
      },
    }));

    const { deployConnectionAgreement } = await import("@/lib/server/services/connection-contract-service");
    const result = await deployConnectionAgreement(createInput());

    expect(result).toEqual({
      contractAddress: expect.stringMatching(/^0x[a-f0-9]{40}$/),
      network: "flare-coston2",
      generationMode: "MOCK",
      metadata: {
        mode: "mock",
      },
    });
  });

  it("deploys the live ConnectionAgreement contract when Flare is configured", async () => {
    vi.doMock("@/lib/config/env", () => ({
      env: {
        USE_MOCK_FLARE: false,
        FLARE_RPC_URL: "https://coston2.example",
        PRIVATE_KEY: "0x1234",
        FLARE_CHAIN_ID: 114,
      },
    }));
    vi.doMock("node:fs/promises", () => ({
      readFile: vi.fn(async () => JSON.stringify({ abi: [], bytecode: "0x6000" })),
    }));
    vi.doMock("ethers", () => ({
      ContractFactory: class {
        async deploy() {
          return {
            waitForDeployment: async () => undefined,
            getAddress: async () => "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            deploymentTransaction: () => ({ hash: "0xflaretx" }),
          };
        }
      },
      JsonRpcProvider: class {
        constructor(_url: string, _chainId: number) {}
      },
      Wallet: class {
        address = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
        constructor(_pk: string, _provider: unknown) {}
      },
      isAddress: () => true,
    }));

    const { deployConnectionAgreement } = await import("@/lib/server/services/connection-contract-service");
    const result = await deployConnectionAgreement(createInput());

    expect(result).toEqual({
      contractAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      network: "flare-coston2",
      generationMode: "REAL",
      transactionHash: "0xflaretx",
      metadata: {
        chainId: 114,
        deployerAddress: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        requesterWallet: "0x2222222222222222222222222222222222222222",
        recipientWallet: "0x3333333333333333333333333333333333333333",
        requestType: "consulting",
      },
    });
  });
});
