import { z } from "zod";

export const acceptAgentNotificationSchema = z.object({
  actionId: z.string().trim().min(1).optional().nullable(),
});
