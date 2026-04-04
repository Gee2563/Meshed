from __future__ import annotations

import hashlib
import json
import math
import random
import re
from collections import Counter, defaultdict
from dataclasses import dataclass
from itertools import combinations
from typing import Iterable

import pandas as pd


FIRST_NAMES = [
    "Avery",
    "Jordan",
    "Taylor",
    "Cameron",
    "Morgan",
    "Reese",
    "Quinn",
    "Rowan",
    "Alex",
    "Skyler",
    "Kai",
    "Parker",
    "Riley",
    "Sawyer",
    "Logan",
    "Casey",
    "Drew",
    "Sydney",
    "Bailey",
    "Harper",
    "Elliot",
    "Blake",
    "Sam",
    "Micah",
    "Noel",
    "Dakota",
    "Ari",
    "Jules",
    "River",
    "Devon",
]

LAST_NAMES = [
    "Patel",
    "Kim",
    "Garcia",
    "Nguyen",
    "Smith",
    "Johnson",
    "Lee",
    "Brown",
    "Davis",
    "Miller",
    "Wilson",
    "Anderson",
    "Taylor",
    "Thomas",
    "Moore",
    "Martin",
    "Jackson",
    "White",
    "Harris",
    "Clark",
    "Lewis",
    "Walker",
    "Hall",
    "Allen",
    "Young",
    "King",
    "Wright",
    "Scott",
    "Green",
    "Baker",
]

PAIN_POINT_LABELS = {
    "hiring": "Hiring Bottlenecks",
    "ops_scaling": "Operational Scaling",
    "cash_efficiency": "Cash Efficiency",
    "compliance": "Regulatory Compliance",
    "security": "Security Incidents",
    "gtm": "Go-To-Market Execution",
    "product_market_fit": "Product-Market Fit",
    "customer_churn": "Customer Churn",
    "sales_conversion": "Sales Conversion",
    "onboarding": "Customer Onboarding",
    "fundraising": "Fundraising Strategy",
    "tech_debt": "Technical Debt",
    "pricing": "Pricing and Packaging",
    "partnerships": "Strategic Partnerships",
    "international_expansion": "International Expansion",
}

PAIN_POINT_COLORS = [
    "#0f766e",
    "#2563eb",
    "#ea580c",
    "#dc2626",
    "#7c3aed",
    "#0891b2",
    "#65a30d",
    "#b45309",
    "#be123c",
    "#1d4ed8",
]

EDGE_REASON_COLORS = {
    "Resolved-to-Current Match": "#0f766e",
    "Shared Current Pain Point": "#2563eb",
    "Shared Resolved Pain Point": "#64748b",
    "Mixed Pain Point Similarity": "#7c3aed",
}


@dataclass
class PairScore:
    score: float
    mentor_tags: set[str]
    shared_current_tags: set[str]
    shared_resolved_tags: set[str]


def slugify(value: object) -> str:
    text = str(value or "").strip().lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


def clean_text(value: object) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and math.isnan(value):
        return ""
    txt = str(value).strip()
    if txt.lower() == "nan":
        return ""
    return txt


def normalize_tag(text: str) -> str:
    value = re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_")
    alias_map = {
        "regulatory_compliance": "compliance",
        "security_incidents": "security",
        "go_to_market": "gtm",
        "go_to_market_execution": "gtm",
        "operational_scaling": "ops_scaling",
        "talent_hiring": "hiring",
        "fund_raise": "fundraising",
        "fund_raising": "fundraising",
    }
    if value in PAIN_POINT_LABELS:
        return value
    if value in alias_map:
        return alias_map[value]
    if value == "unspecified" or not value:
        return ""
    return value


def parse_tag_list(raw: object) -> list[str]:
    txt = clean_text(raw)
    if not txt:
        return []
    normalized = txt.lower()
    normalized = normalized.replace(";", ",").replace("|", ",").replace("/", ",")
    normalized = normalized.replace(" and ", ",")
    normalized = re.sub(r"'+", ",", normalized)
    normalized = re.sub(r"\"+", ",", normalized)
    normalized = re.sub(r"\s{2,}", ",", normalized)
    tokens = [token.strip(" []()'\"") for token in normalized.split(",")]
    out: list[str] = []
    for token in tokens:
        if not token:
            continue
        tag = normalize_tag(token)
        if tag:
            out.append(tag)
    return sorted(set(out))


def _split_pipe_list(raw: object) -> list[str]:
    txt = clean_text(raw)
    if not txt:
        return []
    return [part.strip() for part in txt.split("|") if part.strip()]


def _serialize_pipe_list(values: Iterable[object]) -> str:
    return "|".join(str(value).strip() for value in values if str(value).strip())


def titleize(value: str) -> str:
    return value.replace("_", " ").title()


def _infer_suggested_role(current_tag: str, resolved_tags: list[str]) -> str:
    current = normalize_tag(current_tag)
    resolved = [normalize_tag(tag) for tag in resolved_tags if normalize_tag(tag)]
    if len(resolved) >= 2 or current in {"fundraising", "partnerships"}:
        return "mentor"
    if current in {"pricing", "gtm", "fundraising", "partnerships"}:
        return "consultant"
    if current in {"ops_scaling", "onboarding", "security", "tech_debt", "customer_churn"}:
        return "operator"
    return "operator"


def _profile_signal_score(row: pd.Series) -> int:
    resolved_tags = _split_pipe_list(row.get("resolved_pain_points"))
    has_contact = 1 if clean_text(row.get("contact")) else 0
    has_linkedin = 1 if clean_text(row.get("linkedin_url")) else 0
    current_tag = normalize_tag(clean_text(row.get("current_pain_point")))
    role = _infer_suggested_role(current_tag, resolved_tags)
    role_bonus = {"mentor": 10, "consultant": 8, "operator": 6}.get(role, 5)
    return int(min(100, 38 + len(resolved_tags) * 10 + has_contact * 8 + has_linkedin * 14 + role_bonus))


def prepare_people_dataframe(people_df: pd.DataFrame) -> pd.DataFrame:
    out = people_df.copy()
    out["resolved_pain_point_count"] = out["resolved_pain_points"].map(lambda value: len(_split_pipe_list(value)))
    out["suggested_role"] = out.apply(
        lambda row: _infer_suggested_role(
            clean_text(row.get("current_pain_point")),
            _split_pipe_list(row.get("resolved_pain_points")),
        ),
        axis=1,
    )
    out["profile_signal_score"] = out.apply(_profile_signal_score, axis=1)
    return out


def pain_label(tag: str) -> str:
    if tag in PAIN_POINT_LABELS:
        return PAIN_POINT_LABELS[tag]
    return tag.replace("_", " ").title()


def stable_scope_seed(base_seed: int, scope: str) -> int:
    scope_hash = int(hashlib.sha256(scope.encode("utf-8")).hexdigest()[:8], 16)
    return (base_seed + scope_hash) % (2**31 - 1)


def synthesize_people(
    companies_df: pd.DataFrame,
    scope: str,
    seed: int,
    min_people: int = 3,
    max_people: int = 20,
) -> pd.DataFrame:
    if min_people < 1:
        raise ValueError("min_people must be at least 1")
    if max_people < min_people:
        raise ValueError("max_people must be greater than or equal to min_people")

    rng = random.Random(seed)
    records: list[dict[str, object]] = []
    person_counter = 1
    known_tags = list(PAIN_POINT_LABELS.keys())

    for _, row in companies_df.iterrows():
        company_id = clean_text(row.get("company_id"))
        company_name = clean_text(row.get("company_name")) or company_id
        website_domain = clean_text(row.get("website_domain"))
        location = clean_text(row.get("location"))
        stage = clean_text(row.get("stage"))
        vertical = clean_text(row.get("vertical"))
        website = clean_text(row.get("website"))

        company_current = parse_tag_list(row.get("current_pain_point_tags"))
        company_resolved = parse_tag_list(row.get("resolved_pain_point_tags"))
        if not company_current:
            company_current = rng.sample(known_tags, k=rng.randint(1, 2))
        if not company_resolved:
            company_resolved = rng.sample(known_tags, k=rng.randint(1, 3))

        people_count = rng.randint(min_people, max_people)
        for _ in range(people_count):
            person_id = f"p_{scope}_{person_counter:05d}"
            person_counter += 1

            first = rng.choice(FIRST_NAMES)
            last = rng.choice(LAST_NAMES)
            name = f"{first} {last}"

            if rng.random() < 0.72:
                current_tag = rng.choice(company_current)
            else:
                current_tag = rng.choice(known_tags)

            resolved_pool = list(dict.fromkeys(company_resolved + rng.sample(known_tags, k=4)))
            resolved_pool = [tag for tag in resolved_pool if tag != current_tag]
            resolved_count = min(len(resolved_pool), rng.randint(1, 3))
            resolved_tags = rng.sample(resolved_pool, k=resolved_count) if resolved_pool else []

            domain = website_domain or f"{slugify(company_name)}.com"
            local_part = f"{slugify(first)}.{slugify(last)}{rng.randint(1, 99)}"
            email = f"{local_part}@{domain}"
            phone = f"+1-{rng.randint(200, 999)}-{rng.randint(200, 999)}-{rng.randint(1000, 9999)}"
            contact = f"{email}; {phone}"
            linkedin_slug = f"{slugify(first)}-{slugify(last)}-{rng.randint(100, 999)}"
            linkedin_url = f"https://www.linkedin.com/in/{linkedin_slug}"

            records.append(
                {
                    "person_id": person_id,
                    "name": name,
                    "company": company_name,
                    "company_id": company_id,
                    "source_vc": scope,
                    "contact": contact,
                    "linkedin_url": linkedin_url,
                    "current_pain_point": current_tag,
                    "resolved_pain_points": "|".join(sorted(set(resolved_tags))),
                    "vertical": vertical,
                    "stage": stage,
                    "location": location,
                    "website": website,
                    "website_domain": website_domain,
                    "questionnaire_source": "wordpress",
                }
            )

    return pd.DataFrame(records)


def summarize_tags(counter: Counter[str], top_n: int = 6) -> str:
    if not counter:
        return "none"
    top = sorted(counter.items(), key=lambda item: (-item[1], item[0]))[:top_n]
    return ", ".join(f"{pain_label(tag)} ({count})" for tag, count in top)


def enrich_company_nodes_with_people(companies_df: pd.DataFrame, people_df: pd.DataFrame) -> pd.DataFrame:
    grouped = people_df.groupby("company_id", sort=False)
    people_ids_map: dict[str, str] = {}
    people_count_map: dict[str, int] = {}
    current_overview_map: dict[str, str] = {}
    resolved_overview_map: dict[str, str] = {}
    combined_overview_map: dict[str, str] = {}
    avg_engagement_map: dict[str, float] = {}
    avg_reliability_map: dict[str, float] = {}
    trust_signal_map: dict[str, str] = {}
    connection_summary_map: dict[str, str] = {}

    for company_id, group in grouped:
        ids = group["person_id"].tolist()
        people_ids_map[company_id] = json.dumps(ids)
        people_count_map[company_id] = len(ids)

        current_counter = Counter(str(value) for value in group["current_pain_point"].tolist() if clean_text(value))
        resolved_counter: Counter[str] = Counter()
        for raw in group["resolved_pain_points"].tolist():
            for tag in parse_tag_list(raw):
                resolved_counter[tag] += 1

        current_text = summarize_tags(current_counter)
        resolved_text = summarize_tags(resolved_counter)
        current_overview_map[company_id] = current_text
        resolved_overview_map[company_id] = resolved_text
        combined_overview_map[company_id] = f"Current: {current_text} | Resolved: {resolved_text}"

        if "engagement_score" in group:
            avg_engagement_map[company_id] = round(
                float(pd.to_numeric(group["engagement_score"], errors="coerce").fillna(0).mean()),
                2,
            )
        if "reliability_score" in group:
            avg_reliability_map[company_id] = round(
                float(pd.to_numeric(group["reliability_score"], errors="coerce").fillna(0).mean()),
                2,
            )

        trust_counter: Counter[str] = Counter()
        for raw in group.get("trust_signals", pd.Series(dtype="object")).tolist():
            for tag in _split_pipe_list(raw):
                trust_counter[tag] += 1
        trust_signal_map[company_id] = (
            ", ".join(f"{titleize(tag)} ({count})" for tag, count in trust_counter.most_common(4))
            if trust_counter
            else "none"
        )

        summaries = [
            clean_text(value)
            for value in group.get("connection_summary", pd.Series(dtype="object")).tolist()
            if clean_text(value)
        ]
        connection_summary_map[company_id] = " | ".join(dict.fromkeys(summaries[:2])) if summaries else "No people-level connection summary"

    out = companies_df.copy()
    out["people_ids"] = out["company_id"].map(people_ids_map).fillna("[]")
    out["people_count"] = out["company_id"].map(people_count_map).fillna(0).astype(int)
    out["people_current_pain_point_overview"] = out["company_id"].map(current_overview_map).fillna("none")
    out["people_resolved_pain_point_overview"] = out["company_id"].map(resolved_overview_map).fillna("none")
    out["people_pain_point_overview"] = out["company_id"].map(combined_overview_map).fillna("Current: none | Resolved: none")
    out["people_avg_engagement_score"] = out["company_id"].map(avg_engagement_map).fillna(0.0)
    out["people_avg_reliability_score"] = out["company_id"].map(avg_reliability_map).fillna(0.0)
    out["people_trust_signal_overview"] = out["company_id"].map(trust_signal_map).fillna("none")
    out["people_connection_summary"] = out["company_id"].map(connection_summary_map).fillna("No people-level connection summary")
    return out


def _pair_key(a: str, b: str) -> tuple[str, str]:
    return (a, b) if a < b else (b, a)


def _hex_to_rgba(hex_color: str, alpha: float) -> str:
    cleaned = (hex_color or "#94a3b8").lstrip("#")
    if len(cleaned) != 6:
        return f"rgba(148,163,184,{alpha})"
    r = int(cleaned[0:2], 16)
    g = int(cleaned[2:4], 16)
    b = int(cleaned[4:6], 16)
    return f"rgba({r},{g},{b},{max(0.0, min(1.0, float(alpha))):.3f})"


def _pair_state(bucket: dict[tuple[str, str], PairScore], a: str, b: str) -> PairScore:
    key = _pair_key(a, b)
    if key not in bucket:
        bucket[key] = PairScore(score=0.0, mentor_tags=set(), shared_current_tags=set(), shared_resolved_tags=set())
    return bucket[key]


def build_people_edges(people_df: pd.DataFrame, max_neighbors: int = 8) -> list[dict[str, object]]:
    current_index: dict[str, list[str]] = defaultdict(list)
    resolved_index: dict[str, list[str]] = defaultdict(list)
    person_lookup: dict[str, dict[str, object]] = {}

    for _, row in people_df.iterrows():
        person_id = clean_text(row.get("person_id"))
        current_tag = normalize_tag(clean_text(row.get("current_pain_point")))
        if not current_tag:
            current_tag = "ops_scaling"
        current_index[current_tag].append(person_id)
        person_lookup[person_id] = {
            "profile_signal_score": float(row.get("profile_signal_score", 0) or 0),
            "suggested_role": clean_text(row.get("suggested_role")),
            "source_vc": clean_text(row.get("source_vc")),
            "linkedin_url": clean_text(row.get("linkedin_url")),
        }

        for tag in parse_tag_list(row.get("resolved_pain_points")):
            resolved_index[tag].append(person_id)

    pair_scores: dict[tuple[str, str], PairScore] = {}
    all_tags = sorted(set(current_index.keys()) | set(resolved_index.keys()))
    for tag in all_tags:
        current_people = sorted(set(current_index.get(tag, [])))
        resolved_people = sorted(set(resolved_index.get(tag, [])))

        seen_pairs: set[tuple[str, str]] = set()
        for left in current_people:
            for right in resolved_people:
                if left == right:
                    continue
                key = _pair_key(left, right)
                if key in seen_pairs:
                    continue
                seen_pairs.add(key)
                pair_state = _pair_state(pair_scores, left, right)
                pair_state.score += 3.5
                pair_state.mentor_tags.add(tag)

        for left, right in combinations(current_people, 2):
            pair_state = _pair_state(pair_scores, left, right)
            pair_state.score += 1.6
            pair_state.shared_current_tags.add(tag)

        for left, right in combinations(resolved_people, 2):
            pair_state = _pair_state(pair_scores, left, right)
            pair_state.score += 0.9
            pair_state.shared_resolved_tags.add(tag)

    candidates = [(key, pair_score) for key, pair_score in pair_scores.items() if pair_score.score >= 1.6]
    candidates.sort(key=lambda item: item[1].score, reverse=True)
    degree_counter: Counter[str] = Counter()
    kept: list[tuple[tuple[str, str], PairScore]] = []

    for (left, right), pair_score in candidates:
        if degree_counter[left] >= max_neighbors or degree_counter[right] >= max_neighbors:
            continue
        kept.append(((left, right), pair_score))
        degree_counter[left] += 1
        degree_counter[right] += 1

    edges: list[dict[str, object]] = []
    for index, ((left, right), pair_score) in enumerate(kept, start=1):
        source_meta = person_lookup.get(left, {})
        target_meta = person_lookup.get(right, {})
        mentor_tags = sorted(pair_score.mentor_tags)
        shared_current = sorted(pair_score.shared_current_tags)
        shared_resolved = sorted(pair_score.shared_resolved_tags)

        if mentor_tags and (shared_current or shared_resolved):
            reason = "Mixed Pain Point Similarity"
        elif mentor_tags:
            reason = "Resolved-to-Current Match"
        elif shared_current:
            reason = "Shared Current Pain Point"
        else:
            reason = "Shared Resolved Pain Point"

        top_tags = mentor_tags or shared_current or shared_resolved
        top_labels = ", ".join(pain_label(tag) for tag in top_tags[:3]) if top_tags else "Pain-point similarity"
        importance_reasons: list[str] = []
        base_score = round(pair_score.score, 4)
        importance_boost = 0.0

        avg_profile_signal = (
            float(source_meta.get("profile_signal_score", 0))
            + float(target_meta.get("profile_signal_score", 0))
        ) / 200.0
        if avg_profile_signal > 0:
            importance_boost += round(avg_profile_signal * 0.8, 4)
            importance_reasons.append("high engagement")
        if source_meta.get("linkedin_url") and target_meta.get("linkedin_url"):
            importance_boost += 0.18
            importance_reasons.append("linkedin presence")
        if mentor_tags and (
            source_meta.get("suggested_role") in {"mentor", "consultant"}
            or target_meta.get("suggested_role") in {"mentor", "consultant"}
        ):
            importance_boost += 0.24
            importance_reasons.append("mentor fit")
        if source_meta.get("source_vc") and source_meta.get("source_vc") == target_meta.get("source_vc"):
            importance_boost += 0.1
            importance_reasons.append("shared vc context")

        score = round(base_score + importance_boost, 4)
        connection_summary = (
            f"{reason}: {top_labels}. "
            f"Importance {score:.2f} vs base {base_score:.2f}"
            + (f", boosted by {', '.join(importance_reasons)}." if importance_reasons else ".")
        )
        explanation = (
            "People are linked because they show overlapping pain-point signals. "
            f"Strongest overlap: {top_labels}. "
            + (f"Importance boost from {', '.join(importance_reasons)}." if importance_reasons else "")
        )

        edges.append(
            {
                "id": f"e_{index:06d}",
                "from": left,
                "to": right,
                "score": score,
                "base_score": base_score,
                "reason": reason,
                "explanation": explanation,
                "connection_summary": connection_summary,
                "color": _hex_to_rgba(EDGE_REASON_COLORS.get(reason, "#94a3b8"), 0.23),
                "width": round(min(2.9, 0.45 + score * 0.16), 3),
                "mentor_tags": "|".join(mentor_tags),
                "shared_current_tags": "|".join(shared_current),
                "shared_resolved_tags": "|".join(shared_resolved),
                "importance_reasons": importance_reasons,
            }
        )
    return edges


def build_people_nodes(people_df: pd.DataFrame, edges: list[dict[str, object]] | None = None) -> list[dict[str, object]]:
    edge_lookup: dict[str, list[dict[str, object]]] = defaultdict(list)
    for edge in edges or []:
        edge_lookup[str(edge.get("from"))].append(edge)
        edge_lookup[str(edge.get("to"))].append(edge)

    current_tags = sorted(set(people_df["current_pain_point"].map(lambda value: normalize_tag(clean_text(value))).tolist()))
    if not current_tags:
        current_tags = ["ops_scaling"]
    color_map = {tag: PAIN_POINT_COLORS[idx % len(PAIN_POINT_COLORS)] for idx, tag in enumerate(current_tags)}

    nodes: list[dict[str, object]] = []
    for _, row in people_df.iterrows():
        person_id = clean_text(row.get("person_id"))
        current = normalize_tag(clean_text(row.get("current_pain_point"))) or "ops_scaling"
        resolved = parse_tag_list(row.get("resolved_pain_points"))
        resolved_text = ", ".join(pain_label(tag) for tag in resolved) if resolved else "None listed"
        person_edges = edge_lookup.get(person_id, [])
        strong_links = sum(1 for edge in person_edges if float(edge.get("score", 0) or 0) >= 3.6)
        mentor_links = sum(1 for edge in person_edges if clean_text(edge.get("reason")) == "Resolved-to-Current Match")
        degree = len(person_edges)
        profile_signal_score = float(row.get("profile_signal_score", 0) or 0)
        has_linkedin = 1 if clean_text(row.get("linkedin_url")) else 0
        engagement_score = int(min(99, 25 + profile_signal_score * 0.45 + degree * 5 + strong_links * 3))
        reliability_score = int(min(99, 28 + len(resolved) * 11 + mentor_links * 7 + has_linkedin * 6 + degree * 3))
        successful_collaboration_count = max(mentor_links, strong_links)
        shared_connection_count = degree
        response_rate = int(min(99, 42 + degree * 4 + strong_links * 3 + has_linkedin * 6))
        suggested_role = clean_text(row.get("suggested_role")) or _infer_suggested_role(current, resolved)
        trust_signals: list[str] = []
        if engagement_score >= 70:
            trust_signals.append("rising_contributor")
        if suggested_role == "mentor" and reliability_score >= 78:
            trust_signals.append("trusted_mentor")
        if suggested_role == "operator" and strong_links >= 2:
            trust_signals.append("verified_operator")
        if suggested_role == "consultant" and engagement_score >= 78:
            trust_signals.append("high_engagement_consultant")
        relationship_summary = [
            f"Worked across {degree if degree else 1} portfolio {'company' if degree == 1 else 'companies'}",
            f"{successful_collaboration_count} strong network collaborations",
            f"{shared_connection_count} shared connections in graph",
        ]
        top_edge = sorted(person_edges, key=lambda item: float(item.get("score", 0) or 0), reverse=True)[0] if person_edges else None
        connection_summary = (
            clean_text(top_edge.get("connection_summary"))
            if top_edge
            else f"Connected through {clean_text(row.get('source_vc')) or 'meshed'} network context."
        )
        network_importance_score = round((engagement_score + reliability_score) / 2, 2)

        nodes.append(
            {
                "id": person_id,
                "label": clean_text(row.get("name")) or person_id,
                "shape": "dot",
                "size": 17,
                "color": {
                    "background": color_map[current],
                    "border": "#1f2937",
                    "highlight": {"background": color_map[current], "border": "#111827"},
                    "hover": {"background": color_map[current], "border": "#111827"},
                },
                "font": {
                    "color": "#0f172a",
                    "size": 14,
                    "strokeWidth": 5,
                    "strokeColor": "#ffffff",
                    "background": "#ffffff",
                },
                "name": clean_text(row.get("name")),
                "company": clean_text(row.get("company")),
                "source_vc": clean_text(row.get("source_vc")),
                "contact": clean_text(row.get("contact")),
                "linkedin_url": clean_text(row.get("linkedin_url")),
                "suggested_role": suggested_role,
                "current_pain_point": current,
                "current_pain_point_label": pain_label(current),
                "resolved_pain_points": "|".join(resolved),
                "resolved_pain_points_label": resolved_text,
                "engagement_score": engagement_score,
                "reliability_score": reliability_score,
                "successful_collaboration_count": successful_collaboration_count,
                "shared_connection_count": shared_connection_count,
                "response_rate": response_rate,
                "trust_signals": trust_signals,
                "relationship_summary": relationship_summary,
                "connection_summary": connection_summary,
                "network_importance_score": network_importance_score,
                "location": clean_text(row.get("location")),
                "vertical": clean_text(row.get("vertical")),
                "stage": clean_text(row.get("stage")),
                "title": (
                    f"{clean_text(row.get('name'))}<br>"
                    f"Company: {clean_text(row.get('company'))}<br>"
                    f"Current pain point: {pain_label(current)}<br>"
                    f"Resolved pain points: {resolved_text}"
                ),
            }
        )
    return nodes


def attach_node_metrics_to_people_df(people_df: pd.DataFrame, nodes: list[dict[str, object]]) -> pd.DataFrame:
    out = people_df.copy()
    node_lookup = {clean_text(node.get("id")): node for node in nodes}
    metric_columns = {
        "engagement_score": 0,
        "reliability_score": 0,
        "successful_collaboration_count": 0,
        "shared_connection_count": 0,
        "response_rate": 0,
        "connection_summary": "",
        "network_importance_score": 0.0,
        "trust_signals": "",
        "relationship_summary": "",
    }

    for column, fallback in metric_columns.items():
        values = []
        for person_id in out["person_id"].tolist():
            node = node_lookup.get(clean_text(person_id), {})
            value = node.get(column, fallback)
            if isinstance(value, list):
                values.append(_serialize_pipe_list(value))
            else:
                values.append(value if value is not None else fallback)
        out[column] = values
    return out
