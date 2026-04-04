import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/server/http";

const mocks = vi.hoisted(() => ({
  reserveAndMarkVerified: vi.fn(),
  ensureWorldVerifiedContract: vi.fn(),
  signRequest: vi.fn(),
  hashSignal: vi.fn(),
}));

vi.mock("@/lib/config/env", () => ({
  env: {
    WORLD_RP_ID: "rp_staging_456",
    WORLD_RP_SIGNING_KEY: "1".repeat(64),
  },
}));

vi.mock("@/lib/server/repositories/world-verification-nullifier-repository", () => ({
  worldVerificationNullifierRepository: {
    reserveAndMarkVerified: mocks.reserveAndMarkVerified,
  },
}));

vi.mock("@/lib/server/services/world-onboarding-contract-service", () => ({
  worldOnboardingContractService: {
    ensureWorldVerifiedContract: mocks.ensureWorldVerifiedContract,
  },
}));

vi.mock("@worldcoin/idkit-core", () => ({
  signRequest: mocks.signRequest,
  hashSignal: mocks.hashSignal,
}));

describe("worldVerificationService", () => {
  beforeEach(() => {
    mocks.reserveAndMarkVerified.mockReset();
    mocks.ensureWorldVerifiedContract.mockReset();
    mocks.signRequest.mockReset();
    mocks.hashSignal.mockReset();
    mocks.hashSignal.mockImplementation((value: string) => {
      if (value === "usr_world") {
        return "0xuseridhash";
      }

      if (value === "0x1234567890") {
        return "0xwallethash";
      }

      return "0xsomeoneelse";
    });
  });

  it("creates an RP signature using the configured signing key", async () => {
    mocks.signRequest.mockReturnValue({
      sig: "0xsig",
      nonce: "0xnonce",
      createdAt: 111,
      expiresAt: 222,
    });

    const { worldVerificationService } = await import("@/lib/server/services/world-verification-service");
    const result = worldVerificationService.createRpSignature("meshed-network-access");

    expect(mocks.signRequest).toHaveBeenCalledWith({
      signingKeyHex: "1".repeat(64),
      action: "meshed-network-access",
    });
    expect(result).toEqual({
      sig: "0xsig",
      nonce: "0xnonce",
      created_at: 111,
      expires_at: 222,
    });
  });

  it("rejects proofs whose signal hash does not match the current Meshed user", async () => {
    const fetchMock = vi.fn();

    const { worldVerificationService } = await import("@/lib/server/services/world-verification-service");

    await expect(
      worldVerificationService.verifyUser(
        {
          id: "usr_world",
          walletAddress: "0x1234567890",
          worldVerified: false,
        },
        {
          protocol_version: "3.0",
          nonce: "0xnonce",
          action: "meshed-network-access",
          environment: "staging",
          responses: [
            {
              identifier: "orb",
              signal_hash: "0xsomeone_else",
            },
          ],
        },
        {
          fetch: fetchMock,
        },
      ),
    ).rejects.toMatchObject({
      status: 400,
      message: "World verification signal did not match the current user.",
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(mocks.reserveAndMarkVerified).not.toHaveBeenCalled();
    expect(mocks.ensureWorldVerifiedContract).not.toHaveBeenCalled();
  });

  it("verifies the proof remotely and reserves the World replay key before marking the user", async () => {
    mocks.reserveAndMarkVerified.mockResolvedValue({
      id: "usr_world",
      worldVerified: true,
    });
    mocks.ensureWorldVerifiedContract.mockResolvedValue({
      id: "con_world",
      contractStep: "world_verified",
    });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          environment: "staging",
          message: "Verified",
          nullifier: "0xverifiednullifier",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );

    const { worldVerificationService } = await import("@/lib/server/services/world-verification-service");
    const result = await worldVerificationService.verifyUser(
      {
        id: "usr_world",
        walletAddress: "0x1234567890",
        worldVerified: false,
      },
      {
        protocol_version: "3.0",
        nonce: "0xnonce",
        action: "meshed-network-access",
        environment: "staging",
        responses: [
          {
            identifier: "orb",
            signal_hash: "0xuseridhash",
            nullifier: "0xpayloadnullifier",
          },
        ],
      },
      {
        fetch: fetchMock,
      },
    );

    expect(fetchMock).toHaveBeenCalledWith("https://developer.world.org/api/v4/verify/rp_staging_456", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "Meshed/0.1 (world-id verification)",
      },
      body: JSON.stringify({
        protocol_version: "3.0",
        nonce: "0xnonce",
        action: "meshed-network-access",
        environment: "staging",
        responses: [
          {
            identifier: "orb",
            signal_hash: "0xuseridhash",
            nullifier: "0xpayloadnullifier",
          },
        ],
      }),
    });
    expect(mocks.reserveAndMarkVerified).toHaveBeenCalledWith({
      userId: "usr_world",
      action: "meshed-network-access",
      nullifier: "0xverifiednullifier",
    });
    expect(mocks.ensureWorldVerifiedContract).toHaveBeenCalledWith({
      id: "usr_world",
      worldVerified: true,
    });
    expect(result).toEqual({
      user: {
        id: "usr_world",
        worldVerified: true,
      },
      verification: {
        success: true,
        environment: "staging",
        message: "Verified",
        nullifier: "0xverifiednullifier",
      },
    });
  });

  it("surfaces a conflict when the World nullifier was already reserved for this action", async () => {
    mocks.reserveAndMarkVerified.mockRejectedValue(
      new ApiError(409, "World verification for this action was already used."),
    );
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          environment: "staging",
          message: "Verified",
          nullifier: "0xverifiednullifier",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );

    const { worldVerificationService } = await import("@/lib/server/services/world-verification-service");

    await expect(
      worldVerificationService.verifyUser(
        {
          id: "usr_world",
          walletAddress: "0x1234567890",
          worldVerified: false,
        },
        {
          protocol_version: "3.0",
          nonce: "0xnonce",
          action: "meshed-network-access",
          environment: "staging",
        responses: [
          {
            identifier: "orb",
            signal_hash: "0xuseridhash",
            nullifier: "0xpayloadnullifier",
          },
        ],
        },
        {
          fetch: fetchMock,
        },
      ),
    ).rejects.toMatchObject({
      status: 409,
      message: "World verification for this action was already used.",
    });

    expect(mocks.ensureWorldVerifiedContract).not.toHaveBeenCalled();
  });

  it("accepts a linked wallet hash during the transition to user-id-based signals", async () => {
    mocks.reserveAndMarkVerified.mockResolvedValue({
      id: "usr_world",
      worldVerified: true,
    });
    mocks.ensureWorldVerifiedContract.mockResolvedValue({
      id: "con_world",
      contractStep: "world_verified",
    });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          environment: "staging",
          message: "Verified",
          nullifier: "0xverifiednullifier",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );

    const { worldVerificationService } = await import("@/lib/server/services/world-verification-service");
    const result = await worldVerificationService.verifyUser(
      {
        id: "usr_world",
        walletAddress: "0x1234567890",
        worldVerified: false,
      },
      {
        protocol_version: "3.0",
        nonce: "0xnonce",
        action: "meshed-network-access",
        environment: "staging",
        responses: [
          {
            identifier: "orb",
            signal_hash: "0xwallethash",
            nullifier: "0xpayloadnullifier",
          },
        ],
      },
      {
        fetch: fetchMock,
      },
    );

    expect(result).toEqual({
      user: {
        id: "usr_world",
        worldVerified: true,
      },
      verification: {
        success: true,
        environment: "staging",
        message: "Verified",
        nullifier: "0xverifiednullifier",
      },
    });
    expect(mocks.ensureWorldVerifiedContract).toHaveBeenCalledWith({
      id: "usr_world",
      worldVerified: true,
    });
  });
});
