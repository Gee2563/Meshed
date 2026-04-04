import { SignJWT, jwtVerify } from "jose";

import { env } from "@/lib/config/env";

// Session helpers sign and verify the lightweight cookie token used by the current MVP.
const COOKIE_NAME = "meshed_session";
const secret = new TextEncoder().encode(env.SESSION_SECRET);

export async function createSessionToken(userId: string) {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifySessionToken(token: string) {
  try {
    const result = await jwtVerify(token, secret);
    return result.payload.sub ?? null;
  } catch {
    return null;
  }
}

export function getSessionCookieName() {
  return COOKIE_NAME;
}
