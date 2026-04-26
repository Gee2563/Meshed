import { ok } from "@/lib/server/http";
import { createSessionToken, getSessionCookieName } from "@/lib/server/session";

type SessionResponseInput = {
  userId: string;
  data: unknown;
};

export async function buildSessionResponse(input: SessionResponseInput) {
  const token = await createSessionToken(input.userId);
  const response = ok(input.data);

  response.cookies.set(getSessionCookieName(), token, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
  });

  return response;
}

export function buildSessionClearedResponse() {
  const response = new Response(JSON.stringify({ ok: true }), {
    headers: {
      "Content-Type": "application/json",
    },
  });

  response.headers.append(
    "Set-Cookie",
    `${getSessionCookieName()}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax`,
  );

  return response;
}
