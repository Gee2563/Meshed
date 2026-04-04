import { requireCurrentUser } from "@/lib/server/current-user";
import { fail, ok } from "@/lib/server/http";
import { connectionRequestService } from "@/lib/server/services/connection-request-service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const user = await requireCurrentUser();
    const { id } = await context.params;
    const result = await connectionRequestService.acceptRequest(user.id, id);
    return ok(result);
  } catch (error) {
    return fail(error);
  }
}
