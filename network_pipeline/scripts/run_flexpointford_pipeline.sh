#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${SCRIPT_DIR}/.."

cd "${PROJECT_ROOT}"
source venv/bin/activate

python3 scripts/scrape_flexpointford_team.py
python3 scripts/scrape_flexpointford_investments.py
python3 scripts/build_flexpointford_graph_bundle.py
