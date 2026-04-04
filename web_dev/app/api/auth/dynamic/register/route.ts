import { dynamicRegistrationService } from "@/lib/server/services/dynamic-registration-service";
import { fail, parseJson } from "@/lib/server/http";
import { createSessionToken, getSessionCookieName } from "@/lib/server/session";
import { dynamicRegisterSchema } from "@/lib/server/validation/auth-schemas";

export async function POST(request: Request) {
  try {
    const payload = await parseJson(request, dynamicRegisterSchema);
    const result = await dynamicRegistrationService.register(payload);
    const token = await createSessionToken(result.user.id);

    const response = Response.json({ ok: true, data: result });
    response.headers.append(
      "Set-Cookie",
      `${getSessionCookieName()}=${token}; Path=/; HttpOnly; SameSite=Lax`,
    );

    return response;
  } catch (error) {
    return fail(error);
  }
}
