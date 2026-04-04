import { dynamicRegistrationService } from "@/lib/server/services/dynamic-registration-service";
import { fail, ok, parseJson } from "@/lib/server/http";
import { createSessionToken, getSessionCookieName } from "@/lib/server/session";
import { dynamicRegisterSchema } from "@/lib/server/validation/auth-schemas";

export async function POST(request: Request) {
  try {
    const payload = await parseJson(request, dynamicRegisterSchema);
    const result = await dynamicRegistrationService.register(payload);
    const token = await createSessionToken(result.user.id);

    const response = ok(result);
    response.cookies.set(getSessionCookieName(), token, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    return fail(error);
  }
}
