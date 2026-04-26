import { requireCurrentUser } from "@/lib/server/current-user";
import { fail, ok, parseJson } from "@/lib/server/http";
import { meshedFounderAgentActionService } from "@/lib/server/services/meshed-founder-agent-action-service";
import { executeFounderAgentActionSchema } from "@/lib/server/validation/chatbot-action-schemas";

export async function POST(request: Request) {
  try {
    const currentUser = await requireCurrentUser();
    const body = await parseJson(request, executeFounderAgentActionSchema);
    const result = await meshedFounderAgentActionService.execute(currentUser, body.action);
    return ok(result);
  } catch (error) {
    return fail(error);
  }
}
