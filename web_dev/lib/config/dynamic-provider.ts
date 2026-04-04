import { TurnkeyEVMWalletConnectors } from "@dynamic-labs/embedded-wallet-evm";
import { DynamicWaasEVMConnectors } from "@dynamic-labs/waas-evm";

// Keep Dynamic SDK setup centralized so env validation and fallback behavior stay easy to test.
type DynamicProviderEnv = {
  dynamicEnvironmentId?: string;
  useMockDynamic: boolean;
  appUrl?: string;
};

type DynamicProviderSettings = {
  environmentId: string;
  appName: string;
  appLogoUrl?: string;
  debugError: boolean;
  logLevel: "DEBUG";
  walletConnectors: unknown[];
};

export function MeshedWalletConnectors(props: Record<string, unknown>) {
  return [...TurnkeyEVMWalletConnectors(props), ...DynamicWaasEVMConnectors()];
}

export type DynamicProviderDiagnostics = {
  hasEnvironmentId: boolean;
  maskedEnvironmentId: string | null;
  environmentIdValid: boolean;
  useMockDynamic: boolean;
  appUrl: string | null;
  appOrigin: string | null;
};

export type DynamicProviderRenderMode = "fallback" | "loading" | "provider";

// Dynamic environment ids are UUID-shaped, so reject obvious copy/paste mistakes early.
const dynamicEnvironmentIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeAbsoluteOrigin(value?: string) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return url.origin;
  } catch {
    return null;
  }
}

function maskEnvironmentId(value?: string) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length <= 8) {
    return trimmed;
  }

  return `${trimmed.slice(0, 8)}...${trimmed.slice(-4)}`;
}

export function getDynamicProviderDiagnostics(env: DynamicProviderEnv): DynamicProviderDiagnostics {
  const environmentId = env.dynamicEnvironmentId?.trim();
  const appOrigin = normalizeAbsoluteOrigin(env.appUrl);

  return {
    hasEnvironmentId: Boolean(environmentId),
    maskedEnvironmentId: maskEnvironmentId(environmentId),
    environmentIdValid: Boolean(environmentId && dynamicEnvironmentIdPattern.test(environmentId)),
    useMockDynamic: env.useMockDynamic,
    appUrl: env.appUrl ?? null,
    appOrigin,
  };
}

export function getDynamicProviderSettings(
  env: DynamicProviderEnv,
): DynamicProviderSettings | null {
  const diagnostics = getDynamicProviderDiagnostics(env);
  const environmentId = env.dynamicEnvironmentId?.trim();
  // Returning null is intentional: callers use it to show a safe fallback instead of mounting the SDK.
  if (diagnostics.useMockDynamic || !environmentId || !diagnostics.environmentIdValid) {
    return null;
  }

  const appOrigin = diagnostics.appOrigin;

  return {
    environmentId,
    appName: "Meshed",
    debugError: true,
    logLevel: "DEBUG",
    walletConnectors: [MeshedWalletConnectors],
    ...(appOrigin ? { appLogoUrl: `${appOrigin}/meshed-mark.svg` } : {}),
  };
}

export function getDynamicProviderRenderMode(input: {
  mounted: boolean;
  settings: DynamicProviderSettings | null;
}): DynamicProviderRenderMode {
  if (!input.settings) {
    return "fallback";
  }

  if (!input.mounted) {
    return "loading";
  }

  return "provider";
}
