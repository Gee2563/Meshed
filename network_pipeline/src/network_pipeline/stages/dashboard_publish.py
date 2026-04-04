from __future__ import annotations

from pathlib import Path

from ..a16z_crypto import (
    load_a16z_crypto_stage_bundle,
    publish_a16z_crypto_bundle,
    resolve_a16z_crypto_input_root,
)
from ..core import PipelineContext, StageResult


def run(
    context: PipelineContext,
    *,
    input_root: str | Path | None = None,
    stage_path: str | Path | None = None,
    output_root: str | Path | None = None,
) -> StageResult:
    resolved_stage_path = context.resolve_path(stage_path) if stage_path else None
    if resolved_stage_path is not None:
        stage_bundle = load_a16z_crypto_stage_bundle(resolved_stage_path)
        resolved_input_root = Path(str(stage_bundle.get("source_root", "")))
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
        "stage_path": str(resolved_stage_path) if resolved_stage_path is not None else "",
        "publish_root": str(publish_root),
        "scope": "a16z-crypto",
        "artifact_count": 5,
      },
      details=f"Published a16z-crypto bundle from {resolved_input_root} to {publish_root}",
    )
