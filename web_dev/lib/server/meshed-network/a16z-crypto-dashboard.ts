import { readFile } from "node:fs/promises";

import { getDashboardScopeConfig, type MeshedDashboardScope } from "@/lib/server/meshed-network/dashboard-scope";

export type A16zDashboardSnapshot = {
  scope: string;
  scope_label: string;
  company_count: number;
  company_edge_count: number;
  people_profile_count: number;
  vertical_count: number;
  people_count: number;
  people_company_count: number;
  people_edge_count: number;
  generated_via: string | null;
  top_companies: Array<{
    id: string;
    company_name: string;
    vertical: string | null;
    location_region: string | null;
    degree: number;
    people_count: number;
  }>;
  featured_people: Array<{
    id: string;
    name: string;
    company: string | null;
    suggested_role: string | null;
    current_pain_point_label: string | null;
    network_importance_score: number;
    trust_signals: string[];
  }>;
};

export type A16zCompanyBridge = {
  id: string;
  sourceName: string;
  targetName: string;
  score: number;
  reason: string;
  explanation: string;
};

export type A16zVerticalSummary = {
  vertical: string;
  color: string;
  count: number;
};

export type A16zCompanyGraphNode = {
  id: string;
  companyId: string;
  companyName: string;
  vertical: string | null;
  stage: string | null;
  location: string | null;
  locationRegion: string | null;
  website: string | null;
  flexpointLogoUrl: string | null;
  flexpointLogoPath: string | null;
  degree: number;
  peopleCount: number;
  colorHex: string | null;
  size: number;
  currentPainPointTags: string[];
  resolvedPainPointTags: string[];
  peoplePainPointOverview: string | null;
  peopleConnectionSummary: string | null;
  peopleTrustSignalOverview: string | null;
  people: A16zCompanyGraphPerson[];
  partners: A16zCompanyGraphPartner[];
  latestNews: A16zCompanyGraphNewsItem[];
};

export type A16zCompanyGraphEdge = {
  id: string;
  sourceId: string;
  targetId: string;
  sourceName: string;
  targetName: string;
  score: number;
  reason: string;
  explanation: string;
  color: string | null;
  width: number;
};

export type A16zCompanyGraphPerson = {
  id: string;
  name: string;
  company: string | null;
  suggestedRole: string | null;
  currentPainPointLabel: string | null;
  resolvedPainPointsLabel: string | null;
  contact: string | null;
  linkedinUrl: string | null;
  networkImportanceScore: number;
  engagementScore: number;
  reliabilityScore: number;
  trustSignals: string[];
  relationshipSummary: string[];
  connectionSummary: string | null;
  location: string | null;
  vertical: string | null;
  stage: string | null;
};

export type A16zCompanyGraphPartner = {
  id: string;
  name: string;
  jobTitle: string | null;
  location: string | null;
  summary: string | null;
  investments: string[];
};

export type A16zCompanyGraphNewsItem = {
  title: string;
  datePublished: string | null;
  articleUrl: string;
};

export type A16zCryptoDashboardData = {
  snapshot: A16zDashboardSnapshot;
  strongestBridges: A16zCompanyBridge[];
  topVerticals: A16zVerticalSummary[];
  companyGraph: {
    nodes: A16zCompanyGraphNode[];
    edges: A16zCompanyGraphEdge[];
  };
};

type CompanyNetworkPayload = {
  nodes?: Array<{
    id?: string;
    company_id?: string;
    company_name?: string;
    vertical?: string;
    stage?: string;
    location?: string;
    location_region?: string;
    website?: string;
    flexpoint_logo_url?: string;
    flexpoint_logo_path?: string;
    lps_involved?: string[] | string;
    latest_news?: Array<{
      title?: string;
      date_published?: string | null;
      article_url?: string | null;
    }> | string;
    degree?: number;
    people_count?: number;
    people_ids?: string;
    color_hex?: string;
    size?: number;
    current_pain_point_tags?: string;
    resolved_pain_point_tags?: string;
    people_pain_point_overview?: string;
    people_connection_summary?: string;
    people_trust_signal_overview?: string;
  }>;
  edges?: Array<{
    id?: string;
    source_id?: string;
    target_id?: string;
    mentor_from_name?: string;
    mentor_to_name?: string;
    reason?: string;
    explanation?: string;
    score?: number;
    color?: string;
    width?: number;
  }>;
  legend?: Array<{
    vertical?: string;
    color?: string;
    count?: number;
  }>;
};

type PeopleNetworkPayload = {
  nodes?: Array<{
    id?: string;
    name?: string;
    company?: string;
    suggested_role?: string;
    current_pain_point_label?: string;
    resolved_pain_points_label?: string;
    contact?: string;
    linkedin_url?: string;
    network_importance_score?: number;
    engagement_score?: number;
    reliability_score?: number;
    trust_signals?: string[];
    relationship_summary?: string[];
    connection_summary?: string;
    location?: string;
    vertical?: string;
    stage?: string;
  }>;
};

type TeamProfilePayload = {
  name?: string;
  job_title?: string | null;
  location?: string | null;
  summary?: string | null;
  investments?: string[] | null;
};

async function readJson<T>(scope: MeshedDashboardScope, fileName: string) {
  const payload = await readFile(`${getDashboardScopeConfig(scope).bundleRoot}/${fileName}`, "utf-8");
  return JSON.parse(payload) as T;
}

function parseJsonStringArray(value: string | undefined) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
  } catch {
    return [];
  }
}

function parsePipeSeparatedTags(value: string | undefined) {
  if (!value) {
    return [];
  }

  return value
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseStringArray(value: string[] | string | undefined | null) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch {
    return value
      .split("|")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeLookupValue(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function parseNewsItems(value: unknown): A16zCompanyGraphNewsItem[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (!item || typeof item !== "object") {
          return null;
        }

        const article = item as {
          title?: unknown;
          date_published?: unknown;
          article_url?: unknown;
        };
        const title = String(article.title ?? "").trim();
        const articleUrl = String(article.article_url ?? "").trim();

        if (!title || !articleUrl) {
          return null;
        }

        return {
          title,
          datePublished: String(article.date_published ?? "").trim() || null,
          articleUrl,
        } satisfies A16zCompanyGraphNewsItem;
      })
      .filter((item): item is A16zCompanyGraphNewsItem => item !== null);
  }

  if (typeof value === "string" && value.trim()) {
    try {
      return parseNewsItems(JSON.parse(value));
    } catch {
      return [];
    }
  }

  return [];
}

export async function loadDashboardData(scope: MeshedDashboardScope): Promise<A16zCryptoDashboardData | null> {
  try {
    const [snapshot, companyNetwork, peopleNetwork, teamProfiles] = await Promise.all([
      readJson<A16zDashboardSnapshot>(scope, "dashboard_snapshot.json"),
      readJson<CompanyNetworkPayload>(scope, "company_network_data.json"),
      readJson<PeopleNetworkPayload>(scope, "people_network_data.json"),
      scope === "flexpoint-ford"
        ? readJson<TeamProfilePayload[]>(scope, "team_profiles.json")
        : Promise.resolve([] as TeamProfilePayload[]),
    ]);

    const peopleById = new Map<string, A16zCompanyGraphPerson>();
    const peopleByCompany = new Map<string, A16zCompanyGraphPerson[]>();
    const partnersByName = new Map<string, TeamProfilePayload>();

    for (const person of peopleNetwork.nodes ?? []) {
      const personId = person.id ? String(person.id) : null;

      if (!personId) {
        continue;
      }

      const normalizedCompany = String(person.company ?? "").trim().toLowerCase();
      const mappedPerson = {
        id: personId,
        name: person.name ?? "Unknown person",
        company: person.company ?? null,
        suggestedRole: person.suggested_role ?? null,
        currentPainPointLabel: person.current_pain_point_label ?? null,
        resolvedPainPointsLabel: person.resolved_pain_points_label ?? null,
        contact: person.contact ?? null,
        linkedinUrl: person.linkedin_url ?? null,
        networkImportanceScore: Number(person.network_importance_score ?? 0),
        engagementScore: Number(person.engagement_score ?? 0),
        reliabilityScore: Number(person.reliability_score ?? 0),
        trustSignals: Array.isArray(person.trust_signals) ? person.trust_signals.map((item) => String(item)) : [],
        relationshipSummary: Array.isArray(person.relationship_summary)
          ? person.relationship_summary.map((item) => String(item))
          : [],
        connectionSummary: person.connection_summary ?? null,
        location: person.location ?? null,
        vertical: person.vertical ?? null,
        stage: person.stage ?? null,
      } satisfies A16zCompanyGraphPerson;

      peopleById.set(personId, mappedPerson);

      if (!normalizedCompany) {
        continue;
      }

      const existing = peopleByCompany.get(normalizedCompany) ?? [];
      existing.push(mappedPerson);
      peopleByCompany.set(normalizedCompany, existing);
    }

    for (const partner of teamProfiles) {
      const normalizedName = normalizeLookupValue(partner.name);

      if (!normalizedName || partnersByName.has(normalizedName)) {
        continue;
      }

      partnersByName.set(normalizedName, partner);
    }

    const graphNodes = (companyNetwork.nodes ?? []).map((node, index) => {
      const companyName = node.company_name ?? "Unknown company";
      const peopleIds = parseJsonStringArray(node.people_ids);
      const partnerNames = parseStringArray(node.lps_involved);
      const mappedPeople = peopleIds
        .map((personId) => peopleById.get(personId) ?? null)
        .filter((person): person is A16zCompanyGraphPerson => person !== null);
      const fallbackPeople =
        mappedPeople.length > 0 ? mappedPeople : [...(peopleByCompany.get(companyName.trim().toLowerCase()) ?? [])];
      const partners = partnerNames.map((partnerName, partnerIndex) => {
        const partnerProfile = partnersByName.get(normalizeLookupValue(partnerName));

        return {
          id: `partner_${node.id ?? `node_${index + 1}`}_${partnerIndex + 1}`,
          name: partnerProfile?.name ?? partnerName,
          jobTitle: partnerProfile?.job_title ?? null,
          location: partnerProfile?.location ?? null,
          summary: partnerProfile?.summary ?? null,
          investments: parseStringArray(partnerProfile?.investments ?? []),
        } satisfies A16zCompanyGraphPartner;
      });

      return {
        id: node.id ?? `node_${index + 1}`,
        companyId: node.company_id ?? node.id ?? `company_${index + 1}`,
        companyName,
        vertical: node.vertical ?? null,
        stage: node.stage ?? null,
        location: node.location ?? null,
        locationRegion: node.location_region ?? null,
        website: node.website ?? null,
        flexpointLogoUrl: node.flexpoint_logo_url ?? null,
        flexpointLogoPath: node.flexpoint_logo_path ?? null,
        degree: Number(node.degree ?? 0),
        peopleCount: Number(node.people_count ?? fallbackPeople.length),
        colorHex: node.color_hex ?? null,
        size: Number(node.size ?? 18),
        currentPainPointTags: parsePipeSeparatedTags(node.current_pain_point_tags),
        resolvedPainPointTags: parsePipeSeparatedTags(node.resolved_pain_point_tags),
        peoplePainPointOverview: node.people_pain_point_overview ?? null,
        peopleConnectionSummary: node.people_connection_summary ?? null,
        peopleTrustSignalOverview: node.people_trust_signal_overview ?? null,
        people: fallbackPeople.sort((left, right) => right.networkImportanceScore - left.networkImportanceScore),
        partners,
        latestNews: parseNewsItems(node.latest_news),
      };
    });

    const graphEdges = (companyNetwork.edges ?? []).map((edge, index) => ({
      id: edge.id ?? `edge_${index + 1}`,
      sourceId: edge.source_id ?? `source_${index + 1}`,
      targetId: edge.target_id ?? `target_${index + 1}`,
      sourceName: edge.mentor_from_name ?? "Unknown company",
      targetName: edge.mentor_to_name ?? "Unknown company",
      score: Number(edge.score ?? 0),
      reason: edge.reason ?? "Similarity match",
      explanation: edge.explanation ?? "No explanation available.",
      color: edge.color ?? null,
      width: Number(edge.width ?? 1),
    }));

    const strongestBridges = (companyNetwork.edges ?? []).slice(0, 6).map((edge, index) => ({
      id: edge.id ?? `bridge_${index + 1}`,
      sourceName: edge.mentor_from_name ?? "Unknown company",
      targetName: edge.mentor_to_name ?? "Unknown company",
      score: Number(edge.score ?? 0),
      reason: edge.reason ?? "Similarity match",
      explanation: edge.explanation ?? "No explanation available.",
    }));

    const topVerticals = [...(companyNetwork.legend ?? [])]
      .sort((left, right) => Number(right.count ?? 0) - Number(left.count ?? 0))
      .slice(0, 6)
      .map((item) => ({
        vertical: item.vertical ?? "Other",
        color: item.color ?? "#64748b",
        count: Number(item.count ?? 0),
      }));

    return {
      snapshot,
      strongestBridges,
      topVerticals,
      companyGraph: {
        nodes: graphNodes,
        edges: graphEdges,
      },
    };
  } catch {
    return null;
  }
}

export async function loadA16zCryptoDashboardData(): Promise<A16zCryptoDashboardData | null> {
  return loadDashboardData("a16z-crypto");
}
