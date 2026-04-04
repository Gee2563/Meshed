from __future__ import annotations

from pathlib import Path

from ..a16z_crypto import publish_a16z_crypto_bundle, resolve_a16z_crypto_input_root
from ..core import PipelineContext, StageResult


def run(
    context: PipelineContext,
    *,
    input_root: Path | None = None,
    output_root: Path | None = None,
) -> StageResult:
    resolved_input_root = resolve_a16z_crypto_input_root(input_root)
    publish_root = publish_a16z_crypto_bundle(output_root, input_root=resolved_input_root)
    return StageResult(
      name="dashboard_publish",
      outputs={
        "input_root": str(resolved_input_root),
        "publish_root": str(publish_root),
        "scope": "a16z-crypto",
        "artifact_count": 5,
      },
      details=f"Published a16z-crypto bundle from {resolved_input_root} to {publish_root}",
    )
