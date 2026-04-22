#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = PROJECT_ROOT / "src"
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from network_pipeline.people_builder import (  # noqa: E402
    attach_node_metrics_to_people_df,
    build_people_edges,
    build_people_nodes,
    enrich_company_nodes_with_people,
    prepare_people_dataframe,
    synthesize_people,
)
from network_pipeline.stages.similarity_scoring import _build_company_network  # noqa: E402


PUBLIC_ROOT = PROJECT_ROOT / "public" / "flexpoint-ford"
INVESTMENTS_PATH = PUBLIC_ROOT / "investment_profiles.json"
TEAM_PATH = PUBLIC_ROOT / "team_profiles.json"
DEFAULT_OUTPUT_ROOT = PUBLIC_ROOT
SCOPE = "flexpoint-ford"
SCOPE_LABEL = "Flexpoint Ford"

CURRENT_TAG_BY_VERTICAL = {
    "insurance": ["compliance", "customer_churn"],
    "healthcare": ["ops_scaling", "compliance"],
    "asset_wealth_management": ["pricing", "cash_efficiency"],
    "specialty_finance_lending": ["compliance", "ops_scaling"],
    "media_assets_royalties": ["gtm", "pricing"],
    "business_services_tech": ["ops_scaling", "tech_debt"],
    "tactical_opportunities": ["cash_efficiency", "pricing"],
}

RESOLVED_TAG_BY_VERTICAL = {
    "insurance": ["partnerships", "pricing", "hiring"],
    "healthcare": ["onboarding", "partnerships", "hiring"],
    "asset_wealth_management": ["partnerships", "fundraising", "pricing"],
    "specialty_finance_lending": ["partnerships", "onboarding", "compliance"],
    "media_assets_royalties": ["partnerships", "sales_conversion", "pricing"],
    "business_services_tech": ["partnerships", "hiring", "tech_debt"],
    "tactical_opportunities": ["partnerships", "cash_efficiency", "fundraising"],
}


def clean_text(value: object) -> str:
    if value is None:
        return ""
    return re.sub(r"\s+", " ", str(value)).strip()


def slugify(value: object) -> str:
    text = clean_text(value).lower()
    text = re.sub(r"[&]", " and ", text)
    text = re.sub(r"[.,'()]", "", text)
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


def normalize_name(value: object) -> str:
    text = clean_text(value).lower()
    text = text.replace("&", " and ")
    text = re.sub(r"\b(llc|inc|corp|corporation|holdings|group|company|co)\b", " ", text)
    text = re.sub(r"[^a-z0-9]+", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def infer_vertical_key(sub_sector: str, summary: str) -> str:
    haystack = f"{clean_text(sub_sector)} {clean_text(summary)}".lower()
    if "insurance" in haystack or "reinsurance" in haystack:
        return "insurance"
    if "healthcare" in haystack or "hospital" in haystack or "pharma" in haystack:
        return "healthcare"
    if "wealth" in haystack or "asset" in haystack:
        return "asset_wealth_management"
    if "lending" in haystack or "treasury" in haystack or "mortgage" in haystack or "finance" in haystack:
        return "specialty_finance_lending"
    if "music" in haystack or "royalt" in haystack or "catalog" in haystack:
        return "media_assets_royalties"
    if "tactical" in haystack:
        return "tactical_opportunities"
    return "business_services_tech"


def infer_tags(sub_sector: str, summary: str, status: str) -> tuple[str, str]:
    vertical_key = infer_vertical_key(sub_sector, summary)
    current_tags = list(CURRENT_TAG_BY_VERTICAL.get(vertical_key, ["ops_scaling", "gtm"]))
    resolved_tags = list(RESOLVED_TAG_BY_VERTICAL.get(vertical_key, ["partnerships", "hiring", "pricing"]))

    lowered_summary = clean_text(summary).lower()
    if "data" in lowered_summary or "technology" in lowered_summary or "platform" in lowered_summary:
        if "tech_debt" not in current_tags:
            current_tags.append("tech_debt")
    if "growth" in lowered_summary or "expan" in lowered_summary:
        if "ops_scaling" not in current_tags:
            current_tags.append("ops_scaling")
    if "provider" in lowered_summary or "service" in lowered_summary:
        if "partnerships" not in resolved_tags:
            resolved_tags.append("partnerships")
    if clean_text(status).lower() == "realized":
        resolved_tags.extend(current_tags)

    current_tags = list(dict.fromkeys(current_tags))[:2]
    resolved_tags = [tag for tag in dict.fromkeys(resolved_tags) if tag not in current_tags][:3]
    return ("|".join(current_tags), "|".join(resolved_tags))


def infer_location_region(location: str) -> str:
    cleaned = clean_text(location)
    lowered = cleaned.lower()
    if not cleaned:
        return "Unknown"
    if re.search(r",\s*[A-Z]{2}$", cleaned):
        return "United States"
    if " usa" in lowered or " united states" in lowered:
        return "United States"
    if "uk" in lowered or "u.k." in lowered or "united kingdom" in lowered:
        return "United Kingdom"
    if "canada" in lowered:
        return "Canada"
    if "bermuda" in lowered:
        return "Bermuda"
    if "europe" in lowered:
        return "Europe"
    return "Global"


def website_domain(website: str) -> str | None:
    if not clean_text(website):
        return None
    try:
        parsed = urlparse(website)
        domain = (parsed.netloc or "").lower().replace("www.", "")
        return domain or None
    except Exception:
        return None


def build_taxonomy_tokens(profile: dict[str, Any], sponsors: list[str]) -> str:
    raw = " ".join(
        [
            clean_text(profile.get("name")),
            clean_text(profile.get("summary")),
            clean_text(profile.get("sub_sector")),
            clean_text(profile.get("fund")),
            clean_text(profile.get("status")),
            clean_text(profile.get("location")),
            " ".join(sponsors),
        ]
    ).lower()
    tokens = sorted({token for token in re.findall(r"[a-z0-9]+", raw) if len(token) >= 3})
    return "|".join(tokens)


def normalize_news_items(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        return []

    normalized: list[dict[str, Any]] = []
    for item in value:
        if not isinstance(item, dict):
            continue
        title = clean_text(item.get("title"))
        article_url = clean_text(item.get("article_url"))
        if not title or not article_url:
            continue
        normalized.append(
            {
                "title": title,
                "date_published": clean_text(item.get("date_published")) or None,
                "article_url": article_url,
            }
        )
    return normalized


def investment_match_score(team_investment: str, investment_profile: dict[str, Any]) -> tuple[int, int, int]:
    team_norm = normalize_name(team_investment)
    profile_name_norm = normalize_name(investment_profile.get("name"))
    profile_slug = slugify(investment_profile.get("slug"))
    team_slug = slugify(team_investment)

    exact_name = 1 if team_norm and team_norm == profile_name_norm else 0
    exact_slug = 1 if team_slug and team_slug == profile_slug else 0
    containment = 1 if team_norm and profile_name_norm and (team_norm in profile_name_norm or profile_name_norm in team_norm) else 0
    token_overlap = len(set(team_norm.split()) & set(profile_name_norm.split()))
    return (exact_name + exact_slug, containment, token_overlap)


def match_investment_profile(team_investment: str, investment_profiles: list[dict[str, Any]]) -> dict[str, Any] | None:
    scored = [
        (investment_match_score(team_investment, profile), profile)
        for profile in investment_profiles
    ]
    scored.sort(key=lambda item: item[0], reverse=True)
    best_score, best_profile = scored[0] if scored else ((0, 0, 0), None)
    if best_profile is None:
        return None
    if best_score[0] > 0:
        return best_profile
    if best_score[1] > 0 and best_score[2] > 0:
        return best_profile
    if best_score[2] >= 2:
        return best_profile
    return None


def build_company_sponsor_map(
    team_profiles: list[dict[str, Any]],
    investment_profiles: list[dict[str, Any]],
) -> dict[str, list[str]]:
    sponsors_by_slug: dict[str, list[str]] = defaultdict(list)
    for team_profile in team_profiles:
        team_name = clean_text(team_profile.get("name"))
        for investment_name in team_profile.get("investments") or []:
            match = match_investment_profile(str(investment_name), investment_profiles)
            if match is None:
                continue
            sponsors_by_slug[clean_text(match.get("slug"))].append(team_name)

    return {
        slug: sorted(dict.fromkeys(names))
        for slug, names in sponsors_by_slug.items()
    }


def build_company_dataframe(
    investment_profiles: list[dict[str, Any]],
    sponsors_by_slug: dict[str, list[str]],
) -> pd.DataFrame:
    records: list[dict[str, Any]] = []
    for profile in investment_profiles:
        company_name = clean_text(profile.get("name"))
        slug = clean_text(profile.get("slug")) or slugify(company_name)
        location = clean_text(profile.get("location"))
        sponsors = sponsors_by_slug.get(slug, [])
        current_tags, resolved_tags = infer_tags(
            clean_text(profile.get("sub_sector")),
            clean_text(profile.get("summary")),
            clean_text(profile.get("status")),
        )

        investor_names = "|".join(sponsors)
        investor_names_label = ", ".join(sponsors) if sponsors else SCOPE_LABEL
        records.append(
            {
                "source_id": SCOPE,
                "investor_name": SCOPE_LABEL,
                "source_type": "private_equity_ecosystem",
                "company_id": f"co_ff_{slug}",
                "company_name": company_name,
                "company_name_raw": company_name,
                "company_name_norm": slugify(company_name),
                "website_domain": website_domain(clean_text(profile.get("website"))),
                "website": clean_text(profile.get("website")) or None,
                "vertical": clean_text(profile.get("sub_sector")) or "Other",
                "vertical_raw": clean_text(profile.get("sub_sector")) or None,
                "stage": "Private company" if clean_text(profile.get("status")).lower() == "active" else "Realized investment",
                "stage_raw": clean_text(profile.get("fund")) or None,
                "location": location or None,
                "location_raw": location or None,
                "location_region": infer_location_region(location),
                "flexpoint_logo_url": clean_text(profile.get("flexpoint_logo_url")) or None,
                "flexpoint_logo_path": clean_text(profile.get("flexpoint_logo_path")) or None,
                "employees": None,
                "amount_raised": None,
                "revenue": None,
                "current_pain_point_tags": current_tags,
                "current_pain_point_count": len([tag for tag in current_tags.split("|") if tag]),
                "resolved_pain_point_tags": resolved_tags,
                "resolved_pain_point_count": len([tag for tag in resolved_tags.split("|") if tag]),
                "investor_names": investor_names,
                "investor_names_label": investor_names_label,
                "investor_count": max(1, len(sponsors)),
                "lps_involved": sponsors,
                "taxonomy_tokens": build_taxonomy_tokens(profile, sponsors),
                "year_of_investment": profile.get("year_of_investment"),
                "fund": clean_text(profile.get("fund")) or None,
                "status": clean_text(profile.get("status")) or None,
                "summary": clean_text(profile.get("summary")) or None,
                "latest_news": normalize_news_items(profile.get("latest_news")),
            }
        )
    return pd.DataFrame(records)


def top_company_previews(nodes: list[dict[str, Any]]) -> list[dict[str, Any]]:
    previews = [
        {
            "id": clean_text(node.get("id")) or clean_text(node.get("company_id")),
            "company_name": clean_text(node.get("company_name")) or clean_text(node.get("label")) or "Unknown company",
            "vertical": clean_text(node.get("vertical")) or None,
            "location_region": clean_text(node.get("location_region")) or None,
            "degree": int(float(node.get("degree", 0) or 0)),
            "people_count": int(float(node.get("people_count", 0) or 0)),
        }
        for node in nodes
    ]
    previews.sort(key=lambda item: (-item["degree"], -item["people_count"], item["company_name"].lower()))
    return previews[:6]


def featured_people(nodes: list[dict[str, Any]]) -> list[dict[str, Any]]:
    people = [
        {
            "id": clean_text(node.get("id")),
            "name": clean_text(node.get("name")) or clean_text(node.get("label")) or "Unknown person",
            "company": clean_text(node.get("company")) or None,
            "suggested_role": clean_text(node.get("suggested_role")) or None,
            "current_pain_point_label": clean_text(node.get("current_pain_point_label")) or None,
            "network_importance_score": int(float(node.get("network_importance_score", 0) or 0)),
            "trust_signals": node.get("trust_signals") if isinstance(node.get("trust_signals"), list) else [],
        }
        for node in nodes
    ]
    people.sort(
        key=lambda item: (
            -item["network_importance_score"],
            item["name"].lower(),
            (item["company"] or "").lower(),
        )
    )
    return people[:8]


def build_legend(nodes: list[dict[str, Any]]) -> list[dict[str, Any]]:
    counts = Counter(clean_text(node.get("vertical")) or "Other" for node in nodes)
    colors = {
        clean_text(node.get("vertical")) or "Other": clean_text(node.get("color_hex")) or "#64748b"
        for node in nodes
    }
    return [
        {"vertical": vertical, "color": colors.get(vertical, "#64748b"), "count": counts.get(vertical, 0)}
        for vertical in sorted(counts)
    ]


def build_bundle(
    investment_profiles: list[dict[str, Any]],
    team_profiles: list[dict[str, Any]],
) -> dict[str, Any]:
    sponsors_by_slug = build_company_sponsor_map(team_profiles, investment_profiles)
    companies_df = build_company_dataframe(investment_profiles, sponsors_by_slug)

    company_nodes_df, company_edges_df = _build_company_network(
        companies_df,
        include_shared_investor_bonus=True,
        top_k=6,
        min_score=0.22,
    )

    people_seed = 20260422
    fake_people_df = synthesize_people(
        companies_df,
        scope=SCOPE,
        seed=people_seed,
        min_people=3,
        max_people=6,
    )
    fake_people_df = prepare_people_dataframe(fake_people_df)
    people_edges = build_people_edges(fake_people_df, max_neighbors=8)
    people_nodes = build_people_nodes(fake_people_df, people_edges)
    fake_people_df = attach_node_metrics_to_people_df(fake_people_df, people_nodes)
    company_nodes_df = enrich_company_nodes_with_people(company_nodes_df, fake_people_df)

    company_nodes = company_nodes_df.where(pd.notnull(company_nodes_df), None).to_dict(orient="records")
    company_edges = company_edges_df.where(pd.notnull(company_edges_df), None).to_dict(orient="records")
    latest_news_by_company_id = {
        f"co_ff_{clean_text(profile.get('slug')) or slugify(profile.get('name'))}": normalize_news_items(profile.get("latest_news"))
        for profile in investment_profiles
    }

    for node in company_nodes:
        company_id = clean_text(node.get("company_id")) or clean_text(node.get("id"))
        node["latest_news"] = latest_news_by_company_id.get(company_id, [])

    company_network_data = {
        "scope": SCOPE,
        "scope_label": SCOPE_LABEL,
        "nodes": company_nodes,
        "edges": company_edges,
        "legend": build_legend(company_nodes),
    }
    people_network_data = {
        "scope": SCOPE,
        "summary": {
            "people_count": len(people_nodes),
            "company_count": len({clean_text(node.get("company")) for node in people_nodes if clean_text(node.get("company"))}),
            "edge_count": len(people_edges),
        },
        "nodes": people_nodes,
        "edges": people_edges,
    }
    company_network_summary = {
        "summary": {
            "scope": SCOPE,
            "scope_label": SCOPE_LABEL,
            "company_count": len(company_nodes),
            "edge_count": len(company_edges),
            "people_profile_count": len(people_nodes),
            "vertical_count": len({clean_text(node.get("vertical")) or "Other" for node in company_nodes}),
            "generated_via": "network_pipeline.flexpoint_ford_graph_bundle",
        }
    }
    dashboard_snapshot = {
        "scope": SCOPE,
        "scope_label": SCOPE_LABEL,
        "company_count": len(company_nodes),
        "company_edge_count": len(company_edges),
        "people_profile_count": len(people_nodes),
        "vertical_count": len({clean_text(node.get("vertical")) or "Other" for node in company_nodes}),
        "people_count": len(people_nodes),
        "people_company_count": len({clean_text(node.get("company")) for node in people_nodes if clean_text(node.get("company"))}),
        "people_edge_count": len(people_edges),
        "generated_via": "network_pipeline.flexpoint_ford_graph_bundle",
        "top_companies": top_company_previews(company_nodes),
        "featured_people": featured_people(people_nodes),
    }

    return {
        "company_network_data.json": company_network_data,
        "company_network_summary.json": company_network_summary,
        "people_network_data.json": people_network_data,
        "dashboard_snapshot.json": dashboard_snapshot,
        "network_data.json": company_network_data,
    }


def load_json(path: Path) -> list[dict[str, Any]]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    return payload if isinstance(payload, list) else []


def sanitize_json_value(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: sanitize_json_value(item) for key, item in value.items()}
    if isinstance(value, list):
        return [sanitize_json_value(item) for item in value]
    if isinstance(value, tuple):
        return [sanitize_json_value(item) for item in value]
    if isinstance(value, float) and (value != value or value in (float("inf"), float("-inf"))):
        return None
    return value


def write_bundle(output_root: Path, bundle: dict[str, Any]) -> Path:
    output_root.mkdir(parents=True, exist_ok=True)
    for file_name, payload in bundle.items():
        sanitized_payload = sanitize_json_value(payload)
        (output_root / file_name).write_text(
            json.dumps(sanitized_payload, indent=2, ensure_ascii=True, allow_nan=False),
            encoding="utf-8",
        )
    return output_root


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Build a Flexpoint Ford company graph bundle with synthetic people.")
    parser.add_argument(
        "--investments",
        type=Path,
        default=INVESTMENTS_PATH,
        help=f"Path to investment_profiles.json. Defaults to {INVESTMENTS_PATH}.",
    )
    parser.add_argument(
        "--team",
        type=Path,
        default=TEAM_PATH,
        help=f"Path to team_profiles.json. Defaults to {TEAM_PATH}.",
    )
    parser.add_argument(
        "--output-root",
        type=Path,
        default=DEFAULT_OUTPUT_ROOT,
        help=f"Directory where bundle files are written. Defaults to {DEFAULT_OUTPUT_ROOT}.",
    )
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    investment_profiles = load_json(args.investments)
    team_profiles = load_json(args.team)
    bundle = build_bundle(investment_profiles, team_profiles)
    output_root = write_bundle(args.output_root, bundle)
    company_count = len(bundle["company_network_data.json"]["nodes"])
    people_count = len(bundle["people_network_data.json"]["nodes"])
    print(f"Wrote Flexpoint Ford graph bundle to {output_root} with {company_count} companies and {people_count} synthetic people")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
