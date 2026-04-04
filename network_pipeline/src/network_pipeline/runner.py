from __future__ import annotations

from pathlib import Path
from typing import Mapping, Sequence

from .core import PipelineContext, StageResult
from .registry import STAGES


PIPELINE_ORDER = ["source_registry", "fetch_raw", "dashboard_publish"]


class PipelineRunner:
    def __init__(self, *, workdir: Path | None = None) -> None:
        self.context = PipelineContext(workdir=workdir or Path.cwd())

    def available_stages(self) -> list[str]:
        return list(STAGES.keys())

    def run(
      self,
      stages: Sequence[str] | None = None,
      *,
      stop_on_failure: bool = True,
      overrides: Mapping[str, Mapping[str, object]] | None = None,
    ) -> list[StageResult]:
        order = list(stages or PIPELINE_ORDER)
        stage_overrides = overrides or {}
        results: list[StageResult] = []

        for name in order:
            stage_fn = STAGES.get(name)
            if stage_fn is None:
                results.append(
                  StageResult(
                    name=name,
                    status="skipped",
                    details=f"Stage '{name}' is not registered.",
                  )
                )
                continue

            result = stage_fn(self.context, **dict(stage_overrides.get(name, {})))
            results.append(result)
            if stop_on_failure and result.status == "failed":
                break

        return results
