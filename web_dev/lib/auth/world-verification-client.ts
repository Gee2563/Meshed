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

type WorldVerificationResultData = {
  user?: {
    id?: string;
    worldVerified?: boolean;
  };
  verification?: {
    success?: boolean;
    message?: string;
    environment?: string;
  };
};

type WorldVerifyResponseBody = {
  ok?: boolean;
  error?: string;
  detail?: {
    message?: string;
    code?: string;
    results?: Array<{
      identifier?: string;
      code?: string;
      detail?: string;
    }>;
  } | null;
  data?: WorldVerificationResultData | null;
} | null;

export type WorldRpSignature = {
  sig: string;
  nonce: string;
  created_at: number;
  expires_at: number;
};

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

function formatWorldServerErrorCode(code: string) {
  return code.replaceAll("_", " ");
}

function extractWorldVerificationFailureMessage(body: WorldVerifyResponseBody) {
  const resultDetail = body?.detail?.results?.find((result) => typeof result.detail === "string" && result.detail.length > 0)?.detail;
  if (resultDetail) {
    return resultDetail;
  }

  const detailMessage = body?.detail?.message;
  if (detailMessage) {
    return detailMessage;
  }

  const detailCode = body?.detail?.results?.find((result) => typeof result.code === "string" && result.code.length > 0)?.code ?? body?.detail?.code;
  if (detailCode) {
    return `World verification failed (${formatWorldServerErrorCode(detailCode)}).`;
  }

  return body?.error ?? "Unable to store World ID verification.";
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
    returnTo: `${normalizeAppOrigin(clientEnv.appUrl)}/agent`,
  };
}

export async function runWorldVerification(
  input: {
    signal: string;
    action?: string;
    fetch?: FetchLike;
    onConnectorReady?: (connectorUri: string) => void | Promise<void>;
  },
) {
  const worldConfig = ensureWorldClientConfig();
  const action = input.action ?? worldConfig.worldAction;
  const fetcher = input.fetch ?? fetch;
  const rpSignature = await requestWorldRpSignature(action, { fetch: fetcher });

  const requestBuilder = await IDKit.request({
    app_id: worldConfig.worldAppId as `app_${string}`,
    action,
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
  await input.onConnectorReady?.(request.connectorURI);

  const result = (await request.pollUntilCompletion()) as WorldIdKitCompletionResult;
  if (!result.success) {
    throw new Error(`World ID verification did not complete (${formatWorldErrorCode(result.error)}).`);
  }

  return submitWorldVerificationResult(result.result, { fetch: fetcher });
}

export async function requestWorldRpSignature(
  action: string,
  input: {
    fetch?: FetchLike;
  } = {},
): Promise<WorldRpSignature> {
  const fetcher = input.fetch ?? fetch;
  const response = await fetcher("/api/rp-signature", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action,
    }),
  });

  const body = (await response.json().catch(() => null)) as RpSignatureResponseBody;
  if (!response.ok || !body?.sig || !body.nonce || typeof body.created_at !== "number" || typeof body.expires_at !== "number") {
    throw new Error(body?.error ?? "Unable to start World ID verification.");
  }

  return {
    sig: body.sig,
    nonce: body.nonce,
    created_at: body.created_at,
    expires_at: body.expires_at,
  };
}

export async function submitWorldVerificationResult(
  result: unknown,
  input: {
    fetch?: FetchLike;
  } = {},
): Promise<WorldVerificationResultData> {
  const fetcher = input.fetch ?? fetch;
  const response = await fetcher("/api/auth/world/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(result),
  });

  const verification = (await response.json().catch(() => null)) as WorldVerifyResponseBody;
  if (!response.ok || !verification?.ok) {
    throw new Error(extractWorldVerificationFailureMessage(verification));
  }

  if (!verification.data) {
    throw new Error("World verification response did not include result data.");
  }

  return verification.data;
}
