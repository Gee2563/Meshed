"use client";

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

type WalletAuthNonceResponseBody = {
  ok?: boolean;
  error?: string;
  data?: {
    nonce?: string;
    statement?: string;
    requestId?: string;
    expirationTime?: string;
  } | null;
} | null;

type WalletAuthVerifyResponseBody = {
  ok?: boolean;
  error?: string;
  data?: {
    user?: {
      id?: string;
      walletAddress?: string | null;
    };
  } | null;
} | null;

export async function requestWorldWalletAuthNonce(input: { fetch?: FetchLike } = {}) {
  const fetcher = input.fetch ?? fetch;
  const response = await fetcher("/api/auth/world/wallet-auth/nonce", {
    method: "POST",
  });
  const body = (await response.json().catch(() => null)) as WalletAuthNonceResponseBody;

  if (!response.ok || !body?.ok || !body.data?.nonce || !body.data.statement || !body.data.requestId) {
    throw new Error(body?.error ?? "Unable to start World wallet authentication.");
  }

  return {
    nonce: body.data.nonce,
    statement: body.data.statement,
    requestId: body.data.requestId,
    expirationTime: body.data.expirationTime ? new Date(body.data.expirationTime) : undefined,
  };
}

export async function submitWorldWalletAuthResult(
  payload: {
    address: string;
    message: string;
    signature: string;
  },
  input: { fetch?: FetchLike } = {},
) {
  const fetcher = input.fetch ?? fetch;
  const response = await fetcher("/api/auth/world/wallet-auth/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body = (await response.json().catch(() => null)) as WalletAuthVerifyResponseBody;

  if (!response.ok || !body?.ok) {
    throw new Error(body?.error ?? "Unable to connect this World wallet to Meshed.");
  }

  return body.data;
}
