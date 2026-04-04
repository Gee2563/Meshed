from __future__ import annotations

import json
from pathlib import Path

from ..a16z_crypto import (
    get_a16z_crypto_fetch_root,
    get_a16z_crypto_stage_path,
    write_a16z_crypto_stage_bundle,
)
from ..core import PipelineContext, StageResult


def run(
    context: PipelineContext,
    *,
    input_root: str | Path | None = None,
    output_path: str | Path | None = None,
) -> StageResult:
    resolved_input_root = context.resolve_path(input_root) if input_root else get_a16z_crypto_fetch_root()
    resolved_output_path = context.resolve_path(output_path) if output_path else get_a16z_crypto_stage_path()
    stage_path = write_a16z_crypto_stage_bundle(resolved_output_path, input_root=resolved_input_root)
    stage_bundle = json.loads(stage_path.read_text(encoding="utf-8"))
    dashboard_snapshot = stage_bundle.get("dashboard_snapshot", {})

    return StageResult(
      name="scrape_portfolio",
      outputs={
        "input_root": str(resolved_input_root),
        "portfolio_snapshot_path": str(stage_path),
        "company_count": int(dashboard_snapshot.get("company_count", 0)),
        "people_count": int(dashboard_snapshot.get("people_count", 0)),
      },
      details=f"Wrote staged a16z-crypto portfolio snapshot to {stage_path}",
    )
