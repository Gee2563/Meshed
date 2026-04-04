from __future__ import annotations

import json
import math
import re
from collections import defaultdict
from itertools import combinations
from pathlib import Path

import networkx as nx
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import MultiLabelBinarizer

from ..a16z_crypto import (
    get_a16z_crypto_company_edges_path,
    get_a16z_crypto_company_nodes_path,
    get_a16z_crypto_normalized_path,
    load_a16z_crypto_normalized_companies,
)
from ..core import PipelineContext, StageResult


UNKNOWN_MARKERS = {
    "",
    "nan",
    "none",
    "null",
    "unknown",
    "not publicly verified",
}
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
PALETTE = [
    "#0f766e",
    "#2563eb",
    "#0891b2",
    "#ca8a04",
    "#ea580c",
    "#dc2626",
    "#16a34a",
    "#7c3aed",
    "#1d4ed8",
    "#4d7c0f",
]


def _clean_text(value: object) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and math.isnan(value):
        return ""
    text = re.sub(r"\s+", " ", str(value)).strip()
    if text.lower() in UNKNOWN_MARKERS:
        return ""
    return text


def _split_pipe_list(value: object) -> list[str]:
    text = _clean_text(value)
    if not text:
        return []
    return [part.strip() for part in text.split("|") if part.strip()]


def _pain_label(tag: str) -> str:
    return PAIN_POINT_LABELS.get(tag, tag.replace("_", " ").title())


def _fit_score(current_tags: list[str], resolved_tags: list[str]) -> tuple[float, list[str]]:
    current = {tag for tag in current_tags if tag and tag != "unspecified"}
    resolved = {tag for tag in resolved_tags if tag and tag != "unspecified"}
    shared = sorted(current & resolved)
    if not shared:
        return (0.0, [])
    return (len(shared) / max(len(current), 1), shared)


def _build_feature_frame(companies_df: pd.DataFrame) -> pd.DataFrame:
    feat = pd.DataFrame({"company_id": companies_df["company_id"].astype(str)})

    cat_df = pd.get_dummies(
        companies_df[["vertical", "stage", "location_region"]].fillna("Unknown").astype(str),
        prefix=["vertical", "stage", "region"],
    )
    feat = pd.concat([feat, cat_df.reset_index(drop=True)], axis=1)

    for source_col, prefix in [
        ("current_pain_point_tags", "current_tag"),
        ("resolved_pain_point_tags", "resolved_tag"),
        ("taxonomy_tokens", "token"),
    ]:
        values = companies_df[source_col].map(_split_pipe_list)
        mlb = MultiLabelBinarizer()
        matrix = mlb.fit_transform(values)
        if len(mlb.classes_) > 0:
            cols = [f"{prefix}_{item}" for item in mlb.classes_]
            feat = pd.concat([feat, pd.DataFrame(matrix, columns=cols)], axis=1)

    max_investor_count = max(int(companies_df["investor_count"].fillna(0).max()), 1)
    feat["num_investor_count"] = companies_df["investor_count"].fillna(0).astype(float) / float(max_investor_count)
    return feat


def _reason_and_explanation(
    source: pd.Series,
    target: pd.Series,
    *,
    cosine_score: float,
    composite_score: float,
    historic_fit: float,
    historic_tags: list[str],
    shared_investors: list[str],
) -> tuple[str, str]:
    reasons: list[str] = []
    details: list[str] = []

    if _clean_text(source.get("vertical")) == _clean_text(target.get("vertical")) and _clean_text(source.get("vertical")) not in {"", "Other"}:
        reasons.append(f"shared vertical ({_clean_text(source.get('vertical'))})")
        details.append(f"Both companies sit in {_clean_text(source.get('vertical'))}.")
    if _clean_text(source.get("stage")) == _clean_text(target.get("stage")) and _clean_text(source.get("stage")) not in {"", "Unknown"}:
        reasons.append(f"shared stage ({_clean_text(source.get('stage'))})")
        details.append(f"Both are in {_clean_text(source.get('stage'))}.")
    if _clean_text(source.get("location_region")) == _clean_text(target.get("location_region")) and _clean_text(source.get("location_region")) not in {"", "Unknown"}:
        reasons.append(f"same region ({_clean_text(source.get('location_region'))})")
        details.append(f"They operate from the same region ({_clean_text(source.get('location_region'))}).")

    source_current = set(_split_pipe_list(source.get("current_pain_point_tags")))
    target_current = set(_split_pipe_list(target.get("current_pain_point_tags")))
    shared_current = sorted(source_current & target_current)
    if shared_current:
        labels = ", ".join(_pain_label(tag) for tag in shared_current[:4])
        reasons.append("shared current pain points")
        details.append(f"Shared current pain points: {labels}.")

    if historic_tags:
        labels = ", ".join(_pain_label(tag) for tag in historic_tags[:4])
        reasons.append("historic pain-point fit")
        details.append(f"One company has already worked through pain points the other still faces: {labels}.")

    if shared_investors:
        reasons.append("shared investors")
        details.append("Shared investors in the combined ecosystem: " + ", ".join(shared_investors[:4]) + ".")

    if not reasons:
        reasons.append("feature overlap")
        details.append("Encoded sector, stage, geography, and pain-point signals still came out similar.")

    details.append(
        f"Composite score {composite_score:.3f} from cosine {cosine_score:.3f}"
        + (f" and historic fit {historic_fit:.3f}" if historic_fit > 0 else "")
        + "."
    )
    return " | ".join(reasons), " ".join(details)


def _build_company_network(
    companies_df: pd.DataFrame,
    *,
    include_shared_investor_bonus: bool,
    top_k: int,
    min_score: float,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    if companies_df.empty:
        return (companies_df.copy(), pd.DataFrame(columns=["source_id", "target_id"]))

    feat = _build_feature_frame(companies_df)
    feature_cols = [column for column in feat.columns if column != "company_id"]
    similarity_matrix = cosine_similarity(feat[feature_cols].to_numpy()) if feature_cols else None

    companies = companies_df.set_index("company_id", drop=False)
    company_ids = companies_df["company_id"].astype(str).tolist()
    index_by_company = {company_id: idx for idx, company_id in enumerate(company_ids)}
    candidate_rows_by_company: dict[str, list[dict[str, object]]] = defaultdict(list)
    pair_rows: dict[tuple[str, str], dict[str, object]] = {}

    for left, right in combinations(company_ids, 2):
        left_meta = companies.loc[left]
        right_meta = companies.loc[right]
        cosine_score = 0.0 if similarity_matrix is None else float(similarity_matrix[index_by_company[left], index_by_company[right]])

        left_current = _split_pipe_list(left_meta.get("current_pain_point_tags"))
        right_current = _split_pipe_list(right_meta.get("current_pain_point_tags"))
        left_resolved = _split_pipe_list(left_meta.get("resolved_pain_point_tags"))
        right_resolved = _split_pipe_list(right_meta.get("resolved_pain_point_tags"))

        historic_lr, tags_lr = _fit_score(left_current, right_resolved)
        historic_rl, tags_rl = _fit_score(right_current, left_resolved)
        historic_fit = max(historic_lr, historic_rl)
        historic_tags = tags_lr if historic_lr >= historic_rl else tags_rl

        left_investors = set(_split_pipe_list(left_meta.get("investor_names")))
        right_investors = set(_split_pipe_list(right_meta.get("investor_names")))
        shared_investors = sorted(left_investors & right_investors) if include_shared_investor_bonus else []
        investor_bonus = 0.0
        if include_shared_investor_bonus and shared_investors:
            investor_bonus = min(0.12, 0.06 * len(shared_investors))

        composite_score = min(0.999, (0.78 * cosine_score) + (0.14 * historic_fit) + investor_bonus)
        if composite_score < min_score:
            continue

        reason, explanation = _reason_and_explanation(
            left_meta,
            right_meta,
            cosine_score=cosine_score,
            composite_score=composite_score,
            historic_fit=historic_fit,
            historic_tags=historic_tags,
            shared_investors=shared_investors,
        )
        edge_row = {
            "source_id": left,
            "target_id": right,
            "weight": round(composite_score, 6),
            "score": round(composite_score, 6),
            "cosine_similarity": round(cosine_score, 6),
            "historical_fit_score": round(historic_fit, 6),
            "shared_historic_tags": "|".join(historic_tags),
            "shared_historic_tags_label": ", ".join(_pain_label(tag) for tag in historic_tags),
            "shared_investors": "|".join(shared_investors),
            "shared_investors_label": ", ".join(shared_investors),
            "mentor_from_id": left,
            "mentor_to_id": right,
            "mentor_from_name": _clean_text(left_meta.get("company_name")) or left,
            "mentor_to_name": _clean_text(right_meta.get("company_name")) or right,
            "reason": reason,
            "explanation": explanation,
        }
        pair_key = tuple(sorted([left, right]))
        pair_rows[pair_key] = edge_row
        candidate_rows_by_company[left].append({**edge_row, "peer_id": right})
        candidate_rows_by_company[right].append({**edge_row, "peer_id": left})

    allowed_pairs: set[tuple[str, str]] = set()
    for company_id, rows in candidate_rows_by_company.items():
        rows.sort(key=lambda row: float(row.get("weight", 0.0)), reverse=True)
        for row in rows[:top_k]:
            pair_key = tuple(sorted([company_id, _clean_text(row.get("peer_id"))]))
            allowed_pairs.add(pair_key)

    final_edges = [pair_rows[pair] for pair in allowed_pairs if pair in pair_rows]
    final_edges.sort(key=lambda row: float(row.get("weight", 0.0)), reverse=True)

    graph = nx.Graph()
    graph.add_nodes_from(company_ids)
    for row in final_edges:
        graph.add_edge(
            row["source_id"],
            row["target_id"],
            weight=float(row["weight"]),
        )

    degree_centrality = nx.degree_centrality(graph) if graph.number_of_nodes() else {}
    betweenness = nx.betweenness_centrality(graph) if graph.number_of_nodes() else {}
    verticals = sorted({_clean_text(value) or "Other" for value in companies_df["vertical"].tolist()})
    vertical_colors = {vertical: PALETTE[idx % len(PALETTE)] for idx, vertical in enumerate(verticals)}

    node_rows: list[dict[str, object]] = []
    node_by_company: dict[str, dict[str, object]] = {}
    for company_id in company_ids:
        meta = companies.loc[company_id]
        degree = int(graph.degree(company_id))
        investor_count = int(meta.get("investor_count", 0) or 0)
        vertical = _clean_text(meta.get("vertical")) or "Other"
        color_hex = vertical_colors.get(vertical, "#64748b")
        size = 18 + min(10, degree * 1.6) + min(6, max(investor_count - 1, 0) * 2.2)
        row = {
            **meta.to_dict(),
            "id": company_id,
            "label": _clean_text(meta.get("company_name")) or company_id,
            "degree": degree,
            "degree_centrality": round(float(degree_centrality.get(company_id, 0.0)), 6),
            "betweenness": round(float(betweenness.get(company_id, 0.0)), 6),
            "size": round(float(size), 2),
            "color_hex": color_hex,
        }
        node_rows.append(row)
        node_by_company[company_id] = row

    edge_rows: list[dict[str, object]] = []
    for index, row in enumerate(final_edges, start=1):
        source_node = node_by_company[row["source_id"]]
        target_node = node_by_company[row["target_id"]]
        source_color = _clean_text(source_node.get("color_hex")) or "#94a3b8"
        target_color = _clean_text(target_node.get("color_hex")) or "#94a3b8"
        color = source_color if source_color == target_color else "#64748b"
        edge_rows.append(
            {
                **row,
                "id": f"edge_{index:04d}",
                "from": row["source_id"],
                "to": row["target_id"],
                "width": round(0.8 + (float(row["weight"]) * 2.2), 2),
                "color": color,
            }
        )

    return (pd.DataFrame(node_rows), pd.DataFrame(edge_rows))


def _frame_to_records(frame: pd.DataFrame) -> list[dict[str, object]]:
    if frame.empty:
        return []
    return frame.where(pd.notnull(frame), None).to_dict(orient="records")


def run(
    context: PipelineContext,
    *,
    input_path: str | Path | None = None,
    nodes_output_path: str | Path | None = None,
    edges_output_path: str | Path | None = None,
    top_k: int = 4,
    min_score: float = 0.24,
    include_shared_investor_bonus: bool = False,
) -> StageResult:
    resolved_input_path = context.resolve_path(input_path) if input_path else get_a16z_crypto_normalized_path()
    resolved_nodes_path = context.resolve_path(nodes_output_path) if nodes_output_path else get_a16z_crypto_company_nodes_path()
    resolved_edges_path = context.resolve_path(edges_output_path) if edges_output_path else get_a16z_crypto_company_edges_path()

    normalized_companies = load_a16z_crypto_normalized_companies(resolved_input_path)
    companies_df = pd.DataFrame(normalized_companies)
    node_frame, edge_frame = _build_company_network(
        companies_df,
        include_shared_investor_bonus=include_shared_investor_bonus,
        top_k=int(top_k),
        min_score=float(min_score),
    )
    node_rows = _frame_to_records(node_frame)
    edge_rows = _frame_to_records(edge_frame)

    resolved_nodes_path.parent.mkdir(parents=True, exist_ok=True)
    resolved_edges_path.parent.mkdir(parents=True, exist_ok=True)
    resolved_nodes_path.write_text(json.dumps(node_rows, indent=2, ensure_ascii=True), encoding="utf-8")
    resolved_edges_path.write_text(json.dumps(edge_rows, indent=2, ensure_ascii=True), encoding="utf-8")

    return StageResult(
        name="similarity_scoring",
        outputs={
            "input_path": str(resolved_input_path),
            "nodes_path": str(resolved_nodes_path),
            "edges_path": str(resolved_edges_path),
            "company_count": len(node_rows),
            "edge_count": len(edge_rows),
        },
        details=f"Wrote similarity-scored company network to {resolved_nodes_path.parent}",
    )
