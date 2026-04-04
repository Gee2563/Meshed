import { z } from "zod";

export const registerMeshingPortfolioSchema = z
  .object({
    investorAddress: z.string().min(4).optional(),
    companies: z.array(z.string().min(1)).default([]),
    founders: z.array(z.string().min(1)).default([]),
  })
  .refine((value) => value.companies.length > 0 || value.founders.length > 0, {
    message: "At least one company or founder is required.",
    path: ["companies"],
  });

export const recordRelationshipEventSchema = z.object({
  entityA: z.string().min(1),
  entityB: z.string().min(1),
  relationshipType: z.string().min(1).default("CONNECTED_TO"),
  investorAddresses: z.array(z.string().min(1)).optional(),
});
