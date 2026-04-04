import { fail, ok, parseJson } from "@/lib/server/http";
import { linkedinActivityService } from "@/lib/server/services/linkedin-activity-service";
import { linkedinWebhookEventSchema } from "@/lib/server/validation/linkedin-schemas";

export async function POST(request: Request) {
  try {
    const body = await parseJson(request, linkedinWebhookEventSchema);
    const result = await linkedinActivityService.ingestWebhookEvent({
      senderLinkedInUrl: body.senderLinkedInUrl,
      recipientLinkedInUrl: body.recipientLinkedInUrl,
      action: body.action,
      messagePreview: body.messagePreview ?? null,
    });
    return ok(result);
  } catch (error) {
    return fail(error);
  }
}
