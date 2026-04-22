import { readFile } from "node:fs/promises";
import path from "node:path";

import { ApiError, fail, ok } from "@/lib/server/http";

const A16Z_BUNDLE_ROOT = path.resolve(process.cwd(), "../network_pipeline/public/a16z-crypto");

type CompanyNode = {
  company_name?: string | null;
  company_id?: string | null;
  id?: string | null;
  vertical?: string | null;
  degree?: number | string | null;
  lps_involved?: string[] | string | null;
  investor_names?: string | null;
  investor_names_label?: string | null;
  taxonomy_tokens?: string | null;
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
  network_importance_score?: number | string | null;
  engagement_score?: number | string | null;
  reliability_score?: number | string | null;
  trust_signals?: string[] | null;
  vertical?: string | null;
  connection_summary?: string | null;
};

type CompanyNetworkPayload = {
  nodes?: CompanyNode[];
  edges?: EdgeNode[];
};

type PeopleNetworkPayload = {
  nodes?: PeopleNode[];
};

type ChatIntent = "lp_exposure" | "founder_recommendation" | "top_connected_companies" | "bridge_insights" | "general";

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

async function readJson<T>(fileName: string): Promise<T> {
  const data = await readFile(path.join(A16Z_BUNDLE_ROOT, fileName), "utf-8");
  return JSON.parse(data) as T;
}

function extractQueryTerms(question: string): string[] {
  const stopWords = new Set([
    "a",
    "about",
    "and",
    "does",
    "do",
    "for",
    "from",
    "have",
    "how",
    "i",
    "into",
    "is",
    "it",
    "me",
    "most",
    "of",
    "on",
    "the",
    "to",
    "what",
    "which",
    "who",
    "should",
    "with",
    "have",
    "i",
    "i'd",
    "my",
    "we",
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

function detectIntent(question: string): ChatIntent {
  const text = normalize(question);
  if (/(lp|lps|limited partner|limited partners)/.test(text) && /most|highest|which|who/.test(text)) {
    return "lp_exposure";
  }
  if (/(founder|reach out|whom|who should|who to|meet|intro|introduce)/.test(text)) {
    return "founder_recommendation";
  }
  if (/(most connected|highest degree|largest degree|top company|connected companies)/.test(text)) {
    return "top_connected_companies";
  }
  if (/(bridge|bridge edge|connected to|connection between|edges)/.test(text)) {
    return "bridge_insights";
  }
  return "general";
}

function askForLpExposure(companies: CompanyNode[], terms: string[]): ChatReply {
  const matchingCompanies = companies
    .map((company) => {
      const searchableText = normalize(
        [company.vertical, company.taxonomy_tokens, company.company_name]
          .filter(Boolean)
          .join(" "),
      );
      const score = terms.length > 0 ? terms.filter((term) => searchableText.includes(term)).length : 0;
      const lps = parseDisplayStringList(company.lps_involved);
      const investorNames = parseDisplayStringList(company.investor_names);
      const investorProxy =
        investorNames.length > 0
          ? investorNames
          : cleanText(company.investor_names_label)
            ? [cleanText(company.investor_names_label)]
            : [];

      return {
        companyName: company.company_name ?? company.company_id ?? company.id ?? "Unknown company",
        lps,
        investorProxy,
        matchScore: score,
      };
    })
    .filter((entry) => entry.matchScore > 0 || terms.length === 0)
    .sort((left, right) => right.matchScore - left.matchScore);

  if (matchingCompanies.length === 0) {
    return {
      intent: "lp_exposure",
      answer: "I could not match that LP query to any portfolio verticals right now.",
      highlights: ["Try including a vertical keyword like Music, Healthcare, or Fintech."],
    };
  }

  const exposure = new Map<string, { count: number; companies: Set<string> }>();
  const usingInvestorProxyOnly = matchingCompanies.every(
    (item) => item.lps.length === 0 && item.investorProxy.length > 0,
  );

  for (const item of matchingCompanies) {
    const coverageOwners = item.lps.length > 0 ? item.lps : item.investorProxy;
    for (const owner of coverageOwners) {
      if (!owner) {
        continue;
      }
      const bucket = exposure.get(owner) ?? { count: 0, companies: new Set<string>() };
      bucket.count += item.matchScore || 1;
      bucket.companies.add(item.companyName);
      exposure.set(owner, bucket);
    }
  }

  const ranked = [...exposure.entries()]
    .map(([lpName, value]) => ({
      lpName,
      count: value.count,
      companies: [...value.companies],
    }))
    .sort((left, right) => right.count - left.count || right.companies.length - left.companies.length);

  if (ranked.length === 0) {
    return {
      intent: "lp_exposure",
      answer: "I found matching companies, but there still is not any investor or LP coverage metadata attached to them.",
      highlights: ["The quickest fix is populating `lps_involved` into the published company graph bundle."],
    };
  }

  const top = ranked[0];
  return {
    intent: "lp_exposure",
    answer: usingInvestorProxyOnly
      ? `${top.lpName} has the strongest investor-level exposure proxy for that theme.`
      : `${top.lpName} has the strongest LP exposure for that theme.`,
    highlights: [
      `Total exposure score: ${top.count}`,
      `Appears in ${top.companies.length} matching company/vertical entries.`,
      `Top matching companies: ${top.companies.slice(0, 5).join(", ")}`,
      ...(usingInvestorProxyOnly
        ? ["This answer is using fund-level investor coverage because partner-level LP tags are not populated in the current demo bundle."]
        : []),
    ],
  };
}

function askForFounderRecommendations(people: PeopleNode[], terms: string[]): ChatReply {
  const bySignal = people
    .filter((person) => person.name || person.label)
    .map((person) => {
      const personName = person.name ?? person.label ?? "Unknown founder";
      const vertical = normalize(person.vertical);
      const company = normalize(person.company);
      const matchedTerms = terms.filter((term) => personName.includes(term) || vertical.includes(term) || company.includes(term));
      const baseScore = parseScore(person.network_importance_score) * 1.5 + parseScore(person.engagement_score) + parseScore(person.reliability_score);
      const score = baseScore + matchedTerms.length * 2 + parseScore(person.trust_signals?.length) * 0.75;
      return {
        personName,
        company: person.company ?? "Unknown company",
        role: person.suggested_role ?? "Founder",
        score,
        reason: person.connection_summary ?? (person.trust_signals?.slice(0, 2).join(", ") || "high-priority in-network profile"),
      };
    })
    .sort((left, right) => right.score - left.score);

  const topCandidates = bySignal.slice(0, 3);
  if (topCandidates.length === 0) {
    return {
      intent: "founder_recommendation",
      answer: "I could not build founder recommendations from the current people graph.",
      highlights: ["Retry with a sector term like Music, Healthcare, or Fintech."],
    };
  }

  return {
    intent: "founder_recommendation",
    answer: "Here are the top founder-like people to reach out to based on network position and trust signals:",
    highlights: topCandidates.map(
      (candidate) =>
        `${candidate.personName} (${candidate.role}) at ${candidate.company} — ${candidate.reason.slice(0, 160)}${
          candidate.reason.length > 160 ? "..." : ""
        }`,
    ),
  };
}

function askForTopConnected(companies: CompanyNode[]): ChatReply {
  const ranked = [...companies]
    .map((company) => ({
      companyName: company.company_name ?? company.company_id ?? company.id ?? "Unknown company",
      degree: parseScore(company.degree),
      vertical: company.vertical ?? null,
    }))
    .sort((left, right) => right.degree - left.degree)
    .slice(0, 5);

  if (ranked.length === 0) {
    return {
      intent: "top_connected_companies",
      answer: "No company nodes were available for this query.",
      highlights: [],
    };
  }

  return {
    intent: "top_connected_companies",
    answer: "Top connected companies in the current graph are:",
    highlights: ranked.map((item) => `${item.companyName} — degree ${item.degree} (${item.vertical ?? "unclear vertical"})`),
  };
}

function askForBridgeInsights(edges: EdgeNode[]): ChatReply {
  const ranked = [...edges]
    .map((edge) => ({
      source: edge.mentor_from_name ?? "Unknown company",
      target: edge.mentor_to_name ?? "Unknown company",
      score: parseScore(edge.score),
      reason: edge.reason ?? edge.explanation ?? "No reason available.",
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 5);

  if (ranked.length === 0) {
    return {
      intent: "bridge_insights",
      answer: "There are no bridge edges in this graph yet.",
      highlights: ["Run the network pipeline to generate relationship edges."],
    };
  }

  return {
    intent: "bridge_insights",
    answer: "These are the strongest bridge opportunities I can read from the graph:",
    highlights: ranked.map(
      (item) => `${item.source} ↔ ${item.target} (score ${item.score.toFixed(3)}) — ${item.reason.slice(0, 140)}${
        item.reason.length > 140 ? "..." : ""
      }`,
    ),
  };
}

function answerGraphQuestion(question: string, companyPayload: CompanyNetworkPayload, peoplePayload: PeopleNetworkPayload): ChatReply {
  const terms = extractQueryTerms(question);
  const intent = detectIntent(question);
  const companies = companyPayload.nodes ?? [];
  const people = peoplePayload.nodes ?? [];

  if (intent === "lp_exposure") {
    return askForLpExposure(companies, terms);
  }
  if (intent === "founder_recommendation") {
    return askForFounderRecommendations(people, terms);
  }
  if (intent === "top_connected_companies") {
    return askForTopConnected(companies);
  }
  if (intent === "bridge_insights") {
    return askForBridgeInsights(companyPayload.edges ?? []);
  }

  if (terms.length > 0) {
    const companyScoreByTerm = companies
      .map((company) => {
        const text = normalize(`${company.company_name} ${company.vertical}`);
        const score = terms.filter((term) => text.includes(term)).length;
        return {
          company: company.company_name ?? company.company_id ?? company.id ?? "Unknown company",
          score,
        };
      })
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, 4);

    if (companyScoreByTerm.length > 0) {
      return {
        intent: "general",
        answer: "Here are the best-matched companies from your graph for that question:",
        highlights: companyScoreByTerm.map((entry) => `${entry.company} (match score ${entry.score})`),
      };
    }
  }

  return {
    intent: "general",
    answer: "I can help with LP exposure and founder recommendation questions from the current graph.",
    highlights: [
      "Try: Which LP has the most exposure to Music and live events?",
      "Try: Which founder should I reach out to?",
      "Try: Which companies are most connected in this network?",
    ],
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const question = parseRequestText(body);

    const [companyNetwork, peopleNetwork] = await Promise.all([
      readJson<CompanyNetworkPayload>("company_network_data.json"),
      readJson<PeopleNetworkPayload>("people_network_data.json"),
    ]);

    const response = answerGraphQuestion(question, companyNetwork, peopleNetwork);
    return ok({
      question,
      ...response,
    });
  } catch (error) {
    return fail(error);
  }
}
