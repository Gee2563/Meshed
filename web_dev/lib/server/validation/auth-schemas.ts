import { z } from "zod";

// Central request schemas for auth and onboarding-related route handlers.
export const demoLoginSchema = z.object({
  userId: z.string().min(1),
});

export const walletLinkSchema = z.object({
  walletAddress: z.string().min(6),
  dynamicUserId: z.string().optional().nullable(),
});

export const dynamicRegisterSchema = z.object({
  walletAddress: z.string().min(6),
  dynamicUserId: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1),
  firstName: z.string().min(1).optional().nullable(),
  lastName: z.string().min(1).optional().nullable(),
});

export const worldRpSignatureSchema = z.object({
  action: z.string().min(1).optional(),
});

const worldVerifyResponseItemSchema = z
  .object({
    identifier: z.string().min(1),
  })
  .passthrough();

export const worldVerifySchema = z
  .object({
    protocol_version: z.enum(["3.0", "4.0"]),
    nonce: z.string().min(1),
    action: z.string().min(1).optional(),
    action_description: z.string().min(1).optional(),
    session_id: z.string().min(1).optional(),
    environment: z.enum(["production", "staging"]),
    responses: z.array(worldVerifyResponseItemSchema).min(1),
  })
  .passthrough();

export const companyRegisterSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  title: z.string().min(2),
  companyName: z.string().min(2),
  companyWebsite: z.string().url().optional().nullable().or(z.literal("")),
  companyDescription: z.string().min(10),
  sector: z.string().min(2),
  stage: z.string().min(2),
  currentPainTags: z.array(z.string().min(1)).min(1),
  isExecutive: z.boolean(),
  executiveSignoffEmail: z.string().email().optional().nullable().or(z.literal("")),
  linkedinUrl: z.string().url().optional().nullable().or(z.literal("")),
});

export const vcDemoRegisterSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  title: z.string().min(2),
  companyName: z.string().min(2),
  companyWebsite: z.string().url().optional().nullable().or(z.literal("")),
  companyDescription: z.string().min(10),
  sector: z.string().min(2),
  stage: z.string().min(2),
  currentPainTags: z.array(z.string().min(1)).min(1),
  outsideNetworkAccessEnabled: z.boolean(),
  linkedinUrl: z.string().url().optional().nullable().or(z.literal("")),
});

export const portfolioRegisterSchema = z.object({
  companyName: z.string().min(2),
  companyWebsite: z.string().url().optional().nullable().or(z.literal("")),
  companyDescription: z.string().min(10),
  sector: z.string().min(2),
  stage: z.string().min(2),
  currentPainTags: z.array(z.string().min(1)).min(1),
  outsideNetworkAccessEnabled: z.boolean(),
});

export const companyAccessSchema = z.object({
  title: z.string().min(2),
  outsideNetworkAccessEnabled: z.boolean(),
});

export const individualRegisterSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  role: z.enum(["consultant", "mentor", "operator", "investor"]),
  bio: z.string().min(10),
  skills: z.array(z.string().min(1)).min(1),
  sectors: z.array(z.string().min(1)).min(1),
  linkedinUrl: z.string().url().optional().nullable().or(z.literal("")),
});

export const individualProfileSchema = z.object({
  role: z.enum(["consultant", "mentor", "operator", "investor"]),
  bio: z.string().min(10),
  skills: z.array(z.string().min(1)).min(1),
  sectors: z.array(z.string().min(1)).min(1),
  linkedinUrl: z.string().url().optional().nullable().or(z.literal("")),
  outsideNetworkAccessEnabled: z.boolean(),
});
