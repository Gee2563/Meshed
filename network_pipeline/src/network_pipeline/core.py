from __future__ import annotations

import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


@dataclass
class StageResult:
    name: str
    status: str = "success"
    outputs: dict[str, Any] = field(default_factory=dict)
    details: str | None = None


@dataclass
class PipelineContext:
    workdir: Path = field(default_factory=Path.cwd)
    logger: logging.Logger = field(default_factory=lambda: logging.getLogger("network_pipeline"))
