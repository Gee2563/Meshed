import { z } from "zod";

import { parseBooleanEnv } from "@/lib/config/env-parsers";

// Parse environment variables once so the rest of the app can depend on typed config objects.
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
  NEXT_PUBLIC_WORLD_RP_ID: z.string().optional(),
  NEXT_PUBLIC_USE_MOCK_WORLD: z.boolean().optional(),
  NEXT_PUBLIC_WORLD_ENVIRONMENT: z.enum(["production", "staging"]).optional(),
  NEXT_PUBLIC_WORLD_ACTION: z.string().optional(),
  NEXT_PUBLIC_LOGO_DEV_TOKEN: z.string().optional(),
  NEXT_PUBLIC_LOGO_DEV_PUBLISHABLE_KEY: z.string().optional(),
  WORLD_APP_ID: z.string().optional(),
  WORLD_RP_ID: z.string().optional(),
  WORLD_RP_SIGNING_KEY: z.string().optional(),
  WORLD_ACTION: z.string().default("meshed-network-access"),
  WORLD_CHAIN_RPC_URL: z.string().optional(),
  WORLD_CHAIN_PRIVATE_KEY: z.string().optional(),
  WORLD_CHAIN_CHAIN_ID: z.coerce.number().default(4801),
  WORLD_CHAIN_VERIFIED_INTERACTION_REGISTRY_ADDRESS: z.string().optional(),
  WORLD_CHAIN_EXPLORER_TX_BASE_URL: z
    .string()
    .default("https://worldchain-sepolia.explorer.alchemy.com/tx/"),
  LOGO_DEV_PUBLISHABLE_KEY: z.string().optional(),
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
  NEXT_PUBLIC_WORLD_RP_ID: process.env.NEXT_PUBLIC_WORLD_RP_ID,
  NEXT_PUBLIC_USE_MOCK_WORLD:
    process.env.NEXT_PUBLIC_USE_MOCK_WORLD === undefined
      ? undefined
      : parseBooleanEnv(process.env.NEXT_PUBLIC_USE_MOCK_WORLD, false),
  NEXT_PUBLIC_WORLD_ENVIRONMENT: process.env.NEXT_PUBLIC_WORLD_ENVIRONMENT as "production" | "staging" | undefined,
  NEXT_PUBLIC_WORLD_ACTION: process.env.NEXT_PUBLIC_WORLD_ACTION,
  NEXT_PUBLIC_LOGO_DEV_TOKEN: process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN,
  NEXT_PUBLIC_LOGO_DEV_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_LOGO_DEV_PUBLISHABLE_KEY,
  WORLD_APP_ID: process.env.WORLD_APP_ID,
  WORLD_RP_ID: process.env.WORLD_RP_ID,
  WORLD_RP_SIGNING_KEY: process.env.WORLD_RP_SIGNING_KEY,
  WORLD_ACTION: process.env.WORLD_ACTION,
  WORLD_CHAIN_RPC_URL: process.env.WORLD_CHAIN_RPC_URL,
  WORLD_CHAIN_PRIVATE_KEY: process.env.WORLD_CHAIN_PRIVATE_KEY,
  WORLD_CHAIN_CHAIN_ID: process.env.WORLD_CHAIN_CHAIN_ID,
  WORLD_CHAIN_VERIFIED_INTERACTION_REGISTRY_ADDRESS: process.env.WORLD_CHAIN_VERIFIED_INTERACTION_REGISTRY_ADDRESS,
  WORLD_CHAIN_EXPLORER_TX_BASE_URL: process.env.WORLD_CHAIN_EXPLORER_TX_BASE_URL,
  LOGO_DEV_PUBLISHABLE_KEY: process.env.LOGO_DEV_PUBLISHABLE_KEY,
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

// Browser code only receives public values plus derived mock defaults, never server-only secrets.
export function buildClientEnv(input: {
  NEXT_PUBLIC_DYNAMIC_ENV_ID?: string;
  NEXT_PUBLIC_USE_MOCK_DYNAMIC?: boolean;
  NEXT_PUBLIC_WORLD_APP_ID?: string;
  NEXT_PUBLIC_WORLD_RP_ID?: string;
  NEXT_PUBLIC_USE_MOCK_WORLD?: boolean;
  NEXT_PUBLIC_WORLD_ENVIRONMENT?: "production" | "staging";
  NEXT_PUBLIC_WORLD_ACTION?: string;
  NEXT_PUBLIC_LOGO_DEV_TOKEN?: string;
  NEXT_PUBLIC_LOGO_DEV_PUBLISHABLE_KEY?: string;
  LOGO_DEV_PUBLISHABLE_KEY?: string;
  WORLD_ACTION?: string;
  NEXT_PUBLIC_APP_URL: string;
}) {
  const hasLiveWorldConfig = Boolean(input.NEXT_PUBLIC_WORLD_APP_ID && input.NEXT_PUBLIC_WORLD_RP_ID);

  return {
    dynamicEnvironmentId: input.NEXT_PUBLIC_DYNAMIC_ENV_ID,
    worldAppId: input.NEXT_PUBLIC_WORLD_APP_ID,
    worldRpId: input.NEXT_PUBLIC_WORLD_RP_ID,
    worldEnvironment: input.NEXT_PUBLIC_WORLD_ENVIRONMENT ?? "staging",
    worldAction: input.NEXT_PUBLIC_WORLD_ACTION ?? input.WORLD_ACTION ?? "meshed-network-access",
    logoDevToken:
      input.NEXT_PUBLIC_LOGO_DEV_TOKEN ??
      input.NEXT_PUBLIC_LOGO_DEV_PUBLISHABLE_KEY ??
      input.LOGO_DEV_PUBLISHABLE_KEY,
    useMockDynamic: input.NEXT_PUBLIC_USE_MOCK_DYNAMIC ?? !Boolean(input.NEXT_PUBLIC_DYNAMIC_ENV_ID),
    useMockWorld: input.NEXT_PUBLIC_USE_MOCK_WORLD ?? !hasLiveWorldConfig,
    appUrl: input.NEXT_PUBLIC_APP_URL,
  };
}

export const clientEnv = buildClientEnv({
  NEXT_PUBLIC_DYNAMIC_ENV_ID: env.NEXT_PUBLIC_DYNAMIC_ENV_ID,
  NEXT_PUBLIC_USE_MOCK_DYNAMIC: env.NEXT_PUBLIC_USE_MOCK_DYNAMIC,
  NEXT_PUBLIC_WORLD_APP_ID: env.NEXT_PUBLIC_WORLD_APP_ID,
  NEXT_PUBLIC_WORLD_RP_ID: env.NEXT_PUBLIC_WORLD_RP_ID,
  NEXT_PUBLIC_USE_MOCK_WORLD: env.NEXT_PUBLIC_USE_MOCK_WORLD,
  NEXT_PUBLIC_WORLD_ENVIRONMENT: env.NEXT_PUBLIC_WORLD_ENVIRONMENT,
  NEXT_PUBLIC_WORLD_ACTION: env.NEXT_PUBLIC_WORLD_ACTION,
  NEXT_PUBLIC_LOGO_DEV_TOKEN: env.NEXT_PUBLIC_LOGO_DEV_TOKEN,
  NEXT_PUBLIC_LOGO_DEV_PUBLISHABLE_KEY: env.NEXT_PUBLIC_LOGO_DEV_PUBLISHABLE_KEY,
  LOGO_DEV_PUBLISHABLE_KEY: env.LOGO_DEV_PUBLISHABLE_KEY,
  WORLD_ACTION: env.WORLD_ACTION,
  NEXT_PUBLIC_APP_URL: env.NEXT_PUBLIC_APP_URL,
});
