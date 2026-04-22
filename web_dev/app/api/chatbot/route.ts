import { readFile } from "node:fs/promises";

import { getDashboardScopeConfig, resolveDashboardScopeForEmail } from "@/lib/server/meshed-network/dashboard-scope";
import { requireCurrentUser } from "@/lib/server/current-user";
import { ApiError, fail, ok } from "@/lib/server/http";

type CompanyNewsItem = {
  title?: string | null;
  date_published?: string | null;
  article_url?: string | null;
};

type CompanyNode = {
  company_name?: string | null;
  company_id?: string | null;
  id?: string | null;
  vertical?: string | null;
  degree?: number | string | null;
  people_count?: number | string | null;
  lps_involved?: string[] | string | null;
  investor_names?: string | null;
  investor_names_label?: string | null;
  taxonomy_tokens?: string | null;
  current_pain_point_tags?: string[] | string | null;
  resolved_pain_point_tags?: string[] | string | null;
  people_current_pain_point_overview?: string | null;
  people_resolved_pain_point_overview?: string | null;
  people_connection_summary?: string | null;
  latest_news?: CompanyNewsItem[] | string | null;
  website?: string | null;
  location?: string | null;
  location_region?: string | null;
  stage?: string | null;
  summary?: string | null;
};

type EdgeNode = {
  source_id?: string | null;
  target_id?: string | null;
  mentor_from_name?: string | null;
  mentor_to_name?: string | null;
  score?: number | string | null;
  reason?: string | null;
  explanation?: string | null;
};

type PeopleNode = {
  id?: string | null;
  label?: string | null;
  name?: string | null;
  company?: string | null;
  suggested_role?: string | null;
  title?: string | null;
  network_importance_score?: number | string | null;
  engagement_score?: number | string | null;
  reliability_score?: number | string | null;
  shared_connection_count?: number | string | null;
  successful_collaboration_count?: number | string | null;
  trust_signals?: string[] | null;
  vertical?: string | null;
  current_pain_point_label?: string | null;
  resolved_pain_points_label?: string | null;
  connection_summary?: string | null;
};

type CompanyNetworkPayload = {
  nodes?: CompanyNode[];
  edges?: EdgeNode[];
};

type PeopleNetworkPayload = {
  nodes?: PeopleNode[];
};

type ChatIntent =
  | "lp_exposure"
  | "lp_company_coverage"
  | "lp_coverage_for_company"
  | "founder_recommendation"
  | "top_connected_companies"
  | "bridge_insights"
  | "companies_by_vertical"
  | "companies_with_pain_point"
  | "who_solved_pain_point"
  | "latest_news_for_company"
  | "companies_with_recent_news"
  | "general";

type ChatReply = {
  intent: ChatIntent;
  answer: string;
  highlights: string[];
};

function normalize(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanText(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).replace(/\s+/g, " ").trim();
}

function parseScore(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function parseDisplayStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((entry) => cleanText(entry)).filter(Boolean);
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((entry) => cleanText(entry)).filter(Boolean);
      }
    } catch {
      return value
        .split("|")
        .map((entry) => cleanText(entry))
        .filter(Boolean);
    }
  }
  return [];
}

function parseTagList(value: unknown): string[] {
  return [...new Set(parseDisplayStringList(value).flatMap((entry) => entry.split("|").map((item) => cleanText(item))).filter(Boolean))];
}

function parseNewsItems(
  value: unknown,
): Array<{ title: string; datePublished: string | null; articleUrl: string | null }> {
  let parsedValue = value;
  if (typeof parsedValue === "string") {
    try {
      parsedValue = JSON.parse(parsedValue);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(parsedValue)) {
    return [];
  }

  return parsedValue
    .map((item) => {
      const record = item && typeof item === "object" ? (item as CompanyNewsItem) : null;
      if (!record) {
        return null;
      }
      const title = cleanText(record.title);
      if (!title) {
        return null;
      }
      return {
        title,
        datePublished: cleanText(record.date_published) || null,
        articleUrl: cleanText(record.article_url) || null,
      };
    })
    .filter((item): item is { title: string; datePublished: string | null; articleUrl: string | null } => item !== null);
}

function parseRequestText(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    throw new ApiError(400, "Invalid request payload.");
  }
  const query = (payload as { query?: unknown }).query;
  if (typeof query !== "string" || !query.trim()) {
    throw new ApiError(400, "The query field is required.");
  }
  return query.trim();
}

async function readJson<T>(bundleRoot: string, fileName: string): Promise<T> {
  const data = await readFile(`${bundleRoot}/${fileName}`, "utf-8");
  return JSON.parse(data) as T;
}

function extractQueryTerms(question: string): string[] {
  const stopWords = new Set([
    "a",
    "about",
    "across",
    "and",
    "are",
    "does",
    "do",
    "for",
    "from",
    "have",
    "how",
    "i",
    "in",
    "into",
    "is",
    "it",
    "latest",
    "me",
    "most",
    "my",
    "network",
    "of",
    "on",
    "should",
    "show",
    "the",
    "this",
    "to",
    "we",
    "what",
    "which",
    "who",
    "with",
  ]);

  const cleaned = normalize(question);
  const words = cleaned.split(" ").filter((token) => token.length > 2 && !stopWords.has(token));
  const bigrams: string[] = [];
  for (let index = 0; index < words.length - 1; index += 1) {
    const phrase = `${words[index]} ${words[index + 1]}`;
    if (phrase.length > 3) {
      bigrams.push(phrase);
    }
  }
  return [...new Set([...words, ...bigrams])];
}

function formatTagLabel(tag: string): string {
  const cleaned = cleanText(tag).replace(/[_-]+/g, " ");
  return cleaned.replace(/\b\w/g, (character) => character.toUpperCase());
}

function getCompanyName(company: CompanyNode): string {
  return cleanText(company.company_name ?? company.company_id ?? company.id) || "Unknown company";
}

function getCompanyIds(company: CompanyNode): string[] {
  return [cleanText(company.company_id), cleanText(company.id)].filter(Boolean);
}

function getPersonName(person: PeopleNode): string {
  return cleanText(person.name ?? person.label) || "Unknown person";
}

function buildCompanySearchText(company: CompanyNode): string {
  return normalize(
    [
      getCompanyName(company),
      company.vertical,
      company.taxonomy_tokens,
      company.location,
      company.location_region,
      company.stage,
      company.summary,
      company.website,
      company.investor_names,
      company.investor_names_label,
      company.people_current_pain_point_overview,
      company.people_resolved_pain_point_overview,
      company.people_connection_summary,
      ...parseTagList(company.current_pain_point_tags),
      ...parseTagList(company.resolved_pain_point_tags),
      ...parseNewsItems(company.latest_news).map((item) => item.title),
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function buildPersonSearchText(person: PeopleNode): string {
  return normalize(
    [
      getPersonName(person),
      person.company,
      person.vertical,
      person.suggested_role,
      person.title,
      person.current_pain_point_label,
      person.resolved_pain_points_label,
      person.connection_summary,
      ...(person.trust_signals ?? []),
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function scoreTextAgainstTerms(searchText: string, terms: string[]): number {
  let score = 0;
  for (const term of terms) {
    if (searchText.includes(term)) {
      score += term.includes(" ") ? 2 : 1;
    }
  }
  return score;
}

function findBestCompanyMatch(question: string, companies: CompanyNode[]): CompanyNode | null {
  const text = normalize(question);
  const ranked = companies
    .map((company) => {
      const companyName = normalize(getCompanyName(company));
      let score = 0;

      if (companyName && text.includes(companyName)) {
        score += 20 + companyName.split(" ").length;
      }

      for (const token of companyName.split(" ")) {
        if (token.length > 3 && text.includes(token)) {
          score += 1;
        }
      }

      for (const identifier of getCompanyIds(company).map((value) => normalize(value))) {
        if (identifier && text.includes(identifier)) {
          score += 5;
        }
      }

      return {
        company,
        score,
        companyNameLength: companyName.length,
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || right.companyNameLength - left.companyNameLength);

  return ranked[0]?.company ?? null;
}

function buildOwnerCoverageRanking(weightedCompanies: Array<{ company: CompanyNode; weight: number }>) {
  const exposure = new Map<string, { count: number; companyNames: Set<string>; usesInvestorProxy: boolean }>();

  for (const { company, weight } of weightedCompanies) {
    const lpOwners = parseTagList(company.lps_involved);
    const investorOwners = parseDisplayStringList(company.investor_names);
    const investorLabel = cleanText(company.investor_names_label);
    const owners =
      lpOwners.length > 0 ? lpOwners : investorOwners.length > 0 ? investorOwners : investorLabel ? [investorLabel] : [];
    const usesInvestorProxy = lpOwners.length === 0;

    for (const owner of owners) {
      const bucket = exposure.get(owner) ?? { count: 0, companyNames: new Set<string>(), usesInvestorProxy };
      bucket.count += Math.max(weight, 1);
      bucket.companyNames.add(getCompanyName(company));
      bucket.usesInvestorProxy = bucket.usesInvestorProxy || usesInvestorProxy;
      exposure.set(owner, bucket);
    }
  }

  return [...exposure.entries()]
    .map(([ownerName, value]) => ({
      ownerName,
      count: value.count,
      companyNames: [...value.companyNames],
      usesInvestorProxy: value.usesInvestorProxy,
    }))
    .sort((left, right) => right.count - left.count || right.companyNames.length - left.companyNames.length);
}

function edgeTouchesCompany(edge: EdgeNode, company: CompanyNode): boolean {
  const companyIds = new Set(getCompanyIds(company));
  const companyName = normalize(getCompanyName(company));
  return (
    companyIds.has(cleanText(edge.source_id)) ||
    companyIds.has(cleanText(edge.target_id)) ||
    normalize(edge.mentor_from_name) === companyName ||
    normalize(edge.mentor_to_name) === companyName
  );
}

function detectIntent(question: string, companies: CompanyNode[]): ChatIntent {
  const text = normalize(question);
  const companyMatch = findBestCompanyMatch(question, companies);
  const hasNewsLanguage = /(news|headline|headlines|article|articles|press|newsroom|blog)/.test(text);
  const hasLpLanguage = /(lp|lps|limited partner|limited partners|partner|partners)/.test(text);

  if (hasNewsLanguage && companyMatch) {
    return "latest_news_for_company";
  }
  if (hasNewsLanguage) {
    return "companies_with_recent_news";
  }
  if (hasLpLanguage && /(covers most|touches most|most companies|most active|largest coverage|portfolio coverage)/.test(text)) {
    return "lp_company_coverage";
  }
  if (hasLpLanguage && companyMatch) {
    return "lp_coverage_for_company";
  }
  if (hasLpLanguage && /most|highest|which|who/.test(text)) {
    return "lp_exposure";
  }
  if (/(founder|reach out|who should i|who should we|who to|meet|intro|introduce|talk to|best person)/.test(text)) {
    return "founder_recommendation";
  }
  if (/(most connected|highest degree|largest degree|top compan|connected companies|central compan)/.test(text)) {
    return "top_connected_companies";
  }
  if (/(bridge|bridges|connection between|connected to|strongest connection)/.test(text)) {
    return "bridge_insights";
  }
  if (/(solved|resolve|resolved|handled before|already solved)/.test(text) && /(pain point|pain|challenge|churn|compliance|security|pricing|hiring|partnership|fundraising)/.test(text)) {
    return "who_solved_pain_point";
  }
  if (/(pain point|pain points|facing|struggling|challenge|churn|compliance|security|pricing|hiring|fundraising)/.test(text)) {
    return "companies_with_pain_point";
  }
  if (/(vertical|sector|industry)/.test(text) || /which companies are in/.test(text)) {
    return "companies_by_vertical";
  }
  return "general";
}

function askForLpExposure(companies: CompanyNode[], terms: string[]): ChatReply {
  const matchingCompanies = companies
    .map((company) => ({
      company,
      matchScore: terms.length > 0 ? scoreTextAgainstTerms(buildCompanySearchText(company), terms) : 1,
    }))
    .filter((entry) => terms.length === 0 || entry.matchScore > 0)
    .sort((left, right) => right.matchScore - left.matchScore);

  if (matchingCompanies.length === 0) {
    return {
      intent: "lp_exposure",
      answer: "I could not match that LP question to any companies or verticals in the current graph.",
      highlights: ["Try including a theme like music, healthcare, insurance, or fintech."],
    };
  }

  const rankedOwners = buildOwnerCoverageRanking(matchingCompanies.map((entry) => ({ company: entry.company, weight: entry.matchScore })));
  if (rankedOwners.length === 0) {
    return {
      intent: "lp_exposure",
      answer: "I found matching companies, but there is not any LP coverage metadata attached to them yet.",
      highlights: ["The next pipeline enrichment would be populating `lps_involved` across more company nodes."],
    };
  }

  const topOwner = rankedOwners[0];
  return {
    intent: "lp_exposure",
    answer: topOwner.usesInvestorProxy
      ? `${topOwner.ownerName} has the strongest investor-level exposure proxy for that theme.`
      : `${topOwner.ownerName} has the strongest LP exposure for that theme.`,
    highlights: rankedOwners.slice(0, 4).map(
      (owner) =>
        `${owner.ownerName} — exposure score ${owner.count} across ${owner.companyNames.length} companies: ${owner.companyNames.slice(0, 4).join(", ")}`,
    ),
  };
}

function askForLpCompanyCoverage(companies: CompanyNode[]): ChatReply {
  const rankedOwners = buildOwnerCoverageRanking(companies.map((company) => ({ company, weight: 1 })));
  if (rankedOwners.length === 0) {
    return {
      intent: "lp_company_coverage",
      answer: "There is not enough LP coverage metadata in this bundle yet to rank partner coverage.",
      highlights: ["The clearest next enrichment is adding `lps_involved` for more companies."],
    };
  }

  const topOwner = rankedOwners[0];
  return {
    intent: "lp_company_coverage",
    answer: topOwner.usesInvestorProxy
      ? `${topOwner.ownerName} touches the most companies in this demo bundle based on investor-level coverage.`
      : `${topOwner.ownerName} currently covers the most companies in this demo bundle.`,
    highlights: rankedOwners.slice(0, 5).map(
      (owner) => `${owner.ownerName} — ${owner.companyNames.length} companies: ${owner.companyNames.slice(0, 5).join(", ")}`,
    ),
  };
}

function askForLpCoverageForCompany(question: string, companies: CompanyNode[]): ChatReply {
  const company = findBestCompanyMatch(question, companies);
  if (!company) {
    return {
      intent: "lp_coverage_for_company",
      answer: "I could not tell which company you meant.",
      highlights: ["Try naming the company directly, for example: Which LPs are involved with GeoVera Holdings?"],
    };
  }

  const rankedOwners = buildOwnerCoverageRanking([{ company, weight: 1 }]);
  if (rankedOwners.length === 0) {
    return {
      intent: "lp_coverage_for_company",
      answer: `I do not see LP coverage metadata attached to ${getCompanyName(company)} yet.`,
      highlights: ["This company exists in the graph, but its LP coverage fields are empty in the current bundle."],
    };
  }

  return {
    intent: "lp_coverage_for_company",
    answer: `These are the LPs or coverage owners attached to ${getCompanyName(company)}.`,
    highlights: [
      ...rankedOwners.map((owner) => owner.ownerName),
      company.vertical ? `Vertical: ${company.vertical}` : "",
    ].filter(Boolean),
  };
}

function askForFounderRecommendations(question: string, companies: CompanyNode[], people: PeopleNode[], terms: string[]): ChatReply {
  const companyMatch = findBestCompanyMatch(question, companies);
  const companyName = companyMatch ? normalize(getCompanyName(companyMatch)) : "";

  const rankedPeople = people
    .filter((person) => person.name || person.label)
    .map((person) => {
      const searchText = buildPersonSearchText(person);
      const trustSignals = person.trust_signals ?? [];
      const matchScore = terms.length > 0 ? scoreTextAgainstTerms(searchText, terms) : 0;
      const companyBoost = companyName && normalize(person.company) === companyName ? 4 : 0;
      const baseScore =
        parseScore(person.network_importance_score) * 1.5 +
        parseScore(person.engagement_score) +
        parseScore(person.reliability_score) +
        parseScore(person.shared_connection_count) * 0.5 +
        parseScore(person.successful_collaboration_count) * 0.8 +
        trustSignals.length;

      return {
        personName: getPersonName(person),
        company: cleanText(person.company) || "Unknown company",
        role: cleanText(person.title ?? person.suggested_role) || "Network contact",
        score: baseScore + matchScore * 3 + companyBoost,
        reason:
          cleanText(person.connection_summary) ||
          cleanText(person.resolved_pain_points_label) ||
          cleanText(person.current_pain_point_label) ||
          (trustSignals.length > 0 ? trustSignals.join(", ") : "strong network positioning"),
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 4);

  if (rankedPeople.length === 0) {
    return {
      intent: "founder_recommendation",
      answer: "I could not build a strong outreach recommendation from the current people graph.",
      highlights: ["Try adding a company, vertical, or pain-point term to focus the ranking."],
    };
  }

  return {
    intent: "founder_recommendation",
    answer: "These are the strongest people to reach out to from the current network graph.",
    highlights: rankedPeople.map(
      (person) =>
        `${person.personName} (${person.role}) at ${person.company} — ${person.reason.slice(0, 160)}${
          person.reason.length > 160 ? "..." : ""
        }`,
    ),
  };
}

function askForTopConnected(companies: CompanyNode[], terms: string[]): ChatReply {
  const rankedCompanies = companies
    .map((company) => ({
      company,
      matchScore: terms.length > 0 ? scoreTextAgainstTerms(buildCompanySearchText(company), terms) : 1,
      degree: parseScore(company.degree),
      peopleCount: parseScore(company.people_count),
    }))
    .filter((entry) => terms.length === 0 || entry.matchScore > 0)
    .sort((left, right) => right.matchScore - left.matchScore || right.degree - left.degree || right.peopleCount - left.peopleCount)
    .slice(0, 5);

  if (rankedCompanies.length === 0) {
    return {
      intent: "top_connected_companies",
      answer: "No company nodes matched that request.",
      highlights: [],
    };
  }

  return {
    intent: "top_connected_companies",
    answer: terms.length > 0 ? "These are the most connected companies matching that theme." : "Top connected companies in the current graph are:",
    highlights: rankedCompanies.map(
      (entry) =>
        `${getCompanyName(entry.company)} — degree ${entry.degree}${entry.company.vertical ? ` (${entry.company.vertical})` : ""}`,
    ),
  };
}

function askForBridgeInsights(question: string, companies: CompanyNode[], edges: EdgeNode[]): ChatReply {
  const company = findBestCompanyMatch(question, companies);
  const relevantEdges = company ? edges.filter((edge) => edgeTouchesCompany(edge, company)) : edges;

  const ranked = relevantEdges
    .map((edge) => ({
      source: cleanText(edge.mentor_from_name) || "Unknown company",
      target: cleanText(edge.mentor_to_name) || "Unknown company",
      score: parseScore(edge.score),
      reason: cleanText(edge.reason ?? edge.explanation) || "No reason available.",
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 5);

  if (ranked.length === 0) {
    return {
      intent: "bridge_insights",
      answer: company
        ? `I do not see bridge edges attached to ${getCompanyName(company)} yet.`
        : "There are no bridge edges in this graph yet.",
      highlights: [],
    };
  }

  return {
    intent: "bridge_insights",
    answer: company
      ? `These are the strongest bridges for ${getCompanyName(company)}.`
      : "These are the strongest bridge opportunities I can read from the graph.",
    highlights: ranked.map(
      (item) =>
        `${item.source} ↔ ${item.target} (score ${item.score.toFixed(3)}) — ${item.reason.slice(0, 140)}${
          item.reason.length > 140 ? "..." : ""
        }`,
    ),
  };
}

function askForCompaniesByVertical(companies: CompanyNode[], terms: string[]): ChatReply {
  const rankedCompanies = companies
    .map((company) => ({
      company,
      matchScore: scoreTextAgainstTerms(
        normalize([company.vertical, company.taxonomy_tokens, getCompanyName(company)].filter(Boolean).join(" ")),
        terms,
      ),
      degree: parseScore(company.degree),
    }))
    .filter((entry) => entry.matchScore > 0)
    .sort((left, right) => right.matchScore - left.matchScore || right.degree - left.degree)
    .slice(0, 6);

  if (rankedCompanies.length > 0) {
    return {
      intent: "companies_by_vertical",
      answer: "These companies are the closest matches for that sector or vertical.",
      highlights: rankedCompanies.map(
        (entry) =>
          `${getCompanyName(entry.company)}${entry.company.vertical ? ` — ${entry.company.vertical}` : ""}${entry.company.stage ? ` | ${entry.company.stage}` : ""}`,
      ),
    };
  }

  const verticalCounts = new Map<string, number>();
  for (const company of companies) {
    const vertical = cleanText(company.vertical);
    if (!vertical) {
      continue;
    }
    verticalCounts.set(vertical, (verticalCounts.get(vertical) ?? 0) + 1);
  }

  const topVerticals = [...verticalCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 6);

  return {
    intent: "companies_by_vertical",
    answer: "I could not map that exact sector phrase, but these are the biggest verticals in the current graph.",
    highlights: topVerticals.map(([vertical, count]) => `${vertical} — ${count} companies`),
  };
}

function askForCompaniesWithPainPoint(companies: CompanyNode[], terms: string[]): ChatReply {
  const rankedCompanies = companies
    .map((company) => {
      const currentTags = parseTagList(company.current_pain_point_tags);
      const searchText = normalize(
        [currentTags.join(" "), company.people_current_pain_point_overview, getCompanyName(company), company.vertical]
          .filter(Boolean)
          .join(" "),
      );

      return {
        company,
        currentTags,
        matchScore: scoreTextAgainstTerms(searchText, terms),
        degree: parseScore(company.degree),
      };
    })
    .filter((entry) => entry.matchScore > 0)
    .sort((left, right) => right.matchScore - left.matchScore || right.degree - left.degree)
    .slice(0, 6);

  if (rankedCompanies.length > 0) {
    return {
      intent: "companies_with_pain_point",
      answer: "These companies are the strongest matches for that current pain point.",
      highlights: rankedCompanies.map(
        (entry) =>
          `${getCompanyName(entry.company)} — ${entry.currentTags.length > 0 ? entry.currentTags.map(formatTagLabel).join(", ") : "pain point labels are sparse"}`,
      ),
    };
  }

  const painPointCounts = new Map<string, number>();
  for (const company of companies) {
    for (const tag of parseTagList(company.current_pain_point_tags)) {
      painPointCounts.set(tag, (painPointCounts.get(tag) ?? 0) + 1);
    }
  }

  const topPainPoints = [...painPointCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 6);

  return {
    intent: "companies_with_pain_point",
    answer: "I could not map that exact pain-point phrase, but these are the most common current pain points in the graph.",
    highlights: topPainPoints.map(([tag, count]) => `${formatTagLabel(tag)} — ${count} companies`),
  };
}

function askForWhoSolvedPainPoint(companies: CompanyNode[], people: PeopleNode[], terms: string[]): ChatReply {
  const rankedPeople = people
    .map((person) => {
      const searchText = normalize(
        [person.resolved_pain_points_label, person.connection_summary, person.company, person.vertical].filter(Boolean).join(" "),
      );
      const matchScore = scoreTextAgainstTerms(searchText, terms);
      return {
        person,
        matchScore,
        score:
          matchScore * 4 +
          parseScore(person.reliability_score) +
          parseScore(person.successful_collaboration_count) +
          (person.trust_signals?.length ?? 0),
      };
    })
    .filter((entry) => entry.matchScore > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 4);

  if (rankedPeople.length > 0) {
    return {
      intent: "who_solved_pain_point",
      answer: "These people look best positioned to help with that resolved pain point.",
      highlights: rankedPeople.map((entry) => {
        const person = entry.person;
        const role = cleanText(person.title ?? person.suggested_role) || "Network contact";
        const resolvedContext = cleanText(person.resolved_pain_points_label) || cleanText(person.connection_summary);
        return `${getPersonName(person)} (${role}) at ${cleanText(person.company) || "Unknown company"} — ${resolvedContext.slice(0, 160)}${
          resolvedContext.length > 160 ? "..." : ""
        }`;
      }),
    };
  }

  const rankedCompanies = companies
    .map((company) => {
      const resolvedTags = parseTagList(company.resolved_pain_point_tags);
      const searchText = normalize(
        [resolvedTags.join(" "), company.people_resolved_pain_point_overview, getCompanyName(company), company.vertical]
          .filter(Boolean)
          .join(" "),
      );
      return {
        company,
        resolvedTags,
        matchScore: scoreTextAgainstTerms(searchText, terms),
        degree: parseScore(company.degree),
      };
    })
    .filter((entry) => entry.matchScore > 0)
    .sort((left, right) => right.matchScore - left.matchScore || right.degree - left.degree)
    .slice(0, 5);

  if (rankedCompanies.length > 0) {
    return {
      intent: "who_solved_pain_point",
      answer: "These companies show the strongest resolved signals for that challenge.",
      highlights: rankedCompanies.map(
        (entry) =>
          `${getCompanyName(entry.company)} — ${entry.resolvedTags.length > 0 ? entry.resolvedTags.map(formatTagLabel).join(", ") : "resolved pain point metadata is sparse"}`,
      ),
    };
  }

  return {
    intent: "who_solved_pain_point",
    answer: "I could not find a strong resolved-pain-point match for that question.",
    highlights: ["Try naming the challenge more directly, for example customer churn, compliance, pricing, or hiring."],
  };
}

function askForLatestNewsForCompany(question: string, companies: CompanyNode[]): ChatReply {
  const company = findBestCompanyMatch(question, companies);
  if (!company) {
    return {
      intent: "latest_news_for_company",
      answer: "I could not tell which company you wanted news for.",
      highlights: ["Try naming the company directly, for example: Show me the latest news for Baker Hill."],
    };
  }

  const newsItems = parseNewsItems(company.latest_news);
  if (newsItems.length === 0) {
    return {
      intent: "latest_news_for_company",
      answer: `I do not have any scraped news items for ${getCompanyName(company)} right now.`,
      highlights: [company.website ? `Website on file: ${company.website}` : "No website was captured for this company in the current bundle."],
    };
  }

  return {
    intent: "latest_news_for_company",
    answer: `Here is the latest news I found for ${getCompanyName(company)}.`,
    highlights: newsItems.slice(0, 4).map((item) => `${item.datePublished ? `${item.datePublished} — ` : ""}${item.title}`),
  };
}

function askForCompaniesWithRecentNews(companies: CompanyNode[], terms: string[]): ChatReply {
  const rankedCompanies = companies
    .map((company) => {
      const newsItems = parseNewsItems(company.latest_news);
      return {
        company,
        newsItems,
        matchScore: terms.length > 0 ? scoreTextAgainstTerms(buildCompanySearchText(company), terms) : 1,
        degree: parseScore(company.degree),
      };
    })
    .filter((entry) => entry.newsItems.length > 0 && (terms.length === 0 || entry.matchScore > 0))
    .sort((left, right) => right.matchScore - left.matchScore || right.newsItems.length - left.newsItems.length || right.degree - left.degree)
    .slice(0, 5);

  if (rankedCompanies.length === 0) {
    return {
      intent: "companies_with_recent_news",
      answer: "I do not see any companies with mapped news matching that request right now.",
      highlights: [],
    };
  }

  return {
    intent: "companies_with_recent_news",
    answer: "These companies currently have mapped recent news in the graph bundle.",
    highlights: rankedCompanies.map(
      (entry) =>
        `${getCompanyName(entry.company)} — ${entry.newsItems.length} article${entry.newsItems.length === 1 ? "" : "s"}${
          entry.newsItems[0] ? ` | Latest: ${entry.newsItems[0].title.slice(0, 90)}${entry.newsItems[0].title.length > 90 ? "..." : ""}` : ""
        }`,
    ),
  };
}

function answerGraphQuestion(question: string, companyPayload: CompanyNetworkPayload, peoplePayload: PeopleNetworkPayload): ChatReply {
  const companies = companyPayload.nodes ?? [];
  const people = peoplePayload.nodes ?? [];
  const edges = companyPayload.edges ?? [];
  const terms = extractQueryTerms(question);
  const intent = detectIntent(question, companies);

  if (intent === "lp_exposure") {
    return askForLpExposure(companies, terms);
  }
  if (intent === "lp_company_coverage") {
    return askForLpCompanyCoverage(companies);
  }
  if (intent === "lp_coverage_for_company") {
    return askForLpCoverageForCompany(question, companies);
  }
  if (intent === "founder_recommendation") {
    return askForFounderRecommendations(question, companies, people, terms);
  }
  if (intent === "top_connected_companies") {
    return askForTopConnected(companies, terms);
  }
  if (intent === "bridge_insights") {
    return askForBridgeInsights(question, companies, edges);
  }
  if (intent === "companies_by_vertical") {
    return askForCompaniesByVertical(companies, terms);
  }
  if (intent === "companies_with_pain_point") {
    return askForCompaniesWithPainPoint(companies, terms);
  }
  if (intent === "who_solved_pain_point") {
    return askForWhoSolvedPainPoint(companies, people, terms);
  }
  if (intent === "latest_news_for_company") {
    return askForLatestNewsForCompany(question, companies);
  }
  if (intent === "companies_with_recent_news") {
    return askForCompaniesWithRecentNews(companies, terms);
  }

  const companyMatch = findBestCompanyMatch(question, companies);
  if (companyMatch) {
    const lpOwners = buildOwnerCoverageRanking([{ company: companyMatch, weight: 1 }]);
    const currentPainPoints = parseTagList(companyMatch.current_pain_point_tags);
    const newsItems = parseNewsItems(companyMatch.latest_news);
    return {
      intent: "general",
      answer: `Here is the current network snapshot for ${getCompanyName(companyMatch)}.`,
      highlights: [
        companyMatch.vertical ? `Vertical: ${companyMatch.vertical}` : "Vertical: not labeled",
        `Company bridges: ${parseScore(companyMatch.degree)}`,
        currentPainPoints.length > 0
          ? `Current pain points: ${currentPainPoints.map(formatTagLabel).join(", ")}`
          : "Current pain points: none mapped",
        lpOwners.length > 0 ? `LPs involved: ${lpOwners.map((owner) => owner.ownerName).join(", ")}` : "LPs involved: none mapped",
        `Latest news items mapped: ${newsItems.length}`,
      ],
    };
  }

  if (terms.length > 0) {
    const companyMatches = companies
      .map((company) => ({
        company,
        score: scoreTextAgainstTerms(buildCompanySearchText(company), terms),
      }))
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score || parseScore(right.company.degree) - parseScore(left.company.degree))
      .slice(0, 4);

    if (companyMatches.length > 0) {
      return {
        intent: "general",
        answer: "Here are the best-matched companies from your current graph for that question.",
        highlights: companyMatches.map(
          (entry) =>
            `${getCompanyName(entry.company)} — match score ${entry.score}${entry.company.vertical ? ` | ${entry.company.vertical}` : ""}`,
        ),
      };
    }
  }

  return {
    intent: "general",
    answer: "I can answer graph questions about LP exposure, people to reach out to, strongest bridges, pain points, verticals, and recent news.",
    highlights: [
      "Try: Which LP has the most exposure to Music and live events?",
      "Try: Which companies are most connected in this network?",
      "Try: What are the strongest bridges for GeoVera Holdings?",
      "Try: Which companies are facing customer churn?",
      "Try: Show me the latest news for Baker Hill.",
      "Try: Which LPs are involved with Create Music Group?",
    ],
  };
}

export async function POST(request: Request) {
  try {
    const currentUser = await requireCurrentUser();
    const body = await request.json();
    const question = parseRequestText(body);
    const scope = resolveDashboardScopeForEmail(currentUser.email);
    const scopeConfig = getDashboardScopeConfig(scope);

    const [companyNetwork, peopleNetwork] = await Promise.all([
      readJson<CompanyNetworkPayload>(scopeConfig.bundleRoot, "company_network_data.json"),
      readJson<PeopleNetworkPayload>(scopeConfig.bundleRoot, "people_network_data.json"),
    ]);

    const response = answerGraphQuestion(question, companyNetwork, peopleNetwork);
    return ok({
      question,
      scope,
      scopeLabel: scopeConfig.scopeLabel,
      ...response,
    });
  } catch (error) {
    return fail(error);
  }
}
