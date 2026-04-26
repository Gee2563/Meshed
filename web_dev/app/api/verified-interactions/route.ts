import { requireCurrentUser } from "@/lib/server/current-user";
import { fail, ok, parseJson } from "@/lib/server/http";
import { verifiedInteractionService } from "@/lib/server/services/verified-interaction-service";
import { createVerifiedInteractionSchema } from "@/lib/server/validation/verified-interaction-schemas";

export async function POST(request: Request) {
  try {
    const currentUser = await requireCurrentUser();
    const body = await parseJson(request, createVerifiedInteractionSchema);
    const interaction = await verifiedInteractionService.recordInteraction({
      interactionType: body.interactionType,
      actorUserId: currentUser.id,
      targetUserId: body.targetUserId ?? null,
      authorizedByUserId: body.authorizedByUserId ?? null,
      companyId: body.companyId ?? null,
      painPointTag: body.painPointTag ?? null,
      matchScore: body.matchScore ?? null,
      transactionHash: body.transactionHash ?? null,
      rewardStatus: body.rewardStatus,
      metadata: {
        source: "manual_verified_interaction",
        ...(body.metadata ?? {}),
      },
    });

    return ok({
      interaction,
    });
  } catch (error) {
    return fail(error);
  }
}
