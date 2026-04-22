import path from "node:path";

export type MeshedDashboardScope = "a16z-crypto" | "flexpoint-ford";

type MeshedDashboardScopeConfig = {
  scope: MeshedDashboardScope;
  scopeLabel: string;
  organizationName: string;
  heroTitle: string;
  graphTitle: string;
  bundleRelativePath: string;
  bundleRoot: string;
};

const FLEXPOINT_FORD_EMAILS = new Set(["georgegds92@gmail.com"]);

const DASHBOARD_SCOPE_CONFIG: Record<MeshedDashboardScope, Omit<MeshedDashboardScopeConfig, "bundleRoot">> = {
  "a16z-crypto": {
    scope: "a16z-crypto",
    scopeLabel: "A16z crypto",
    organizationName: "Andreessen Horowitz",
    heroTitle: "Welcome to your a16z meshed network",
    graphTitle: "a16z's Meshed Network Interactive Graph",
    bundleRelativePath: "network_pipeline/public/a16z-crypto",
  },
  "flexpoint-ford": {
    scope: "flexpoint-ford",
    scopeLabel: "Flexpoint Ford",
    organizationName: "Flexpoint Ford",
    heroTitle: "Welcome to your Flexpoint Ford meshed network",
    graphTitle: "Flexpoint Ford's Meshed Network Interactive Graph",
    bundleRelativePath: "network_pipeline/public/flexpoint-ford",
  },
};

function normalizeEmail(email: string | null | undefined) {
  return String(email ?? "").trim().toLowerCase();
}

export function resolveDashboardScopeForEmail(email: string | null | undefined): MeshedDashboardScope {
  return FLEXPOINT_FORD_EMAILS.has(normalizeEmail(email)) ? "flexpoint-ford" : "a16z-crypto";
}

export function getDashboardScopeConfig(scope: MeshedDashboardScope): MeshedDashboardScopeConfig {
  const config = DASHBOARD_SCOPE_CONFIG[scope];

  return {
    ...config,
    bundleRoot: path.resolve(process.cwd(), `../${config.bundleRelativePath}`),
  };
}
