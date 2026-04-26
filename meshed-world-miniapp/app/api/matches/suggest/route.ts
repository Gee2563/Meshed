import { requireCurrentUser } from "@/lib/server/current-user";
import { fail, ok, parseJson } from "@/lib/server/http";
import { verifiedInteractionService } from "@/lib/server/services/verified-interaction-service";
import { suggestMatchSchema } from "@/lib/server/validation/verified-interaction-schemas";

export async function POST(request: Request) {
  try {
    const currentUser = await requireCurrentUser();
    const body = await parseJson(request, suggestMatchSchema);
    const interaction = await verifiedInteractionService.recordInteraction({
      interactionType: "MATCH_SUGGESTED",
      actorUserId: currentUser.id,
      targetUserId: body.targetUserId,
      companyId: body.companyId ?? null,
      painPointTag: body.painPointTag ?? null,
      matchScore: body.matchScore ?? null,
      metadata: {
        source: "dashboard_match_suggestion",
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
