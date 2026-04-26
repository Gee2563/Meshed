import { requireCurrentUser } from "@/lib/server/current-user";
import { fail, ok, parseJson } from "@/lib/server/http";
import { getMeshingContractsService } from "@/lib/server/services/meshing-contract-service";
import { recordRelationshipEventSchema } from "@/lib/server/validation/meshing-schemas";

export async function POST(request: Request) {
  try {
    await requireCurrentUser();
    const body = await parseJson(request, recordRelationshipEventSchema);
    const result = await getMeshingContractsService().recordRelationship({
      entityA: body.entityA,
      entityB: body.entityB,
      relationshipType: body.relationshipType ?? "CONNECTED_TO",
      investorAddresses: body.investorAddresses,
    });

    return ok(result);
  } catch (error) {
    return fail(error);
  }
}
