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
    get_a16z_crypto_normalized_path,
    get_a16z_crypto_publish_root,
    load_a16z_crypto_normalized_companies,
    load_a16z_crypto_stage_bundle,
    load_a16z_crypto_dashboard_snapshot,
    publish_a16z_crypto_bundle,
)
from network_pipeline.runner import PipelineRunner  # noqa: E402


class A16zCryptoArtifactsTest(unittest.TestCase):
    def test_load_dashboard_snapshot_from_published_a16z_crypto_artifacts(self) -> None:
        snapshot = load_a16z_crypto_dashboard_snapshot(get_a16z_crypto_artifacts_root())

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

    def test_scrape_portfolio_stage_writes_staged_snapshot(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            raw_root = root / "data" / "raw" / "a16z-crypto"
            raw_root.mkdir(parents=True, exist_ok=True)
            for file_name in (
                "company_network_data.json",
                "company_network_summary.json",
                "people_network_data.json",
            ):
                (raw_root / file_name).write_text(
                    (get_a16z_crypto_artifacts_root() / file_name).read_text(encoding="utf-8"),
                    encoding="utf-8",
                )

            stage_path = root / "data" / "staging" / "a16z-crypto" / "portfolio_snapshot.json"
            runner = PipelineRunner(workdir=root)
            results = runner.run(
                stages=["scrape_portfolio"],
                overrides={
                    "scrape_portfolio": {
                        "input_root": raw_root,
                        "output_path": stage_path,
                    },
                },
            )

            self.assertEqual(len(results), 1)
            self.assertEqual(results[0].name, "scrape_portfolio")
            self.assertEqual(results[0].status, "success")
            self.assertTrue(stage_path.exists())

            stage_bundle = load_a16z_crypto_stage_bundle(stage_path)
            self.assertEqual(stage_bundle.get("scope"), "a16z-crypto")
            self.assertEqual(stage_bundle.get("dashboard_snapshot", {}).get("company_count"), 125)
            self.assertEqual(stage_bundle.get("dashboard_snapshot", {}).get("top_companies", [])[0].get("company_name"), "Battlebound")

    def test_normalize_schema_stage_writes_flat_company_list(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            raw_root = root / "data" / "raw" / "a16z-crypto"
            raw_root.mkdir(parents=True, exist_ok=True)
            for file_name in (
                "company_network_data.json",
                "company_network_summary.json",
                "people_network_data.json",
            ):
                (raw_root / file_name).write_text(
                    (get_a16z_crypto_artifacts_root() / file_name).read_text(encoding="utf-8"),
                    encoding="utf-8",
                )

            stage_path = root / "data" / "staging" / "a16z-crypto" / "portfolio_snapshot.json"
            normalized_path = root / "data" / "staging" / "a16z-crypto" / "companies_normalized.json"
            runner = PipelineRunner(workdir=root)
            results = runner.run(
                stages=["scrape_portfolio", "normalize_schema"],
                overrides={
                    "scrape_portfolio": {
                        "input_root": raw_root,
                        "output_path": stage_path,
                    },
                    "normalize_schema": {
                        "input_path": stage_path,
                        "output_path": normalized_path,
                    },
                },
            )

            self.assertEqual([result.name for result in results], ["scrape_portfolio", "normalize_schema"])
            self.assertTrue(normalized_path.exists())

            normalized_companies = load_a16z_crypto_normalized_companies(normalized_path)
            self.assertEqual(len(normalized_companies), 125)
            self.assertEqual(normalized_companies[0].get("company_name_raw"), "Alchemy")
            self.assertEqual(normalized_companies[0].get("company_name_norm"), "alchemy")
            self.assertEqual(normalized_companies[0].get("website_domain"), "alchemy.com")

    def test_pipeline_runner_executes_source_registry_fetch_raw_scrape_normalize_and_publish(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            sources_path = root / "data" / "sources" / "a16z_crypto_sources.csv"
            raw_root = root / "data" / "raw" / "a16z-crypto"
            metadata_path = root / "data" / "raw" / "a16z_crypto_fetch_metadata.csv"
            stage_path = root / "data" / "staging" / "a16z-crypto" / "portfolio_snapshot.json"
            normalized_path = root / "data" / "staging" / "a16z-crypto" / "companies_normalized.json"
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
                    "scrape_portfolio": {
                        "input_root": raw_root,
                        "output_path": stage_path,
                    },
                    "normalize_schema": {
                        "input_path": stage_path,
                        "output_path": normalized_path,
                    },
                    "dashboard_publish": {
                        "normalized_path": normalized_path,
                        "stage_path": stage_path,
                        "output_root": publish_root,
                    },
                }
            )

            self.assertEqual(
                [result.name for result in results],
                ["source_registry", "fetch_raw", "scrape_portfolio", "normalize_schema", "dashboard_publish"],
            )
            self.assertTrue(sources_path.exists())
            self.assertTrue(metadata_path.exists())
            self.assertTrue((raw_root / "company_network_data.json").exists())
            self.assertTrue(stage_path.exists())
            self.assertTrue(normalized_path.exists())
            self.assertTrue((publish_root / "dashboard_snapshot.json").exists())
            self.assertEqual(results[1].outputs.get("raw_root"), str(raw_root))
            self.assertEqual(results[2].outputs.get("portfolio_snapshot_path"), str(stage_path))
            self.assertEqual(results[3].outputs.get("normalized_path"), str(normalized_path))
            self.assertEqual(results[4].outputs.get("stage_path"), str(stage_path))
            self.assertEqual(results[4].outputs.get("normalized_path"), str(normalized_path))
            self.assertEqual(results[4].outputs.get("normalized_company_count"), 125)

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

    def test_pipeline_runner_from_file_uses_yaml_config(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            config_path = root / "pipeline.a16z-crypto.yml"
            config_path.write_text(
                json.dumps(
                    {
                        "version": 1,
                        "pipeline": {
                            "source_registry": {
                                "output_path": "data/sources/a16z_crypto_sources.csv",
                                "source_root": str(get_a16z_crypto_artifacts_root()),
                                "overwrite": True,
                            },
                            "fetch_raw": {
                                "sources_path": "data/sources/a16z_crypto_sources.csv",
                                "output_dir": "data/raw/a16z-crypto",
                                "metadata_path": "data/raw/a16z_crypto_fetch_metadata.csv",
                                "overwrite": True,
                            },
                            "scrape_portfolio": {
                                "input_root": "data/raw/a16z-crypto",
                                "output_path": "data/staging/a16z-crypto/portfolio_snapshot.json",
                            },
                            "normalize_schema": {
                                "input_path": "data/staging/a16z-crypto/portfolio_snapshot.json",
                                "output_path": "data/staging/a16z-crypto/companies_normalized.json",
                            },
                            "dashboard_publish": {
                                "normalized_path": "data/staging/a16z-crypto/companies_normalized.json",
                                "stage_path": "data/staging/a16z-crypto/portfolio_snapshot.json",
                                "output_root": "public/a16z-crypto",
                            },
                        },
                    },
                    indent=2,
                ),
                encoding="utf-8",
            )

            runner = PipelineRunner.from_file(config_path, workdir=root)
            results = runner.run()

            self.assertEqual(
                [result.name for result in results],
                ["source_registry", "fetch_raw", "scrape_portfolio", "normalize_schema", "dashboard_publish"],
            )
            self.assertTrue((root / "data" / "sources" / "a16z_crypto_sources.csv").exists())
            self.assertTrue((root / "data" / "raw" / "a16z-crypto" / "company_network_data.json").exists())
            self.assertTrue((root / "data" / "staging" / "a16z-crypto" / "portfolio_snapshot.json").exists())
            self.assertTrue((root / "data" / "staging" / "a16z-crypto" / "companies_normalized.json").exists())
            self.assertTrue((root / "public" / "a16z-crypto" / "dashboard_snapshot.json").exists())


if __name__ == "__main__":
    unittest.main()
