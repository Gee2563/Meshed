import { randomBytes, randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/server/current-user";
import { fail } from "@/lib/server/http";
import {
  WORLD_WALLET_AUTH_COOKIE,
  WORLD_WALLET_AUTH_STATEMENT,
} from "@/lib/server/world-wallet-auth";

export const dynamic = "force-dynamic";

function createNonce() {
  return randomBytes(18).toString("base64url").replace(/[^a-zA-Z0-9]/g, "").slice(0, 24);
}

export async function POST() {
  try {
    await requireCurrentUser();

    const nonce = createNonce();
    const requestId = `meshed-${randomUUID()}`;
    const expirationTime = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const response = NextResponse.json({
      ok: true,
      data: {
        nonce,
        statement: WORLD_WALLET_AUTH_STATEMENT,
        requestId,
        expirationTime,
      },
    });

    response.cookies.set(WORLD_WALLET_AUTH_COOKIE, JSON.stringify({ nonce, requestId }), {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      maxAge: 5 * 60,
    });

    return response;
  } catch (error) {
    return fail(error);
  }
}
