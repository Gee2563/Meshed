import { hashSignal, signRequest } from "@worldcoin/idkit-core";
import type { z } from "zod";

import { env } from "@/lib/config/env";
import { ApiError } from "@/lib/server/http";
import { userRepository } from "@/lib/server/repositories/user-repository";
import { worldVerifySchema } from "@/lib/server/validation/auth-schemas";
import type { UserSummary } from "@/lib/types";

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

type WorldVerifyPayload = z.infer<typeof worldVerifySchema>;

type WorldVerifyApiResponse = {
  success?: boolean;
  message?: string;
  environment?: string;
  results?: Array<{
    identifier?: string;
    success?: boolean;
    nullifier?: string;
    code?: string;
    detail?: string;
  }>;
} | null;

const WORLD_VERIFY_API_BASE_URL = "https://developer.world.org/api/v4/verify";

function normalizeHex(value: string) {
  return value.trim().toLowerCase();
}

function requireMatchingSignal(
  user: Pick<UserSummary, "id" | "walletAddress">,
  payload: WorldVerifyPayload,
) {
  const signalHashes = payload.responses
    .map((response) => ("signal_hash" in response && typeof response.signal_hash === "string" ? response.signal_hash : null))
    .filter((value): value is string => Boolean(value));

  if (signalHashes.length === 0) {
    throw new ApiError(400, "World verification response did not include a signal hash.");
  }

  const expectedSignal = user.walletAddress ?? user.id;
  const expectedSignalHash = normalizeHex(hashSignal(expectedSignal));
  const matchesCurrentUser = signalHashes.some((signalHash) => normalizeHex(signalHash) === expectedSignalHash);

  if (!matchesCurrentUser) {
    throw new ApiError(400, "World verification signal did not match the current user.");
  }
}

function requireRpSigningKey() {
  if (!env.WORLD_RP_SIGNING_KEY) {
    throw new ApiError(503, "World RP signing key is not configured.");
  }

  return env.WORLD_RP_SIGNING_KEY;
}

function requireRpId() {
  if (!env.WORLD_RP_ID) {
    throw new ApiError(503, "World RP ID is not configured.");
  }

  return env.WORLD_RP_ID;
}

export const worldVerificationService = {
  createRpSignature(action: string) {
    const signature = signRequest({
      signingKeyHex: requireRpSigningKey(),
      action,
    });

    return {
      sig: signature.sig,
      nonce: signature.nonce,
      created_at: signature.createdAt,
      expires_at: signature.expiresAt,
    };
  },

  async verifyUser(
    user: Pick<UserSummary, "id" | "walletAddress" | "worldVerified">,
    payload: WorldVerifyPayload,
    input: {
      fetch?: FetchLike;
    } = {},
  ) {
    if (user.worldVerified) {
      return {
        user,
        verification: {
          success: true,
          message: "World verification already recorded.",
          environment: payload.environment,
        },
      };
    }

    requireMatchingSignal(user, payload);

    const fetcher = input.fetch ?? fetch;
    const response = await fetcher(`${WORLD_VERIFY_API_BASE_URL}/${requireRpId()}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const verification = (await response.json().catch(() => null)) as WorldVerifyApiResponse;
    if (!response.ok) {
      throw new ApiError(response.status >= 500 ? 502 : 400, verification?.message ?? "World verification failed.", verification);
    }

    if (!verification?.success) {
      throw new ApiError(400, verification?.message ?? "World verification failed.", verification);
    }

    // Keep this slice minimal: verify with World, then only flip the local user flag.
    const updatedUser = await userRepository.markWorldVerified(user.id);

    return {
      user: updatedUser,
      verification,
    };
  },
};
