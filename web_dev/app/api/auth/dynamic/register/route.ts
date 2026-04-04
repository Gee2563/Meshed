import { dynamicRegistrationService } from "@/lib/server/services/dynamic-registration-service";
import { fail, parseJson } from "@/lib/server/http";
import { buildSessionResponse } from "@/lib/server/session-response";
import { dynamicRegisterSchema } from "@/lib/server/validation/auth-schemas";

export async function POST(request: Request) {
  try {
    const payload = await parseJson(request, dynamicRegisterSchema);
    const result = await dynamicRegistrationService.register(payload);
    return buildSessionResponse({
      userId: result.user.id,
      data: result,
    });
  } catch (error) {
    return fail(error);
  }
}
