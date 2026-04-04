from __future__ import annotations

from typing import Callable

from .core import PipelineContext, StageResult
from .stages import dashboard_publish

StageFn = Callable[[PipelineContext], StageResult]

STAGES: dict[str, StageFn] = {
    "dashboard_publish": dashboard_publish.run,
}

__all__ = ["STAGES", "StageFn"]
