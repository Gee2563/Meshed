import { requireCurrentUser } from "@/lib/server/current-user";
import { fail, ok } from "@/lib/server/http";
import { onboardingService } from "@/lib/server/services/onboarding-service";

export async function POST() {
  try {
    const user = await requireCurrentUser();
    const job = await onboardingService.restartNetworkPreparation(user);
    return ok({ job });
  } catch (error) {
    return fail(error);
  }
}
