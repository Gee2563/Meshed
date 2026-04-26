import { requireCurrentUser } from "@/lib/server/current-user";
import { fail, ok, parseJson } from "@/lib/server/http";
import { onboardingService } from "@/lib/server/services/onboarding-service";
import { onboardingSocialsSchema } from "@/lib/server/validation/onboarding-schemas";

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    const payload = await parseJson(request, onboardingSocialsSchema);
    const result = await onboardingService.saveSocials(user, payload);
    return ok(result);
  } catch (error) {
    return fail(error);
  }
}
