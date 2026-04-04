from __future__ import annotations

import csv
from pathlib import Path

from ..a16z_crypto import get_a16z_crypto_artifacts_root
from ..core import PipelineContext, StageResult


REGISTRY_COLUMNS = [
    "source_id",
    "investor_name",
    "source_type",
    "source_root",
    "active",
]


def _read_rows(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def run(
    context: PipelineContext,
    *,
    output_path: str | Path | None = None,
    source_root: str | Path | None = None,
    overwrite: bool = False,
) -> StageResult:
    registry_path = context.resolve_path(output_path) if output_path else (context.workdir / "data" / "sources" / "a16z_crypto_sources.csv")
    if registry_path.exists() and not overwrite:
        rows = _read_rows(registry_path)
        return StageResult(
            name="source_registry",
            outputs={"sources_path": str(registry_path), "source_count": len(rows)},
            details="existing source registry reused",
        )

    registry_path.parent.mkdir(parents=True, exist_ok=True)
    row = {
        "source_id": "a16z-crypto",
        "investor_name": "a16z crypto",
        "source_type": "crypto_ecosystem",
        "source_root": str(context.resolve_path(source_root) if source_root else get_a16z_crypto_artifacts_root()),
        "active": "true",
    }
    with registry_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=REGISTRY_COLUMNS)
        writer.writeheader()
        writer.writerow(row)

    return StageResult(
        name="source_registry",
        outputs={"sources_path": str(registry_path), "source_count": 1},
        details=f"Wrote source registry to {registry_path}",
    )
