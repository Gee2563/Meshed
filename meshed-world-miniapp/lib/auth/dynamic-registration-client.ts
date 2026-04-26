import type { DynamicNextRoute } from "@/lib/auth/invitation-access";
import {
  type DynamicRegistrationPayload,
  normalizeDynamicNextRoute,
} from "@/lib/auth/dynamic-onboarding";

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

type DynamicRegisterResponseBody = {
  ok?: boolean;
  error?: string;
  data?: {
    nextRoute?: string | null;
  } | null;
} | null;

export type DynamicRegistrationSyncResult = {
  nextRoute: DynamicNextRoute;
};

export async function registerDynamicMeshedAccount(
  payload: DynamicRegistrationPayload,
  input: {
    fetch?: FetchLike;
  } = {},
): Promise<DynamicRegistrationSyncResult> {
  const fetcher = input.fetch ?? fetch;
  const response = await fetcher("/api/auth/dynamic/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = (await response.json().catch(() => null)) as DynamicRegisterResponseBody;
  if (!response.ok || !body?.ok) {
    throw new Error(body?.error ?? "Unable to register your Meshed account.");
  }

  return {
    nextRoute: normalizeDynamicNextRoute(body.data?.nextRoute),
  };
}
