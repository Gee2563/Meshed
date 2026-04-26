import { requireCurrentUser } from "@/lib/server/current-user";
import { fail, ok, parseJson } from "@/lib/server/http";
import { onboardingService } from "@/lib/server/services/onboarding-service";
import { vcSelectionSchema } from "@/lib/server/validation/onboarding-schemas";

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    const payload = await parseJson(request, vcSelectionSchema);
    const result = await onboardingService.saveVcSelection(user, payload);
    return ok(result);
  } catch (error) {
    return fail(error);
  }
}
