from __future__ import annotations

from pathlib import Path

from ..a16z_crypto import (
    load_a16z_crypto_normalized_companies,
    load_a16z_crypto_stage_bundle,
    publish_a16z_crypto_bundle,
    resolve_a16z_crypto_input_root,
)
from ..core import PipelineContext, StageResult


def run(
    context: PipelineContext,
    *,
    input_root: str | Path | None = None,
    normalized_path: str | Path | None = None,
    stage_path: str | Path | None = None,
    output_root: str | Path | None = None,
) -> StageResult:
    resolved_stage_path = context.resolve_path(stage_path) if stage_path else None
    resolved_normalized_path = context.resolve_path(normalized_path) if normalized_path else None
    normalized_company_count = 0
    if resolved_stage_path is not None:
        stage_bundle = load_a16z_crypto_stage_bundle(resolved_stage_path)
        resolved_input_root = Path(str(stage_bundle.get("source_root", "")))
        dashboard_snapshot = stage_bundle.get("dashboard_snapshot", {})
        if resolved_normalized_path is not None:
            normalized_companies = load_a16z_crypto_normalized_companies(resolved_normalized_path)
            normalized_company_count = len(normalized_companies)
            expected_company_count = int(dashboard_snapshot.get("company_count", 0)) if isinstance(dashboard_snapshot, dict) else 0
            if expected_company_count and normalized_company_count != expected_company_count:
                return StageResult(
                  name="dashboard_publish",
                  status="failed",
                  details=(
                    f"Normalized company count {normalized_company_count} did not match "
                    f"dashboard snapshot company count {expected_company_count}"
                  ),
                )
        publish_root = publish_a16z_crypto_bundle(
            context.resolve_path(output_root) if output_root else None,
            stage_path=resolved_stage_path,
        )
    else:
        resolved_input_root = resolve_a16z_crypto_input_root(context.resolve_path(input_root) if input_root else None)
        publish_root = publish_a16z_crypto_bundle(
            context.resolve_path(output_root) if output_root else None,
            input_root=resolved_input_root,
        )
    return StageResult(
      name="dashboard_publish",
      outputs={
        "input_root": str(resolved_input_root),
        "normalized_path": str(resolved_normalized_path) if resolved_normalized_path is not None else "",
        "normalized_company_count": normalized_company_count,
        "stage_path": str(resolved_stage_path) if resolved_stage_path is not None else "",
        "publish_root": str(publish_root),
        "scope": "a16z-crypto",
        "artifact_count": 5,
      },
      details=f"Published a16z-crypto bundle from {resolved_input_root} to {publish_root}",
    )
