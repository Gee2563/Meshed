import { z } from "zod";

export const vcSelectionSchema = z
  .object({
    selectedCompanyId: z.string().trim().min(1).optional().nullable(),
    companyName: z.string().trim().optional().nullable(),
    website: z.string().trim().min(1),
    pointOfContactName: z.string().trim().optional().nullable().or(z.literal("")),
    pointOfContactEmail: z.string().trim().email().optional().nullable().or(z.literal("")),
    memberCompanyName: z.string().trim().optional().nullable(),
    memberCompanyAddress: z.string().trim().optional().nullable(),
  })
  .superRefine((value, context) => {
    if (!value.selectedCompanyId && !value.companyName?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["companyName"],
        message: "Choose a VC or enter the VC name manually.",
      });
    }
  });

export const onboardingSocialsSchema = z.object({
  linkedinUrl: z.string().trim().url().optional().nullable().or(z.literal("")),
  emailAddress: z.string().trim().email().optional().nullable().or(z.literal("")),
  slackWorkspace: z.string().trim().optional().nullable().or(z.literal("")),
  microsoftTeamsWorkspace: z.string().trim().optional().nullable().or(z.literal("")),
  twitterHandle: z.string().trim().optional().nullable().or(z.literal("")),
  calendarEmail: z.string().trim().email().optional().nullable().or(z.literal("")),
  instagramHandle: z.string().trim().optional().nullable().or(z.literal("")),
  currentPainPoints: z.string().trim().optional().nullable().or(z.literal("")),
  resolvedPainPoints: z.string().trim().optional().nullable().or(z.literal("")),
});
