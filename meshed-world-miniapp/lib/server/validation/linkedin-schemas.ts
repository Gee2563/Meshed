import { z } from "zod";

export const linkedinWebhookEventSchema = z.object({
  senderLinkedInUrl: z.string().url(),
  recipientLinkedInUrl: z.string().url(),
  action: z.enum(["connect_request", "message"]),
  messagePreview: z.string().min(1).max(500).optional().nullable(),
});
