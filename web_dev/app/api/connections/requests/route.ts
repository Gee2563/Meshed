import { requireCurrentUser } from "@/lib/server/current-user";
import { fail, ok, parseJson } from "@/lib/server/http";
import { connectionRequestService } from "@/lib/server/services/connection-request-service";
import { createConnectionRequestSchema } from "@/lib/server/validation/connection-request-schemas";

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    const body = await parseJson(request, createConnectionRequestSchema);
    const created = await connectionRequestService.createRequest(user.id, body);
    return ok({ request: created });
  } catch (error) {
    return fail(error);
  }
}
