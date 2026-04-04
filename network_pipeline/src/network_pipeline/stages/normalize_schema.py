from __future__ import annotations

from pathlib import Path

from ..a16z_crypto import (
    get_a16z_crypto_normalized_path,
    get_a16z_crypto_stage_path,
    load_a16z_crypto_normalized_companies,
    write_a16z_crypto_normalized_companies,
)
from ..core import PipelineContext, StageResult


def run(
    context: PipelineContext,
    *,
    input_path: str | Path | None = None,
    output_path: str | Path | None = None,
) -> StageResult:
    resolved_input_path = context.resolve_path(input_path) if input_path else get_a16z_crypto_stage_path()
    resolved_output_path = context.resolve_path(output_path) if output_path else get_a16z_crypto_normalized_path()

    normalized_path = write_a16z_crypto_normalized_companies(
      resolved_output_path,
      stage_path=resolved_input_path,
    )
    normalized_companies = load_a16z_crypto_normalized_companies(normalized_path)

    return StageResult(
      name="normalize_schema",
      outputs={
        "input_path": str(resolved_input_path),
        "normalized_path": str(normalized_path),
        "rows": len(normalized_companies),
      },
      details=f"Wrote normalized a16z-crypto companies to {normalized_path}",
    )
