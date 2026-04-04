from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

from ..a16z_crypto import (
    get_a16z_crypto_company_nodes_path,
    get_a16z_crypto_people_edges_path,
    get_a16z_crypto_people_nodes_path,
    load_a16z_crypto_company_nodes,
)
from ..core import PipelineContext, StageResult
from ..people_builder import (
    attach_node_metrics_to_people_df,
    build_people_edges,
    build_people_nodes,
    enrich_company_nodes_with_people,
    prepare_people_dataframe,
    stable_scope_seed,
    synthesize_people,
)


def _frame_to_records(frame: pd.DataFrame) -> list[dict[str, object]]:
    if frame.empty:
        return []
    return frame.where(pd.notnull(frame), None).to_dict(orient="records")


def run(
    context: PipelineContext,
    *,
    scope: str = "a16z-crypto",
    company_nodes_path: str | Path | None = None,
    people_nodes_output_path: str | Path | None = None,
    people_edges_output_path: str | Path | None = None,
    seed: int = 20260402,
    min_people: int = 2,
    max_people: int = 6,
) -> StageResult:
    resolved_company_nodes_path = context.resolve_path(company_nodes_path) if company_nodes_path else get_a16z_crypto_company_nodes_path()
    resolved_people_nodes_path = (
        context.resolve_path(people_nodes_output_path) if people_nodes_output_path else get_a16z_crypto_people_nodes_path()
    )
    resolved_people_edges_path = (
        context.resolve_path(people_edges_output_path) if people_edges_output_path else get_a16z_crypto_people_edges_path()
    )

    company_nodes = load_a16z_crypto_company_nodes(resolved_company_nodes_path)
    company_frame = pd.DataFrame(company_nodes)
    people_frame = synthesize_people(
        companies_df=company_frame,
        scope=scope,
        seed=stable_scope_seed(int(seed), scope),
        min_people=int(min_people),
        max_people=int(max_people),
    )
    people_frame = prepare_people_dataframe(people_frame)
    people_edges = build_people_edges(people_frame, max_neighbors=8 if len(people_frame) < 900 else 7)
    people_nodes = build_people_nodes(people_frame, people_edges)
    people_frame = attach_node_metrics_to_people_df(people_frame, people_nodes)
    enriched_company_frame = enrich_company_nodes_with_people(company_frame, people_frame)

    resolved_company_nodes_path.parent.mkdir(parents=True, exist_ok=True)
    resolved_people_nodes_path.parent.mkdir(parents=True, exist_ok=True)
    resolved_people_edges_path.parent.mkdir(parents=True, exist_ok=True)
    resolved_company_nodes_path.write_text(
        json.dumps(_frame_to_records(enriched_company_frame), indent=2, ensure_ascii=True),
        encoding="utf-8",
    )
    resolved_people_nodes_path.write_text(json.dumps(people_nodes, indent=2, ensure_ascii=True), encoding="utf-8")
    resolved_people_edges_path.write_text(json.dumps(people_edges, indent=2, ensure_ascii=True), encoding="utf-8")

    return StageResult(
        name="people_synthesis",
        outputs={
            "scope": scope,
            "company_nodes_path": str(resolved_company_nodes_path),
            "people_nodes_path": str(resolved_people_nodes_path),
            "people_edges_path": str(resolved_people_edges_path),
            "people_count": len(people_nodes),
            "people_edge_count": len(people_edges),
        },
        details=f"Wrote synthesized people network for {scope} to {resolved_people_nodes_path.parent}",
    )
