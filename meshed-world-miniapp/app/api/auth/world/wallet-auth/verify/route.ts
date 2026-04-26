import { cookies } from "next/headers";
import { verifySiweMessage } from "@worldcoin/minikit-js/siwe";

import { requireCurrentUser } from "@/lib/server/current-user";
import { ApiError, fail, ok, parseJson } from "@/lib/server/http";
import { userRepository } from "@/lib/server/repositories/user-repository";
import { worldWalletAuthVerifySchema } from "@/lib/server/validation/auth-schemas";
import {
  WORLD_WALLET_AUTH_COOKIE,
  WORLD_WALLET_AUTH_STATEMENT,
} from "@/lib/server/world-wallet-auth";

export const dynamic = "force-dynamic";

function parseExpectedAuth(value?: string | null) {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as { nonce?: unknown; requestId?: unknown };
    if (typeof parsed.nonce === "string" && typeof parsed.requestId === "string") {
      return {
        nonce: parsed.nonce,
        requestId: parsed.requestId,
      };
    }
  } catch {
    return null;
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const currentUser = await requireCurrentUser();
    const payload = await parseJson(request, worldWalletAuthVerifySchema);
    const cookieStore = await cookies();
    const expected = parseExpectedAuth(cookieStore.get(WORLD_WALLET_AUTH_COOKIE)?.value);

    if (!expected) {
      throw new ApiError(400, "World wallet auth was not started or has expired.");
    }

    const verification = await verifySiweMessage(
      payload,
      expected.nonce,
      WORLD_WALLET_AUTH_STATEMENT,
      expected.requestId,
    );

    if (!verification.isValid) {
      throw new ApiError(400, "World wallet signature could not be verified.");
    }

    const existingWalletUser = await userRepository.findByWalletAddress(payload.address.toLowerCase());
    if (existingWalletUser && existingWalletUser.id !== currentUser.id) {
      throw new ApiError(409, "That World wallet is already linked to another Meshed account.");
    }

    const updatedUser = await userRepository.linkWallet(currentUser.id, payload.address.toLowerCase());
    const response = ok({ user: updatedUser });
    response.cookies.set(WORLD_WALLET_AUTH_COOKIE, "", {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    return fail(error);
  }
}
