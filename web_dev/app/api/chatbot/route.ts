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

type ChatHighlight =
  | string
  | {
      text: string;
      url?: string | null;
      modalType?: "company" | "person" | "partner" | "latest_news";
      companyId?: string | null;
      companyName?: string | null;
      personId?: string | null;
      personName?: string | null;
      partnerId?: string | null;
      partnerName?: string | null;
    };

type ChatReply = {
  intent: ChatIntent;
  answer: string;
  highlights: ChatHighlight[];
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
  return String(value)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
    "companies",
    "company",
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
    "networks",
    "of",
    "on",
    "sector",
    "should",
    "show",
    "the",
    "this",
    "to",
    "vertical",
    "verticals",
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

function getCompanyLookupId(company: CompanyNode | null | undefined): string | null {
  if (!company) {
    return null;
  }

  return cleanText(company.id ?? company.company_id) || cleanText(company.company_name) || null;
}

function findCompanyByName(companyName: string | null | undefined, companies: CompanyNode[]): CompanyNode | null {
  const normalizedName = normalize(companyName);

  if (!normalizedName) {
    return null;
  }

  return companies.find((company) => normalize(getCompanyName(company)) === normalizedName) ?? null;
}

function getPersonName(person: PeopleNode): string {
  return cleanText(person.name ?? person.label) || "Unknown person";
}

function getPersonRole(person: PeopleNode): string {
  const preferredTitle = cleanText(person.title);
  if (
    preferredTitle &&
    !/company:|current pain point:|resolved pain points?:/i.test(preferredTitle) &&
    normalize(preferredTitle) !== normalize(getPersonName(person))
  ) {
    return preferredTitle;
  }

  const suggestedRole = cleanText(person.suggested_role);
  if (suggestedRole) {
    return formatTagLabel(suggestedRole);
  }

  return "Network contact";
}

function formatPeopleRecommendationReason(reason: string): string {
  const cleaned = cleanText(reason);
  if (!cleaned) {
    return "they are well positioned in this network and look like a strong introduction candidate";
  }

  const mixedPainMatch = cleaned.match(/^Mixed Pain Point Similarity:\s*(.+?)\.\s*(.*)$/i);
  if (mixedPainMatch) {
    const topics = cleanText(mixedPainMatch[1]);
    const remainder = cleanText(mixedPainMatch[2]);
    if (/boosted by/i.test(remainder)) {
      return `they have relevant experience with ${topics.toLowerCase()} and rank highly in the network because they are active, credible, and a strong fit for this type of introduction`;
    }
    return `they have relevant experience with ${topics.toLowerCase()} and look like a strong fit for this introduction`;
  }

  const resolvedMatch = cleaned.match(/^Resolved-to-Current Match:\s*(.+?)\.\s*(.*)$/i);
  if (resolvedMatch) {
    const topics = cleanText(resolvedMatch[1]);
    const remainder = cleanText(resolvedMatch[2]);
    if (/boosted by/i.test(remainder)) {
      return `they have already worked through related challenges such as ${topics.toLowerCase()} and rank highly in the network because they are active, credible, and well connected`;
    }
    return `they have already worked through related challenges such as ${topics.toLowerCase()}`;
  }

  const boostedMatch = cleaned.match(/^Importance\s+[\d.]+\s+vs\s+base\s+[\d.]+,\s+boosted by\s+(.+)$/i);
  if (boostedMatch) {
    const boosts = cleanText(boostedMatch[1])
      .replace(/linkedin presence/gi, "a visible professional profile")
      .replace(/mentor fit/gi, "strong mentor fit")
      .replace(/shared vc context/gi, "shared VC context");
    return `they rank highly in the network because of ${boosts.toLowerCase()}`;
  }

  return cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
}

function formatOutreachPersonHighlight(
  person: { personName: string; company: string; reason: string },
  index: number,
): string {
  const reason = formatPeopleRecommendationReason(person.reason);
  const templates = [
    `${person.personName} at ${person.company} looks especially relevant because ${reason}.`,
    `${person.personName} from ${person.company} could be a useful contact here because ${reason}.`,
    `Another strong option is ${person.personName} at ${person.company}, because ${reason}.`,
    `${person.personName} is also worth considering. At ${person.company}, ${reason}.`,
  ];

  return templates[index % templates.length];
}

function formatLpOutreachHighlight(
  owner: { ownerName: string; companyNames: string[]; count: number; usesInvestorProxy: boolean },
  index: number,
): string {
  const exampleCompanies = owner.companyNames.slice(0, 3).join(", ");
  const coverageNoun = owner.usesInvestorProxy ? "investor-side" : "LP";
  const templates = [
    `${owner.ownerName} could also be a strong ${coverageNoun} contact because they are already connected to ${exampleCompanies}.`,
    `On the ${coverageNoun} side, ${owner.ownerName} stands out because they already cover ${exampleCompanies}.`,
    `${owner.ownerName} is also worth considering as a ${coverageNoun} contact, with exposure across ${owner.count} matching companies including ${exampleCompanies}.`,
  ];

  return templates[index % templates.length];
}

function buildStructuredPersonHighlight(
  person: { personId: string; personName: string; company: string; reason: string },
  index: number,
  companies: CompanyNode[],
  textOverride?: string | null,
): ChatHighlight {
  const company = findCompanyByName(person.company, companies);

  return {
    text: textOverride || formatOutreachPersonHighlight(person, index),
    modalType: "person",
    companyId: getCompanyLookupId(company),
    companyName: company ? getCompanyName(company) : person.company,
    personId: person.personId || null,
    personName: person.personName,
  };
}

function buildStructuredPartnerHighlight(
  owner: { ownerName: string; companyNames: string[]; count: number; usesInvestorProxy: boolean },
  index: number,
  companies: CompanyNode[],
  preferredCompanyName?: string | null,
  textOverride?: string | null,
): ChatHighlight {
  const fallbackCompanyName = preferredCompanyName || owner.companyNames[0] || null;
  const company = findCompanyByName(fallbackCompanyName, companies);

  return {
    text: textOverride || formatLpOutreachHighlight(owner, index),
    modalType: "partner",
    companyId: getCompanyLookupId(company),
    companyName: company ? getCompanyName(company) : fallbackCompanyName,
    partnerName: owner.ownerName,
  };
}

function buildCompanyPartnerHighlight(
  owner: { ownerName: string },
  company: CompanyNode,
): ChatHighlight {
  return {
    text: owner.ownerName,
    modalType: "partner",
    companyId: getCompanyLookupId(company),
    companyName: getCompanyName(company),
    partnerName: owner.ownerName,
  };
}

function buildLatestNewsModalHighlight(company: CompanyNode, textOverride?: string | null): ChatHighlight {
  return {
    text: textOverride || `Open ${getCompanyName(company)} latest news`,
    modalType: "latest_news",
    companyId: getCompanyLookupId(company),
    companyName: getCompanyName(company),
  };
}

function buildCompanyModalHighlight(company: CompanyNode, text: string): ChatHighlight {
  return {
    text,
    modalType: "company",
    companyId: getCompanyLookupId(company),
    companyName: getCompanyName(company),
  };
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

function buildLpExposureSearchText(company: CompanyNode): string {
  return normalize(
    [
      company.vertical,
      company.taxonomy_tokens,
      company.summary,
      company.location,
      company.location_region,
      company.stage,
      company.people_connection_summary,
      company.people_current_pain_point_overview,
      company.people_resolved_pain_point_overview,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function buildExactTermIndex(searchText: string): Set<string> {
  const words = normalize(searchText).split(" ").filter(Boolean);
  const indexedTerms = new Set(words);

  for (let index = 0; index < words.length - 1; index += 1) {
    indexedTerms.add(`${words[index]} ${words[index + 1]}`);
  }

  return indexedTerms;
}

function scoreExactTermsAgainstText(searchText: string, terms: string[]): number {
  const indexedTerms = buildExactTermIndex(searchText);
  let score = 0;

  for (const term of terms) {
    const normalizedTerm = normalize(term);
    if (!normalizedTerm) {
      continue;
    }
    if (indexedTerms.has(normalizedTerm)) {
      score += normalizedTerm.includes(" ") ? 2 : 1;
    }
  }

  return score;
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
  const genericCompanyTokens = new Set([
    "capital",
    "company",
    "financial",
    "fund",
    "global",
    "group",
    "health",
    "healthcare",
    "holdings",
    "insurance",
    "management",
    "network",
    "partners",
    "services",
    "solutions",
    "technology",
    "technologies",
  ]);

  const ranked = companies
    .map((company) => {
      const companyName = normalize(getCompanyName(company));
      const tokens = companyName
        .split(" ")
        .filter((token) => token.length > 2 && !genericCompanyTokens.has(token));
      let score = 0;
      let tokenMatches = 0;
      let longestMatchedTokenLength = 0;

      if (companyName && text.includes(companyName)) {
        score += 100 + companyName.split(" ").length;
      }

      for (const token of tokens) {
        if (text.includes(token)) {
          tokenMatches += 1;
          longestMatchedTokenLength = Math.max(longestMatchedTokenLength, token.length);
        }
      }

      if (tokenMatches >= 2) {
        score += 20 + tokenMatches * 2;
      } else if (tokenMatches === 1 && (tokens.length === 1 || longestMatchedTokenLength >= 7)) {
        score += 8;
      }

      for (const identifier of getCompanyIds(company).map((value) => normalize(value))) {
        if (identifier && text.includes(identifier)) {
          score += 50;
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
  const hasCompanySpecificLpLanguage = /(involved with|attached to|for\s+[a-z0-9]|with\s+[a-z0-9]|covering|covers|backing|backs|on\s+[a-z0-9])/.test(
    text,
  );

  if (hasNewsLanguage && companyMatch) {
    return "latest_news_for_company";
  }
  if (hasNewsLanguage) {
    return "companies_with_recent_news";
  }
  if (hasLpLanguage && /(covers most|touches most|most companies|most active|largest coverage|portfolio coverage)/.test(text)) {
    return "lp_company_coverage";
  }
  if (hasLpLanguage && companyMatch && hasCompanySpecificLpLanguage) {
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
      matchScore: terms.length > 0 ? scoreExactTermsAgainstText(buildLpExposureSearchText(company), terms) : 1,
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
  const tiedOwners = rankedOwners.filter((owner) => owner.count === topOwner.count);
  const topMatchingCompanies = matchingCompanies.slice(0, 5).map((entry) => getCompanyName(entry.company));
  const otherStrongOwnerEntries = rankedOwners.slice(tiedOwners.length > 1 ? tiedOwners.length : 1, tiedOwners.length > 1 ? tiedOwners.length + 3 : 4);

  function preferredCompanyNameForOwner(owner: { companyNames: string[] }) {
    return topMatchingCompanies.find((companyName) => owner.companyNames.includes(companyName)) ?? owner.companyNames[0] ?? null;
  }

  if (tiedOwners.length > 1) {
    return {
      intent: "lp_exposure",
      answer: topOwner.usesInvestorProxy
        ? `There is not a single investor-level leader for that theme yet. The strongest exposure is tied between ${tiedOwners
            .map((owner) => owner.ownerName)
            .join(", ")}.`
        : `There is not a single LP leader for that theme yet. The strongest exposure is tied between ${tiedOwners
            .map((owner) => owner.ownerName)
            .join(", ")}.`,
      highlights: [
        `The clearest matching companies for this theme are ${topMatchingCompanies.join(", ")}.`,
        ...tiedOwners.slice(0, 3).map((owner, index) =>
          buildStructuredPartnerHighlight(
            owner,
            index,
            companies,
            preferredCompanyNameForOwner(owner),
            `${owner.ownerName} is tied for the strongest LP exposure here, spanning ${owner.companyNames.length} matching compan${owner.companyNames.length === 1 ? "y" : "ies"}.`,
          ),
        ),
        ...otherStrongOwnerEntries.slice(0, 1).map((owner, index) =>
          buildStructuredPartnerHighlight(
            owner,
            index + tiedOwners.length,
            companies,
            preferredCompanyNameForOwner(owner),
            `${owner.ownerName} is close behind on this theme.`,
          ),
        ),
      ],
    };
  }

  return {
    intent: "lp_exposure",
    answer: topOwner.usesInvestorProxy
      ? `${topOwner.ownerName} looks like the strongest investor-level match for that theme in this demo graph.`
      : `${topOwner.ownerName} looks like the strongest LP match for that theme in this demo graph.`,
    highlights: [
      buildStructuredPartnerHighlight(
        topOwner,
        0,
        companies,
        preferredCompanyNameForOwner(topOwner),
        `${topOwner.ownerName} is attached to ${topOwner.companyNames.length} matching compan${topOwner.companyNames.length === 1 ? "y" : "ies"}: ${topOwner.companyNames
          .slice(0, 5)
          .join(", ")}.`,
      ),
      `The clearest matching companies for this theme are ${topMatchingCompanies.join(", ")}.`,
      ...otherStrongOwnerEntries.map((owner, index) =>
        buildStructuredPartnerHighlight(
          owner,
          index + 1,
          companies,
          preferredCompanyNameForOwner(owner),
          `${owner.ownerName} also has relevant exposure here.`,
        ),
      ),
    ],
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
    highlights: rankedOwners.slice(0, 5).map((owner, index) =>
      buildStructuredPartnerHighlight(
        owner,
        index,
        companies,
        owner.companyNames[0] ?? null,
        `${owner.ownerName} — ${owner.companyNames.length} companies: ${owner.companyNames.slice(0, 5).join(", ")}`,
      ),
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
    highlights: rankedOwners.map((owner) => buildCompanyPartnerHighlight(owner, company)),
  };
}

function askForFounderRecommendations(question: string, companies: CompanyNode[], people: PeopleNode[], terms: string[]): ChatReply {
  const companyMatch = findBestCompanyMatch(question, companies);
  const companyName = companyMatch ? normalize(getCompanyName(companyMatch)) : "";
  const normalizedQuestion = normalize(question);
  const shouldIncludeLpContacts = /(fundraising|fund raising|raise capital|raise money|investor|investors|lp|lps|limited partner)/.test(
    normalizedQuestion,
  );

  const rankedPeople = people
    .filter((person) => person.name || person.label)
    .map((person) => {
      const searchText = buildPersonSearchText(person);
      const trustSignals = person.trust_signals ?? [];
      const matchScore = terms.length > 0 ? scoreExactTermsAgainstText(searchText, terms) : 0;
      const companyBoost = companyName && normalize(person.company) === companyName ? 4 : 0;
      const baseScore =
        parseScore(person.network_importance_score) * 1.5 +
        parseScore(person.engagement_score) +
        parseScore(person.reliability_score) +
        parseScore(person.shared_connection_count) * 0.5 +
        parseScore(person.successful_collaboration_count) * 0.8 +
        trustSignals.length;

      return {
        personId: cleanText(person.id),
        personName: getPersonName(person),
        company: cleanText(person.company) || "Unknown company",
        role: getPersonRole(person),
        score: baseScore + matchScore * 3 + companyBoost,
        reason:
          cleanText(person.connection_summary) ||
          cleanText(person.resolved_pain_points_label) ||
          cleanText(person.current_pain_point_label) ||
          (trustSignals.length > 0 ? trustSignals.join(", ") : "strong network positioning"),
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, shouldIncludeLpContacts ? 3 : 4);

  const rankedLpContacts = shouldIncludeLpContacts
    ? buildOwnerCoverageRanking(
        companies
          .map((company) => ({
            company,
            weight: terms.length > 0 ? scoreExactTermsAgainstText(buildCompanySearchText(company), terms) : 0,
          }))
          .filter((entry) => entry.weight > 0),
      ).slice(0, 2)
    : [];

  if (rankedPeople.length === 0 && rankedLpContacts.length === 0) {
    return {
      intent: "founder_recommendation",
      answer: "I could not build a strong outreach recommendation from the current graph.",
      highlights: ["Try adding a company, vertical, pain point, or fundraising theme to focus the ranking."],
    };
  }

  const personHighlights = rankedPeople.map((person, index) => buildStructuredPersonHighlight(person, index, companies));
  const lpHighlights = rankedLpContacts.map((owner, index) =>
    buildStructuredPartnerHighlight(owner, index, companies, companyMatch ? getCompanyName(companyMatch) : null),
  );

  return {
    intent: "founder_recommendation",
    answer: shouldIncludeLpContacts
      ? "These are the strongest people and LP-side contacts to reach out to from the current network graph."
      : "These are the strongest people to reach out to from the current network graph.",
    highlights: [...personHighlights, ...lpHighlights].slice(0, 4),
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
    highlights: rankedCompanies.map((entry) => {
      const companyName = getCompanyName(entry.company);
      const bridgeLabel = `${entry.degree} company bridge${entry.degree === 1 ? "" : "s"}`;

      if (terms.length > 0) {
        return buildCompanyModalHighlight(
          entry.company,
          entry.company.vertical
            ? `${companyName} is one of the most connected companies in that theme, with ${bridgeLabel}. It sits in ${entry.company.vertical}.`
            : `${companyName} is one of the most connected companies in that theme, with ${bridgeLabel}.`,
        );
      }

      return buildCompanyModalHighlight(
        entry.company,
        entry.company.vertical
          ? `${companyName} is one of the most connected companies in the current graph, with ${bridgeLabel}. It sits in ${entry.company.vertical}.`
          : `${companyName} is one of the most connected companies in the current graph, with ${bridgeLabel}.`,
      );
    }),
  };
}

function formatBridgeReason(reason: string): string {
  const parts = cleanText(reason)
    .split("|")
    .map((part) => cleanText(part))
    .filter(Boolean)
    .map((part) => {
      const sharedVertical = part.match(/^shared vertical \((.+)\)$/i);
      if (sharedVertical) {
        return `they operate in the same vertical: ${sharedVertical[1]}`;
      }

      const sharedStage = part.match(/^shared stage \((.+)\)$/i);
      if (sharedStage) {
        return `they are at the same stage: ${sharedStage[1]}`;
      }

      const sameRegion = part.match(/^same region \((.+)\)$/i);
      if (sameRegion) {
        return `they share the same region: ${sameRegion[1]}`;
      }

      const sharedPainPoint = part.match(/^shared current pain point \((.+)\)$/i);
      if (sharedPainPoint) {
        return `they are both facing ${sharedPainPoint[1]}`;
      }

      const sharedResolvedPainPoint = part.match(/^shared resolved pain point \((.+)\)$/i);
      if (sharedResolvedPainPoint) {
        return `they have both solved ${sharedResolvedPainPoint[1]}`;
      }

      const sharedFund = part.match(/^shared fund \((.+)\)$/i);
      if (sharedFund) {
        return `they are backed through the same fund: ${sharedFund[1]}`;
      }

      return part;
    });

  if (parts.length === 0) {
    return "they share several strong network similarities";
  }

  if (parts.length === 1) {
    return parts[0];
  }

  if (parts.length === 2) {
    return `${parts[0]}, and ${parts[1]}`;
  }

  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
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
      (item) => {
        if (company) {
          const companyName = getCompanyName(company);
          const counterpart = item.source === companyName ? item.target : item.source;
          const counterpartCompany = findCompanyByName(counterpart, companies);
          const highlightText = `${counterpart} is one of the strongest bridge matches for ${companyName} with a score of ${item.score.toFixed(
            3,
          )} because ${formatBridgeReason(item.reason)}.`;

          return counterpartCompany ? buildCompanyModalHighlight(counterpartCompany, highlightText) : highlightText;
        }

        return `${item.source} and ${item.target} form a strong bridge with a score of ${item.score.toFixed(
          3,
        )} because ${formatBridgeReason(item.reason)}.`;
      },
    ),
  };
}

function askForCompaniesByVertical(companies: CompanyNode[], terms: string[]): ChatReply {
  const rankedCompanies = companies
    .map((company) => ({
      company,
      matchScore: scoreExactTermsAgainstText(
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
          buildCompanyModalHighlight(
            entry.company,
            `${getCompanyName(entry.company)}${entry.company.vertical ? ` — ${entry.company.vertical}` : ""}${entry.company.stage ? ` | ${entry.company.stage}` : ""}`,
          ),
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
      highlights: rankedCompanies.map((entry) =>
        buildCompanyModalHighlight(entry.company, getCompanyName(entry.company)),
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
        return buildStructuredPersonHighlight(
          {
            personId: cleanText(person.id),
            personName: getPersonName(person),
            company: cleanText(person.company) || "Unknown company",
            reason: resolvedContext,
          },
          0,
          companies,
          `${getPersonName(person)} (${role}) at ${cleanText(person.company) || "Unknown company"} — ${resolvedContext.slice(0, 160)}${
            resolvedContext.length > 160 ? "..." : ""
          }`,
        );
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
          buildCompanyModalHighlight(
            entry.company,
            `${getCompanyName(entry.company)} — ${
              entry.resolvedTags.length > 0 ? entry.resolvedTags.map(formatTagLabel).join(", ") : "resolved pain point metadata is sparse"
            }`,
          ),
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
    answer: `Here is the latest news I found for ${getCompanyName(company)}. You can open the full news list or jump straight to the newest articles.`,
    highlights: [
      buildLatestNewsModalHighlight(company),
      ...newsItems.slice(0, 3).map((item) => ({
        text: `${item.datePublished ? `${item.datePublished} — ` : ""}${item.title}`,
        url: item.articleUrl,
      })),
    ],
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
    highlights: rankedCompanies.map((entry) =>
      buildLatestNewsModalHighlight(
        entry.company,
        `${getCompanyName(entry.company)} — ${entry.newsItems.length} article${entry.newsItems.length === 1 ? "" : "s"}${
          entry.newsItems[0] ? ` | Latest: ${entry.newsItems[0].title.slice(0, 90)}${entry.newsItems[0].title.length > 90 ? "..." : ""}` : ""
        }`,
      ),
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
        buildCompanyModalHighlight(
          companyMatch,
          `Open ${getCompanyName(companyMatch)} company snapshot`,
        ),
        companyMatch.vertical ? `Vertical: ${companyMatch.vertical}` : "Vertical: not labeled",
        `Company bridges: ${parseScore(companyMatch.degree)}`,
        currentPainPoints.length > 0
          ? `Current pain points: ${currentPainPoints.map(formatTagLabel).join(", ")}`
          : "Current pain points: none mapped",
        ...(lpOwners.length > 0 ? lpOwners.slice(0, 2).map((owner) => buildCompanyPartnerHighlight(owner, companyMatch)) : ["LPs involved: none mapped"]),
        ...(newsItems.length > 0 ? [buildLatestNewsModalHighlight(companyMatch, `Latest news items mapped: ${newsItems.length}`)] : [`Latest news items mapped: ${newsItems.length}`]),
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
            buildCompanyModalHighlight(
              entry.company,
              `${getCompanyName(entry.company)} — match score ${entry.score}${entry.company.vertical ? ` | ${entry.company.vertical}` : ""}`,
            ),
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
