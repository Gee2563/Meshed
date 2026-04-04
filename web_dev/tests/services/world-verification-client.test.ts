import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  idkitRequest: vi.fn(),
  orbLegacy: vi.fn(),
}));

vi.mock("@/lib/config/env", () => ({
  clientEnv: {
    worldAppId: "app_staging_123",
    worldRpId: "rp_staging_456",
    worldEnvironment: "staging",
    worldAction: "meshed-network-access",
    useMockWorld: false,
    appUrl: "http://localhost:3000",
  },
}));

vi.mock("@worldcoin/idkit-core", () => ({
  IDKit: {
    request: mocks.idkitRequest,
  },
  orbLegacy: mocks.orbLegacy,
}));

describe("runWorldVerification", () => {
  beforeEach(() => {
    mocks.idkitRequest.mockReset();
    mocks.orbLegacy.mockReset();
    mocks.orbLegacy.mockImplementation(({ signal }: { signal: string }) => ({
      type: "OrbLegacy",
      signal,
    }));
  });

  it("requests an RP signature, launches the staging connector flow, and forwards the IDKit result untouched", async () => {
    const idkitResult = {
      protocol_version: "3.0",
      nonce: "0xnonce",
      action: "meshed-network-access",
      environment: "staging",
      responses: [
        {
          identifier: "orb",
          proof: "0xproof",
          merkle_root: "0xroot",
          nullifier: "0xnullifier",
        },
      ],
    };
    const preset = vi.fn().mockReturnValue({
      connectorURI: "world://connector",
      pollUntilCompletion: vi.fn().mockResolvedValue({
        success: true,
        result: idkitResult,
      }),
    });
    mocks.idkitRequest.mockResolvedValue({ preset });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            sig: "0xsig",
            nonce: "0xnonce",
            created_at: 111,
            expires_at: 222,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            data: {
              user: {
                id: "usr_world",
                worldVerified: true,
              },
              verification: {
                success: true,
                environment: "staging",
                message: "Verified",
              },
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    const onConnectorReady = vi.fn();

    const { runWorldVerification } = await import("@/lib/auth/world-verification-client");
    const result = await runWorldVerification({
      signal: "0x1234567890",
      fetch: fetchMock,
      onConnectorReady,
    });

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/rp-signature", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "meshed-network-access",
      }),
    });
    expect(mocks.idkitRequest).toHaveBeenCalledWith({
      app_id: "app_staging_123",
      action: "meshed-network-access",
      rp_context: {
        rp_id: "rp_staging_456",
        nonce: "0xnonce",
        created_at: 111,
        expires_at: 222,
        signature: "0xsig",
      },
      allow_legacy_proofs: true,
      environment: "staging",
      return_to: "http://localhost:3000/human-idv",
    });
    expect(mocks.orbLegacy).toHaveBeenCalledWith({
      signal: "0x1234567890",
    });
    expect(preset).toHaveBeenCalledWith({
      type: "OrbLegacy",
      signal: "0x1234567890",
    });
    expect(onConnectorReady).toHaveBeenCalledWith("world://connector");
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/auth/world/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(idkitResult),
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
      },
    });
  });

  it("surfaces a useful error when the World connector flow is not completed", async () => {
    const preset = vi.fn().mockReturnValue({
      connectorURI: "world://connector",
      pollUntilCompletion: vi.fn().mockResolvedValue({
        success: false,
        error: "user_rejected",
      }),
    });
    mocks.idkitRequest.mockResolvedValue({ preset });

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          sig: "0xsig",
          nonce: "0xnonce",
          created_at: 111,
          expires_at: 222,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const { runWorldVerification } = await import("@/lib/auth/world-verification-client");

    await expect(
      runWorldVerification({
        signal: "0x1234567890",
        fetch: fetchMock,
      }),
    ).rejects.toThrow("World ID verification did not complete (user rejected).");

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("surfaces the detailed backend verification error when the host-app verification fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: false,
          error: "World verification failed.",
          detail: {
            message: "Action is inactive for this app.",
          },
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      ),
    );

    const { submitWorldVerificationResult } = await import("@/lib/auth/world-verification-client");

    await expect(
      submitWorldVerificationResult(
        {
          protocol_version: "3.0",
          nonce: "0xnonce",
          action: "test-action",
          environment: "staging",
          responses: [{ identifier: "orb" }],
        },
        { fetch: fetchMock },
      ),
    ).rejects.toThrow("Action is inactive for this app.");
  });
});
