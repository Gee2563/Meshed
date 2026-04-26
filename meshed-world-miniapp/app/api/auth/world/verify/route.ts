import { fail, ok, parseJson } from "@/lib/server/http";
import { requireCurrentUser } from "@/lib/server/current-user";
import { worldVerificationService } from "@/lib/server/services/world-verification-service";
import { worldVerifySchema } from "@/lib/server/validation/auth-schemas";

export async function POST(request: Request) {
  try {
    const currentUser = await requireCurrentUser();
    const payload = await parseJson(request, worldVerifySchema);
    const result = await worldVerificationService.verifyUser(currentUser, payload);

    return ok(result);
  } catch (error) {
    return fail(error);
  }
}
