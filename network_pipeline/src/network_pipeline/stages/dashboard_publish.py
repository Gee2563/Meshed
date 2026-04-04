from __future__ import annotations

from pathlib import Path

from ..a16z_crypto import publish_a16z_crypto_bundle
from ..core import PipelineContext, StageResult


def run(context: PipelineContext, *, output_root: Path | None = None) -> StageResult:
    publish_root = publish_a16z_crypto_bundle(output_root)
    return StageResult(
      name="dashboard_publish",
      outputs={
        "publish_root": str(publish_root),
        "scope": "a16z-crypto",
        "artifact_count": 5,
      },
      details=f"Published a16z-crypto bundle to {publish_root}",
    )
