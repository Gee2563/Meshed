import { IDKit, orbLegacy } from "@worldcoin/idkit-core";

import { clientEnv } from "@/lib/config/env";

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

type RpSignatureResponseBody = {
  sig?: string;
  nonce?: string;
  created_at?: number;
  expires_at?: number;
  error?: string;
} | null;

type WorldVerifyResponseBody = {
  ok?: boolean;
  error?: string;
  data?: {
    user?: {
      id?: string;
      worldVerified?: boolean;
    };
    verification?: {
      success?: boolean;
      message?: string;
      environment?: string;
    };
  } | null;
} | null;

type WorldIdKitCompletionResult =
  | {
      success: true;
      result: unknown;
    }
  | {
      success: false;
      error: string;
    };

function formatWorldErrorCode(code: string) {
  return code.replaceAll("_", " ");
}

function normalizeAppOrigin(appUrl: string) {
  return appUrl.endsWith("/") ? appUrl.slice(0, -1) : appUrl;
}

function ensureWorldClientConfig() {
  if (!clientEnv.worldAppId || !clientEnv.worldRpId) {
    throw new Error("World ID staging is not configured for this environment.");
  }

  if (clientEnv.useMockWorld) {
    throw new Error("World ID staging is disabled while mock mode is enabled.");
  }

  return {
    worldAppId: clientEnv.worldAppId,
    worldRpId: clientEnv.worldRpId,
    worldAction: clientEnv.worldAction,
    worldEnvironment: clientEnv.worldEnvironment,
    returnTo: `${normalizeAppOrigin(clientEnv.appUrl)}/human-idv`,
  };
}

export async function runWorldVerification(
  input: {
    signal: string;
    fetch?: FetchLike;
  },
) {
  const worldConfig = ensureWorldClientConfig();
  const fetcher = input.fetch ?? fetch;

  const rpSignatureResponse = await fetcher("/api/rp-signature", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: worldConfig.worldAction,
    }),
  });

  const rpSignature = (await rpSignatureResponse.json().catch(() => null)) as RpSignatureResponseBody;
  if (
    !rpSignatureResponse.ok ||
    !rpSignature?.sig ||
    !rpSignature.nonce ||
    typeof rpSignature.created_at !== "number" ||
    typeof rpSignature.expires_at !== "number"
  ) {
    throw new Error(rpSignature?.error ?? "Unable to start World ID verification.");
  }

  const requestBuilder = await IDKit.request({
    app_id: worldConfig.worldAppId as `app_${string}`,
    action: worldConfig.worldAction,
    rp_context: {
      rp_id: worldConfig.worldRpId,
      nonce: rpSignature.nonce,
      created_at: rpSignature.created_at,
      expires_at: rpSignature.expires_at,
      signature: rpSignature.sig,
    },
    allow_legacy_proofs: true,
    environment: worldConfig.worldEnvironment,
    return_to: worldConfig.returnTo,
  });
  const request = await requestBuilder.preset(orbLegacy({ signal: input.signal }));

  const result = (await request.pollUntilCompletion()) as WorldIdKitCompletionResult;
  if (!result.success) {
    throw new Error(`World ID verification did not complete (${formatWorldErrorCode(result.error)}).`);
  }

  const verifyResponse = await fetcher("/api/auth/world/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(result.result),
  });

  const verification = (await verifyResponse.json().catch(() => null)) as WorldVerifyResponseBody;
  if (!verifyResponse.ok || !verification?.ok) {
    throw new Error(verification?.error ?? "Unable to store World ID verification.");
  }

  return verification.data;
}
