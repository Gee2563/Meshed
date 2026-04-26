import { z } from "zod";

const metadataSchema = z.record(z.string(), z.unknown());

export const suggestMatchSchema = z.object({
  targetUserId: z.string().trim().min(1, "targetUserId is required"),
  companyId: z.string().trim().min(1).optional().nullable(),
  painPointTag: z.string().trim().min(1).optional().nullable(),
  matchScore: z.number().finite().optional().nullable(),
  metadata: metadataSchema.optional().nullable(),
});

export const createVerifiedInteractionSchema = z.object({
  interactionType: z.enum([
    "WORLD_ID_REGISTERED",
    "MATCH_SUGGESTED",
    "INTRO_REQUESTED",
    "INTRO_ACCEPTED",
    "COLLABORATION_STARTED",
    "COLLABORATION_COMPLETED",
    "REWARD_EARNED",
    "REWARD_DISTRIBUTED",
  ]),
  targetUserId: z.string().trim().min(1).optional().nullable(),
  authorizedByUserId: z.string().trim().min(1).optional().nullable(),
  companyId: z.string().trim().min(1).optional().nullable(),
  painPointTag: z.string().trim().min(1).optional().nullable(),
  matchScore: z.number().finite().optional().nullable(),
  transactionHash: z.string().trim().min(1).optional().nullable(),
  rewardStatus: z.enum(["NOT_REWARDABLE", "REWARDABLE", "EARNED", "DISTRIBUTED"]).optional(),
  metadata: metadataSchema.optional().nullable(),
});

export const updateProfileSchema = z
  .object({
    firstName: z.string().trim().min(1).optional(),
    lastName: z.string().trim().min(1).optional(),
    name: z.string().trim().min(1).optional(),
    bio: z.string().trim().max(280).optional(),
    skills: z.array(z.string().trim().min(1)).max(12).optional(),
    sectors: z.array(z.string().trim().min(1)).max(12).optional(),
    linkedinUrl: z.string().trim().url().optional().nullable().or(z.literal("")),
    emailAddress: z.string().trim().email().optional().nullable().or(z.literal("")),
    slackWorkspace: z.string().trim().max(160).optional().nullable().or(z.literal("")),
    microsoftTeamsWorkspace: z.string().trim().max(160).optional().nullable().or(z.literal("")),
    twitterHandle: z.string().trim().max(160).optional().nullable().or(z.literal("")),
    calendarEmail: z.string().trim().email().optional().nullable().or(z.literal("")),
    instagramHandle: z.string().trim().max(160).optional().nullable().or(z.literal("")),
    outsideNetworkAccessEnabled: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.firstName !== undefined ||
      value.lastName !== undefined ||
      value.name !== undefined ||
      value.bio !== undefined ||
      value.skills !== undefined ||
      value.sectors !== undefined ||
      value.linkedinUrl !== undefined ||
      value.emailAddress !== undefined ||
      value.slackWorkspace !== undefined ||
      value.microsoftTeamsWorkspace !== undefined ||
      value.twitterHandle !== undefined ||
      value.calendarEmail !== undefined ||
      value.instagramHandle !== undefined ||
      value.outsideNetworkAccessEnabled !== undefined,
    {
      message: "At least one profile field is required.",
    },
  );
