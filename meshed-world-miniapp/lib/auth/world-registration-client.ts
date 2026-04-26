"use client";

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

type WorldRegisterResponseBody = {
  ok?: boolean;
  error?: string;
  data?: {
    nextRoute?: string | null;
  } | null;
} | null;

export async function registerWorldMeshedAccount(
  payload: {
    name: string;
    email?: string | null;
    role: "investor" | "founder" | "employee";
    verification: unknown;
  },
  input: {
    fetch?: FetchLike;
  } = {},
) {
  const fetcher = input.fetch ?? fetch;
  const response = await fetcher("/api/auth/world/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = (await response.json().catch(() => null)) as WorldRegisterResponseBody;
  if (!response.ok || !body?.ok) {
    throw new Error(body?.error ?? "Unable to register your Meshed account with World ID.");
  }

  return {
    nextRoute: body.data?.nextRoute === "/agent" ? "/agent" : "/agent",
  };
}
