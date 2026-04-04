import { z } from "zod";

import { parseBooleanEnv } from "@/lib/config/env-parsers";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().default("postgresql://postgres:postgres@localhost:5432/meshed"),
  SESSION_SECRET: z.string().default("dev-session-secret-change-me"),
  USE_MOCK_FLARE: z.boolean().default(true),
  USE_MOCK_MESHING: z.boolean().default(true),
  USE_MOCK_WORLD: z.boolean().default(true),
  USE_MOCK_DYNAMIC: z.boolean().default(true),
  NEXT_PUBLIC_DYNAMIC_ENV_ID: z.string().optional(),
  NEXT_PUBLIC_USE_MOCK_DYNAMIC: z.boolean().optional(),
  NEXT_PUBLIC_WORLD_APP_ID: z.string().optional(),
  NEXT_PUBLIC_USE_MOCK_WORLD: z.boolean().optional(),
  NEXT_PUBLIC_WORLD_ACTION: z.string().optional(),
  WORLD_APP_ID: z.string().optional(),
  WORLD_ACTION: z.string().default("meshed-network-access"),
  FLARE_RPC_URL: z.string().optional(),
  PRIVATE_KEY: z.string().optional(),
  FLARE_CHAIN_ID: z.coerce.number().default(114),
  FLARE_ATTESTATION_ORACLE_ADDRESS: z.string().optional(),
  RELATIONSHIP_REGISTRY_ADDRESS: z.string().optional(),
  PORTFOLIO_REGISTRY_ADDRESS: z.string().optional(),
  OPPORTUNITY_ALERT_ADDRESS: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4.1-mini"),
  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
});

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  SESSION_SECRET: process.env.SESSION_SECRET,
  USE_MOCK_FLARE: parseBooleanEnv(process.env.USE_MOCK_FLARE, true),
  USE_MOCK_MESHING: parseBooleanEnv(process.env.USE_MOCK_MESHING, true),
  USE_MOCK_WORLD: parseBooleanEnv(process.env.USE_MOCK_WORLD, true),
  USE_MOCK_DYNAMIC: parseBooleanEnv(process.env.USE_MOCK_DYNAMIC, true),
  NEXT_PUBLIC_DYNAMIC_ENV_ID: process.env.NEXT_PUBLIC_DYNAMIC_ENV_ID,
  NEXT_PUBLIC_USE_MOCK_DYNAMIC:
    process.env.NEXT_PUBLIC_USE_MOCK_DYNAMIC === undefined
      ? undefined
      : parseBooleanEnv(process.env.NEXT_PUBLIC_USE_MOCK_DYNAMIC, false),
  NEXT_PUBLIC_WORLD_APP_ID: process.env.NEXT_PUBLIC_WORLD_APP_ID,
  NEXT_PUBLIC_USE_MOCK_WORLD:
    process.env.NEXT_PUBLIC_USE_MOCK_WORLD === undefined
      ? undefined
      : parseBooleanEnv(process.env.NEXT_PUBLIC_USE_MOCK_WORLD, false),
  NEXT_PUBLIC_WORLD_ACTION: process.env.NEXT_PUBLIC_WORLD_ACTION,
  WORLD_APP_ID: process.env.WORLD_APP_ID,
  WORLD_ACTION: process.env.WORLD_ACTION,
  FLARE_RPC_URL: process.env.FLARE_RPC_URL,
  PRIVATE_KEY: process.env.PRIVATE_KEY,
  FLARE_CHAIN_ID: process.env.FLARE_CHAIN_ID,
  FLARE_ATTESTATION_ORACLE_ADDRESS: process.env.FLARE_ATTESTATION_ORACLE_ADDRESS,
  RELATIONSHIP_REGISTRY_ADDRESS: process.env.RELATIONSHIP_REGISTRY_ADDRESS,
  PORTFOLIO_REGISTRY_ADDRESS: process.env.PORTFOLIO_REGISTRY_ADDRESS,
  OPPORTUNITY_ALERT_ADDRESS: process.env.OPPORTUNITY_ALERT_ADDRESS,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});

export function buildClientEnv(input: {
  NEXT_PUBLIC_DYNAMIC_ENV_ID?: string;
  NEXT_PUBLIC_USE_MOCK_DYNAMIC?: boolean;
  NEXT_PUBLIC_WORLD_APP_ID?: string;
  NEXT_PUBLIC_USE_MOCK_WORLD?: boolean;
  NEXT_PUBLIC_WORLD_ACTION?: string;
  WORLD_ACTION?: string;
  NEXT_PUBLIC_APP_URL: string;
}) {
  return {
    dynamicEnvironmentId: input.NEXT_PUBLIC_DYNAMIC_ENV_ID,
    worldAppId: input.NEXT_PUBLIC_WORLD_APP_ID,
    worldAction: input.NEXT_PUBLIC_WORLD_ACTION ?? input.WORLD_ACTION ?? "meshed-network-access",
    useMockDynamic: input.NEXT_PUBLIC_USE_MOCK_DYNAMIC ?? !Boolean(input.NEXT_PUBLIC_DYNAMIC_ENV_ID),
    useMockWorld: input.NEXT_PUBLIC_USE_MOCK_WORLD ?? !Boolean(input.NEXT_PUBLIC_WORLD_APP_ID),
    appUrl: input.NEXT_PUBLIC_APP_URL,
  };
}

export const clientEnv = buildClientEnv({
  NEXT_PUBLIC_DYNAMIC_ENV_ID: env.NEXT_PUBLIC_DYNAMIC_ENV_ID,
  NEXT_PUBLIC_USE_MOCK_DYNAMIC: env.NEXT_PUBLIC_USE_MOCK_DYNAMIC,
  NEXT_PUBLIC_WORLD_APP_ID: env.NEXT_PUBLIC_WORLD_APP_ID,
  NEXT_PUBLIC_USE_MOCK_WORLD: env.NEXT_PUBLIC_USE_MOCK_WORLD,
  NEXT_PUBLIC_WORLD_ACTION: env.NEXT_PUBLIC_WORLD_ACTION,
  WORLD_ACTION: env.WORLD_ACTION,
  NEXT_PUBLIC_APP_URL: env.NEXT_PUBLIC_APP_URL,
});
