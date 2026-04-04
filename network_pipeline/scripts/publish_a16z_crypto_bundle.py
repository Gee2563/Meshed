#!/usr/bin/env python3
from __future__ import annotations

import argparse
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = ROOT / "src"
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from network_pipeline.runner import PipelineRunner


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Publish the a16z-crypto public bundle.")
    parser.add_argument(
      "--config",
      type=Path,
      default=ROOT / "config" / "pipeline.a16z-crypto.yml",
      help="Path to the a16z-crypto pipeline config.",
    )
    parser.add_argument(
      "--output-root",
      type=Path,
      default=ROOT / "public" / "a16z-crypto",
      help="Path to the published a16z-crypto bundle root.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    runner = PipelineRunner.from_file(args.config.resolve(), workdir=ROOT)
    results = runner.run(
      stages=None,
      overrides={"dashboard_publish": {"output_root": args.output_root.resolve()}},
    )
    publish_root = results[-1].outputs.get("publish_root", "")
    print(f"[a16z-crypto] published={publish_root}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
