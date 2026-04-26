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
  website: string;
  domains: string[];
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
    website: "https://a16z.com",
    domains: ["a16z.com", "www.a16z.com"],
  },
  "flexpoint-ford": {
    scope: "flexpoint-ford",
    scopeLabel: "Flexpoint Ford",
    organizationName: "Flexpoint Ford",
    heroTitle: "Welcome to your Flexpoint Ford Meshed Network",
    graphTitle: "Flexpoint Ford's Meshed Network Interactive Graph",
    bundleRelativePath: "network_pipeline/public/flexpoint-ford",
    website: "https://flexpointford.com",
    domains: ["flexpointford.com", "www.flexpointford.com"],
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

function normalizeDomain(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
}

function normalizeName(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function resolveDashboardScopeForWebsite(website: string | null | undefined): MeshedDashboardScope | null {
  const domain = normalizeDomain(website);
  if (!domain) {
    return null;
  }

  for (const scope of Object.keys(DASHBOARD_SCOPE_CONFIG) as MeshedDashboardScope[]) {
    const config = DASHBOARD_SCOPE_CONFIG[scope];
    if (config.domains.some((candidate) => normalizeDomain(candidate) === domain)) {
      return scope;
    }
  }

  return null;
}

export function resolveDashboardScopeForName(name: string | null | undefined): MeshedDashboardScope | null {
  const normalized = normalizeName(name);
  if (!normalized) {
    return null;
  }

  for (const scope of Object.keys(DASHBOARD_SCOPE_CONFIG) as MeshedDashboardScope[]) {
    const config = DASHBOARD_SCOPE_CONFIG[scope];
    const candidateNames = [config.organizationName, config.scopeLabel, scope];
    if (candidateNames.some((candidate) => normalizeName(candidate) === normalized)) {
      return scope;
    }
  }

  return null;
}

export function resolveDashboardScopeForOrganization(input: {
  website?: string | null;
  name?: string | null;
}): MeshedDashboardScope | null {
  return resolveDashboardScopeForWebsite(input.website) ?? resolveDashboardScopeForName(input.name);
}

export function listKnownVcOrganizations() {
  return (Object.keys(DASHBOARD_SCOPE_CONFIG) as MeshedDashboardScope[]).map((scope) => {
    const config = DASHBOARD_SCOPE_CONFIG[scope];
    return {
      id: `known-${scope}`,
      scope,
      name: config.organizationName,
      website: config.website,
      scopeLabel: config.scopeLabel,
    };
  });
}
