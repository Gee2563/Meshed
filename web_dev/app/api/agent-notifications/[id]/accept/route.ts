import { requireCurrentUser } from "@/lib/server/current-user";
import { fail, ok, parseJson } from "@/lib/server/http";
import { agentNotificationService } from "@/lib/server/services/agent-notification-service";
import { acceptAgentNotificationSchema } from "@/lib/server/validation/agent-notification-schemas";

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteParams) {
  try {
    const user = await requireCurrentUser();
    const { id } = await context.params;
    const body = await parseJson(request, acceptAgentNotificationSchema);
    const result = await agentNotificationService.acceptNotification(user, {
      notificationId: id,
      actionId: body.actionId ?? null,
    });
    return ok(result);
  } catch (error) {
    return fail(error);
  }
}
