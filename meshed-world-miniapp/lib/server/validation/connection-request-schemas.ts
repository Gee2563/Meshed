import { z } from "zod";

export const createConnectionRequestSchema = z.object({
  recipientUserId: z.string().trim().min(1, "recipientUserId is required"),
  type: z.enum(["intro", "consulting", "mentorship", "investment", "endorsement"]),
  message: z.string().trim().max(500).optional().nullable(),
  companyId: z.string().trim().min(1).optional().nullable(),
  painPointTag: z.string().trim().min(1).optional().nullable(),
  matchScore: z.number().finite().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

export type CreateConnectionRequestInput = z.infer<typeof createConnectionRequestSchema>;
