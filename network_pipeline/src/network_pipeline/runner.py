from __future__ import annotations

from pathlib import Path
from typing import Mapping, Sequence

from .config import PipelineConfig, load_config
from .core import PipelineContext, StageResult
from .registry import STAGES


PIPELINE_ORDER = ["source_registry", "fetch_raw", "scrape_portfolio", "normalize_schema", "similarity_scoring", "dashboard_publish"]


class PipelineRunner:
    def __init__(self, config: PipelineConfig | None = None, *, workdir: Path | None = None) -> None:
        self.config = config
        self.context = PipelineContext(workdir=workdir or Path.cwd())

    @classmethod
    def from_file(
        cls,
        path: str | Path | None = None,
        *,
        workdir: Path | None = None,
    ) -> "PipelineRunner":
        return cls(load_config(path), workdir=workdir)

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

            stage_kwargs: dict[str, object] = {}
            if self.config is not None:
                stage_kwargs.update(self.config.stage(name, required=False))
            stage_kwargs.update(dict(stage_overrides.get(name, {})))

            result = stage_fn(self.context, **stage_kwargs)
            results.append(result)
            if stop_on_failure and result.status == "failed":
                break

        return results
