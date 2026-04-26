import { getCurrentUser } from "@/lib/server/current-user";
import { fail } from "@/lib/server/http";
import { worldVerificationNullifierRepository } from "@/lib/server/repositories/world-verification-nullifier-repository";
import { buildSessionClearedResponse } from "@/lib/server/session-response";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (user) {
      await worldVerificationNullifierRepository.deleteByUserId(user.id);
    }

    return buildSessionClearedResponse();
  } catch (error) {
    return fail(error);
  }
}
