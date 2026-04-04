from __future__ import annotations

import csv
import json
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from network_pipeline.a16z_crypto import (  # noqa: E402
    get_a16z_crypto_artifacts_root,
    get_a16z_crypto_fetch_root,
    get_a16z_crypto_publish_root,
    load_a16z_crypto_dashboard_snapshot,
    publish_a16z_crypto_bundle,
)
from network_pipeline.runner import PipelineRunner  # noqa: E402


class A16zCryptoArtifactsTest(unittest.TestCase):
    def test_load_dashboard_snapshot_from_published_a16z_crypto_artifacts(self) -> None:
        snapshot = load_a16z_crypto_dashboard_snapshot()

        self.assertEqual(snapshot.scope, "a16z-crypto")
        self.assertEqual(snapshot.company_count, 125)
        self.assertEqual(snapshot.people_count, 499)
        self.assertEqual(snapshot.company_edge_count, 360)
        self.assertEqual(snapshot.vertical_count, 103)
        self.assertEqual(snapshot.top_companies[0].company_name, "Battlebound")
        self.assertGreaterEqual(snapshot.top_companies[0].degree, snapshot.top_companies[1].degree)
        self.assertTrue(snapshot.featured_people)
        self.assertEqual(snapshot.source_root, get_a16z_crypto_artifacts_root())

    def test_publish_bundle_writes_rho_style_public_artifacts(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            publish_root = publish_a16z_crypto_bundle(Path(tmp_dir))

            self.assertEqual(publish_root, Path(tmp_dir))
            self.assertNotEqual(publish_root, get_a16z_crypto_publish_root())

            company_data = json.loads((publish_root / "company_network_data.json").read_text(encoding="utf-8"))
            company_summary = json.loads((publish_root / "company_network_summary.json").read_text(encoding="utf-8"))
            people_data = json.loads((publish_root / "people_network_data.json").read_text(encoding="utf-8"))
            network_data = json.loads((publish_root / "network_data.json").read_text(encoding="utf-8"))
            dashboard_snapshot = json.loads((publish_root / "dashboard_snapshot.json").read_text(encoding="utf-8"))

            self.assertEqual(company_data.get("scope"), "a16z-crypto")
            self.assertEqual(network_data.get("scope"), company_data.get("scope"))
            self.assertEqual(company_summary.get("summary", {}).get("company_count"), 125)
            self.assertEqual(people_data.get("summary", {}).get("people_count"), 499)
            self.assertEqual(dashboard_snapshot.get("top_companies", [])[0].get("company_name"), "Battlebound")

    def test_pipeline_runner_executes_dashboard_publish_stage(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            runner = PipelineRunner(workdir=Path(tmp_dir))
            results = runner.run(
                stages=["dashboard_publish"],
                overrides={"dashboard_publish": {"output_root": Path(tmp_dir)}},
            )

            self.assertEqual(len(results), 1)
            self.assertEqual(results[0].name, "dashboard_publish")
            self.assertEqual(results[0].status, "success")
            self.assertEqual(results[0].outputs.get("scope"), "a16z-crypto")
            self.assertTrue((Path(tmp_dir) / "company_network_data.json").exists())

    def test_pipeline_runner_executes_source_registry_fetch_raw_and_publish(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            sources_path = root / "data" / "sources" / "a16z_crypto_sources.csv"
            raw_root = root / "data" / "raw" / "a16z-crypto"
            metadata_path = root / "data" / "raw" / "a16z_crypto_fetch_metadata.csv"
            publish_root = root / "public" / "a16z-crypto"

            runner = PipelineRunner(workdir=root)
            results = runner.run(
                overrides={
                    "source_registry": {
                        "output_path": sources_path,
                        "source_root": get_a16z_crypto_artifacts_root(),
                        "overwrite": True,
                    },
                    "fetch_raw": {
                        "sources_path": sources_path,
                        "output_dir": raw_root,
                        "metadata_path": metadata_path,
                        "overwrite": True,
                    },
                    "dashboard_publish": {
                        "input_root": raw_root,
                        "output_root": publish_root,
                    },
                }
            )

            self.assertEqual([result.name for result in results], ["source_registry", "fetch_raw", "dashboard_publish"])
            self.assertTrue(sources_path.exists())
            self.assertTrue(metadata_path.exists())
            self.assertTrue((raw_root / "company_network_data.json").exists())
            self.assertTrue((publish_root / "dashboard_snapshot.json").exists())
            self.assertEqual(results[1].outputs.get("raw_root"), str(raw_root))
            self.assertEqual(results[2].outputs.get("input_root"), str(raw_root))

            with sources_path.open("r", encoding="utf-8", newline="") as handle:
                source_rows = list(csv.DictReader(handle))
            self.assertEqual(len(source_rows), 1)
            self.assertEqual(source_rows[0].get("source_id"), "a16z-crypto")
            self.assertEqual(source_rows[0].get("source_root"), str(get_a16z_crypto_artifacts_root()))

            with metadata_path.open("r", encoding="utf-8", newline="") as handle:
                metadata_rows = list(csv.DictReader(handle))
            self.assertEqual(len(metadata_rows), 1)
            self.assertEqual(metadata_rows[0].get("status"), "success")
            self.assertEqual(metadata_rows[0].get("artifact_count"), "3")


if __name__ == "__main__":
    unittest.main()
