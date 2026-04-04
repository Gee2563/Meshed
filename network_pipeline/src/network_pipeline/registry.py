from __future__ import annotations

from typing import Callable

from .core import PipelineContext, StageResult
from .stages import dashboard_publish, fetch_raw, normalize_schema, scrape_portfolio, similarity_scoring, source_registry

StageFn = Callable[[PipelineContext], StageResult]

STAGES: dict[str, StageFn] = {
    "source_registry": source_registry.run,
    "fetch_raw": fetch_raw.run,
    "scrape_portfolio": scrape_portfolio.run,
    "normalize_schema": normalize_schema.run,
    "similarity_scoring": similarity_scoring.run,
    "dashboard_publish": dashboard_publish.run,
}

__all__ = ["STAGES", "StageFn"]
