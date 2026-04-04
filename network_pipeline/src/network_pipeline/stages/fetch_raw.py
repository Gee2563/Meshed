from __future__ import annotations

import csv
import shutil
from datetime import datetime, timezone
from pathlib import Path

from ..a16z_crypto import REQUIRED_A16Z_CRYPTO_FILES, get_a16z_crypto_fetch_root
from ..core import PipelineContext, StageResult


def _is_active(value: str) -> bool:
    return value.strip().lower() in {"true", "1", "yes", "y"}


def run(
    context: PipelineContext,
    *,
    sources_path: str | Path | None = None,
    output_dir: str | Path | None = None,
    metadata_path: str | Path | None = None,
    overwrite: bool = False,
) -> StageResult:
    registry_path = context.resolve_path(sources_path) if sources_path else (context.workdir / "data" / "sources" / "a16z_crypto_sources.csv")
    raw_root = context.resolve_path(output_dir) if output_dir else get_a16z_crypto_fetch_root()
    raw_root.mkdir(parents=True, exist_ok=True)
    fetch_metadata_path = context.resolve_path(metadata_path) if metadata_path else (context.workdir / "data" / "raw" / "a16z_crypto_fetch_metadata.csv")
    fetch_metadata_path.parent.mkdir(parents=True, exist_ok=True)

    if not registry_path.exists():
        return StageResult(
            name="fetch_raw",
            status="failed",
            details=f"Source registry not found: {registry_path}",
        )

    with registry_path.open("r", encoding="utf-8", newline="") as handle:
        rows = list(csv.DictReader(handle))

    active_rows = [row for row in rows if _is_active(str(row.get("active", "true")))]
    metadata_rows: list[dict[str, str | int]] = []
    success_count = 0

    for row in active_rows:
        source_id = str(row.get("source_id", "")).strip()
        source_root = context.resolve_path(str(row.get("source_root", "")).strip())
        copied_files: list[str] = []
        status = "success"
        error = ""

        try:
            for file_name in REQUIRED_A16Z_CRYPTO_FILES:
                source_path = source_root / file_name
                if not source_path.exists():
                    raise FileNotFoundError(f"Missing source artifact: {source_path}")
                target_path = raw_root / file_name
                if overwrite or not target_path.exists():
                    shutil.copyfile(source_path, target_path)
                copied_files.append(file_name)
            success_count += 1
        except Exception as exc:
            status = "failed"
            error = str(exc)

        metadata_rows.append(
            {
                "source_id": source_id,
                "source_root": str(source_root),
                "target_root": str(raw_root),
                "status": status,
                "artifact_count": len(copied_files),
                "artifact_files": "|".join(copied_files),
                "error": error,
                "fetched_at": datetime.now(timezone.utc).isoformat(),
            }
        )

    with fetch_metadata_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "source_id",
                "source_root",
                "target_root",
                "status",
                "artifact_count",
                "artifact_files",
                "error",
                "fetched_at",
            ],
        )
        writer.writeheader()
        writer.writerows(metadata_rows)

    return StageResult(
        name="fetch_raw",
        outputs={
            "metadata_path": str(fetch_metadata_path),
            "raw_root": str(raw_root),
            "sources_attempted": len(active_rows),
            "sources_successful": success_count,
        },
        details=f"Fetched {success_count} source bundle(s) into {raw_root}",
    )
