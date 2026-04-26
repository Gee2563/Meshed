import { NextResponse } from "next/server";

import { authService } from "@/lib/server/services/auth-service";
import { dynamicRegistrationService } from "@/lib/server/services/dynamic-registration-service";
import { createSessionToken, getSessionCookieName } from "@/lib/server/session";

// Controller layer translates service results into HTTP responses and session cookie changes.
async function buildSessionResponse(userId: string, data: unknown) {
  const token = await createSessionToken(userId);
  const response = NextResponse.json({ ok: true, data });
  // Keep cookie writing in one helper so login-like endpoints all share the same session settings.
  response.cookies.set(getSessionCookieName(), token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: false,
  });
  return response;
}

export const authController = {
  async demoLogin(userId: string) {
    const user = await authService.loginAsDemoUser(userId);
    return buildSessionResponse(user.id, user);
  },

  async logout() {
    const response = NextResponse.json({ ok: true });
    response.cookies.set(getSessionCookieName(), "", {
      expires: new Date(0),
      httpOnly: true,
      maxAge: 0,
      path: "/",
      sameSite: "lax",
      secure: false,
    });
    return response;
  },

  async linkWallet(userId: string, payload: { walletAddress: string; dynamicUserId?: string | null }) {
    const user = await authService.linkWallet(userId, payload);
    return NextResponse.json({ ok: true, data: user });
  },

  async registerWithDynamic(payload: Parameters<typeof dynamicRegistrationService.register>[0]) {
    const result = await dynamicRegistrationService.register(payload);
    return buildSessionResponse(result.user.id, result);
  },

  async verifyWorld(userId: string, payload: { signal: string; proof?: unknown }) {
    const user = await authService.verifyWorld(userId, payload);
    return NextResponse.json({ ok: true, data: user });
  },
};
