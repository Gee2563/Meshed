from __future__ import annotations

import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from network_pipeline.a16z_crypto import (  # noqa: E402
    get_a16z_crypto_artifacts_root,
    load_a16z_crypto_dashboard_snapshot,
)


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


if __name__ == "__main__":
    unittest.main()
