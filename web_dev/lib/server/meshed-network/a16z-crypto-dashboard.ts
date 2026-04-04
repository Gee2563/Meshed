import { readFile } from "node:fs/promises";
import path from "node:path";

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

export type A16zCryptoDashboardData = {
  snapshot: A16zDashboardSnapshot;
  strongestBridges: A16zCompanyBridge[];
  topVerticals: A16zVerticalSummary[];
};

type CompanyNetworkPayload = {
  edges?: Array<{
    id?: string;
    mentor_from_name?: string;
    mentor_to_name?: string;
    reason?: string;
    explanation?: string;
    score?: number;
  }>;
  legend?: Array<{
    vertical?: string;
    color?: string;
    count?: number;
  }>;
};

const A16Z_BUNDLE_ROOT = path.resolve(process.cwd(), "../network_pipeline/public/a16z-crypto");

async function readJson<T>(fileName: string) {
  const payload = await readFile(path.join(A16Z_BUNDLE_ROOT, fileName), "utf-8");
  return JSON.parse(payload) as T;
}

export async function loadA16zCryptoDashboardData(): Promise<A16zCryptoDashboardData | null> {
  try {
    const [snapshot, companyNetwork] = await Promise.all([
      readJson<A16zDashboardSnapshot>("dashboard_snapshot.json"),
      readJson<CompanyNetworkPayload>("company_network_data.json"),
    ]);

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
    };
  } catch {
    return null;
  }
}
