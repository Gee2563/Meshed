import { requireCurrentUser } from "@/lib/server/current-user";
import { fail, ok } from "@/lib/server/http";
import { onboardingService } from "@/lib/server/services/onboarding-service";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    const state = await onboardingService.getState(user.id);
    return ok(state);
  } catch (error) {
    return fail(error);
  }
}
