import type { DynamicNextRoute } from "@/lib/auth/invitation-access";

// Translate Dynamic's user shape into the stricter payload and route values Meshed expects.
type DynamicUserLike = {
  userId?: string | null;
  lastVerifiedCredentialId?: string | null;
  email?: string | null;
  alias?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

export type DynamicRegistrationPayload = {
  dynamicUserId: string;
  email: string;
  name: string;
  walletAddress: string;
  firstName?: string;
  lastName?: string;
};

function normalize(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function deriveFallbackName(email: string) {
  const localPart = email.split("@")[0] ?? "meshed-member";
  return localPart
    .split(/[._-]/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function buildDynamicRegistrationPayload(input: {
  user: DynamicUserLike;
  walletAddress?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}): DynamicRegistrationPayload {
  const walletAddress = normalize(input.walletAddress);
  if (!walletAddress) {
    throw new Error("Dynamic signup is missing a wallet address.");
  }

  const dynamicUserId =
    normalize(input.user.userId) ?? normalize(input.user.lastVerifiedCredentialId);
  if (!dynamicUserId) {
    throw new Error("Dynamic signup is missing a stable user id.");
  }

  const email =
    normalize(input.user.email)?.toLowerCase() ??
    `${dynamicUserId}@dynamic.meshed.local`;
  // Prefer an explicit name collected in the panel, then fall back through Dynamic-provided fields.
  const explicitName = [normalize(input.firstName), normalize(input.lastName)]
    .filter(Boolean)
    .join(" ")
    .trim();
  const userProvidedName = [normalize(input.user.firstName), normalize(input.user.lastName)]
    .filter(Boolean)
    .join(" ")
    .trim();
  const name =
    explicitName ||
    userProvidedName ||
    normalize(input.user.alias) ||
    deriveFallbackName(email);

  const payload: DynamicRegistrationPayload = {
    dynamicUserId,
    email,
    name,
    walletAddress,
  };

  if (normalize(input.firstName)) {
    payload.firstName = normalize(input.firstName) ?? undefined;
  }
  if (normalize(input.lastName)) {
    payload.lastName = normalize(input.lastName) ?? undefined;
  }

  return payload;
}

export function getHumanIdvRoute() {
  return "/human-idv";
}

export function normalizeDynamicNextRoute(value?: string | null): DynamicNextRoute {
  // Only allow server-provided routes that Meshed explicitly understands.
  return value === "/onboarding" ? "/onboarding" : "/human-idv";
}
