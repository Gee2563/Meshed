from __future__ import annotations

from copy import deepcopy
from pathlib import Path
from typing import Any, MutableMapping

import yaml


DEFAULT_CONFIG_PATH = Path(__file__).resolve().parents[3] / "config" / "pipeline.a16z-crypto.yml"


class PipelineConfig:
    def __init__(self, data: dict[str, Any], path: Path) -> None:
        self._data = dict(data)
        self.path = path

    @classmethod
    def load(cls, path: str | Path | None = None) -> "PipelineConfig":
        resolved = Path(path or DEFAULT_CONFIG_PATH)
        if not resolved.exists():
            raise FileNotFoundError(f"Pipeline config not found at {resolved}")

        with resolved.open("r", encoding="utf-8") as handle:
            raw = yaml.safe_load(handle) or {}

        if not isinstance(raw, MutableMapping):
            raise ValueError(f"Pipeline config at {resolved} must be a mapping.")

        return cls(dict(raw), resolved)

    @property
    def raw(self) -> dict[str, Any]:
        return deepcopy(self._data)

    def stage(self, name: str, *, required: bool = True) -> dict[str, Any]:
        pipeline_cfg = self._data.get("pipeline", {})
        if not isinstance(pipeline_cfg, MutableMapping):
            if required:
                raise KeyError(f"Pipeline config at {self.path} is missing a 'pipeline' mapping")
            return {}

        stage_cfg = pipeline_cfg.get(name)
        if stage_cfg is None:
            if required:
                raise KeyError(f"Stage '{name}' not found in pipeline config {self.path}")
            return {}
        if not isinstance(stage_cfg, MutableMapping):
            raise ValueError(f"Stage '{name}' in pipeline config {self.path} must be a mapping")
        return deepcopy(dict(stage_cfg))


def load_config(path: str | Path | None = None) -> PipelineConfig:
    return PipelineConfig.load(path)
