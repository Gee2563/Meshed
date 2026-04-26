import { z } from "zod";

export const founderAgentActionTargetSchema = z.object({
  kind: z.enum(["person", "partner", "company"]),
  personId: z.string().trim().min(1).optional().nullable(),
  personName: z.string().trim().min(1).optional().nullable(),
  partnerId: z.string().trim().min(1).optional().nullable(),
  partnerName: z.string().trim().min(1).optional().nullable(),
  companyId: z.string().trim().min(1).optional().nullable(),
  companyName: z.string().trim().min(1).optional().nullable(),
});

export const founderAgentActionSchema = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1),
  actionType: z.enum(["QUEUE_OUTREACH", "DRAFT_FOUNDER_BRIEF", "REVIEW_VERIFIED_INTERACTIONS", "OPEN_NETWORK_ENTITY"]),
  description: z.string().trim().optional().nullable(),
  targets: z.array(founderAgentActionTargetSchema).max(6).default([]),
});

export const executeFounderAgentActionSchema = z.object({
  action: founderAgentActionSchema,
});
