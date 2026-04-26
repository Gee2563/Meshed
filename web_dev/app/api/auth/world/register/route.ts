import { fail, parseJson } from "@/lib/server/http";
import { buildSessionResponse } from "@/lib/server/session-response";
import { worldRegistrationService } from "@/lib/server/services/world-registration-service";
import { worldRegisterSchema } from "@/lib/server/validation/auth-schemas";

export async function POST(request: Request) {
  try {
    const payload = await parseJson(request, worldRegisterSchema);
    const result = await worldRegistrationService.register(payload);
    return buildSessionResponse({
      userId: result.user.id,
      data: result,
    });
  } catch (error) {
    return fail(error);
  }
}
