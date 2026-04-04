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
