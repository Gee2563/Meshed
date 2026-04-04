from __future__ import annotations

import json
import re
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any


REQUIRED_A16Z_CRYPTO_FILES = (
    "company_network_data.json",
    "company_network_summary.json",
    "people_network_data.json",
)


def get_a16z_crypto_artifacts_root() -> Path:
    return Path(__file__).resolve().parents[2] / "public" / "crypto_ecosystems" / "a16z-crypto"


def get_a16z_crypto_fetch_root() -> Path:
    return Path(__file__).resolve().parents[2] / "data" / "raw" / "a16z-crypto"


def get_a16z_crypto_staging_root() -> Path:
    return Path(__file__).resolve().parents[2] / "data" / "staging" / "a16z-crypto"


def get_a16z_crypto_stage_path() -> Path:
    return get_a16z_crypto_staging_root() / "portfolio_snapshot.json"


def get_a16z_crypto_publish_root() -> Path:
    return Path(__file__).resolve().parents[2] / "public" / "a16z-crypto"


def _sanitize_published_json(raw: str) -> str:
    return re.sub(r":\s*NaN(?=\s*[,}\]])", ": null", raw)


def _root_has_required_files(root: Path) -> bool:
    return all((root / file_name).exists() for file_name in REQUIRED_A16Z_CRYPTO_FILES)


def resolve_a16z_crypto_input_root(input_root: Path | None = None) -> Path:
    if input_root is not None:
        return Path(input_root)

    fetched_root = get_a16z_crypto_fetch_root()
    if _root_has_required_files(fetched_root):
        return fetched_root

    return get_a16z_crypto_artifacts_root()


def _read_json(file_name: str, *, input_root: Path | None = None) -> Any:
    root = resolve_a16z_crypto_input_root(input_root)
    payload_path = root / file_name
    return json.loads(_sanitize_published_json(payload_path.read_text(encoding="utf-8")))


def _as_text(value: object) -> str:
    return value.strip() if isinstance(value, str) else ""


def _as_int(value: object) -> int:
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)
    return 0


def _as_string_list(value: object) -> list[str]:
    if isinstance(value, list):
        return [entry.strip() for entry in value if isinstance(entry, str) and entry.strip()]
    if isinstance(value, str):
        return [entry.strip() for entry in value.split("|") if entry.strip()]
    return []


@dataclass(frozen=True)
class A16zCryptoCompanyPreview:
    id: str
    company_name: str
    vertical: str | None
    location_region: str | None
    degree: int
    people_count: int


@dataclass(frozen=True)
class A16zCryptoPersonPreview:
    id: str
    name: str
    company: str | None
    suggested_role: str | None
    current_pain_point_label: str | None
    network_importance_score: int
    trust_signals: list[str]


@dataclass(frozen=True)
class A16zCryptoDashboardSnapshot:
    scope: str
    scope_label: str
    company_count: int
    company_edge_count: int
    people_profile_count: int
    vertical_count: int
    people_count: int
    people_company_count: int
    people_edge_count: int
    generated_via: str | None
    top_companies: list[A16zCryptoCompanyPreview]
    featured_people: list[A16zCryptoPersonPreview]
    source_root: Path


def _build_company_preview(node: dict[str, object]) -> A16zCryptoCompanyPreview:
    company_name = _as_text(node.get("company_name")) or _as_text(node.get("label")) or "Unknown company"
    identifier = _as_text(node.get("id")) or company_name

    return A16zCryptoCompanyPreview(
      id=identifier,
      company_name=company_name,
      vertical=_as_text(node.get("vertical")) or None,
      location_region=_as_text(node.get("location_region")) or None,
      degree=_as_int(node.get("degree")),
      people_count=_as_int(node.get("people_count")),
    )


def _build_person_preview(node: dict[str, object]) -> A16zCryptoPersonPreview:
    name = _as_text(node.get("name")) or _as_text(node.get("label")) or _as_text(node.get("id")) or "Unknown person"

    return A16zCryptoPersonPreview(
      id=_as_text(node.get("id")) or name,
      name=name,
      company=_as_text(node.get("company")) or None,
      suggested_role=_as_text(node.get("suggested_role")) or None,
      current_pain_point_label=_as_text(node.get("current_pain_point_label")) or None,
      network_importance_score=_as_int(node.get("network_importance_score")),
      trust_signals=_as_string_list(node.get("trust_signals")),
    )


def load_a16z_crypto_dashboard_snapshot(input_root: Path | None = None) -> A16zCryptoDashboardSnapshot:
    source_root = resolve_a16z_crypto_input_root(input_root)
    company_summary_payload = _read_json("company_network_summary.json", input_root=source_root)
    company_data_payload = _read_json("company_network_data.json", input_root=source_root)
    people_data_payload = _read_json("people_network_data.json", input_root=source_root)

    company_summary = company_summary_payload.get("summary", {}) if isinstance(company_summary_payload, dict) else {}
    people_summary = people_data_payload.get("summary", {}) if isinstance(people_data_payload, dict) else {}

    company_nodes = company_data_payload.get("nodes", []) if isinstance(company_data_payload, dict) else []
    people_nodes = people_data_payload.get("nodes", []) if isinstance(people_data_payload, dict) else []

    company_previews = [
      _build_company_preview(node)
      for node in company_nodes
      if isinstance(node, dict)
    ]
    people_previews = [
      _build_person_preview(node)
      for node in people_nodes
      if isinstance(node, dict)
    ]

    top_companies = sorted(
      company_previews,
      key=lambda item: (-item.degree, -item.people_count, item.company_name.lower()),
    )[:6]
    featured_people = sorted(
      people_previews,
      key=lambda item: (-item.network_importance_score, item.name.lower(), (item.company or "").lower()),
    )[:8]

    return A16zCryptoDashboardSnapshot(
      scope=_as_text(company_summary.get("scope")) or _as_text(company_data_payload.get("scope")) or "a16z-crypto",
      scope_label=_as_text(company_summary.get("scope_label")) or _as_text(company_data_payload.get("scope_label")) or "a16z crypto",
      company_count=_as_int(company_summary.get("company_count")) or len(company_previews),
      company_edge_count=_as_int(company_summary.get("edge_count")),
      people_profile_count=_as_int(company_summary.get("people_profile_count")),
      vertical_count=_as_int(company_summary.get("vertical_count")),
      people_count=_as_int(people_summary.get("people_count")) or len(people_previews),
      people_company_count=_as_int(people_summary.get("company_count")),
      people_edge_count=_as_int(people_summary.get("edge_count")),
      generated_via=_as_text(company_summary.get("generated_via")) or None,
      top_companies=top_companies,
      featured_people=featured_people,
      source_root=source_root,
    )


def build_a16z_crypto_dashboard_document(input_root: Path | None = None) -> dict[str, object]:
    snapshot = load_a16z_crypto_dashboard_snapshot(input_root)

    return {
      "scope": snapshot.scope,
      "scope_label": snapshot.scope_label,
      "company_count": snapshot.company_count,
      "company_edge_count": snapshot.company_edge_count,
      "people_profile_count": snapshot.people_profile_count,
      "vertical_count": snapshot.vertical_count,
      "people_count": snapshot.people_count,
      "people_company_count": snapshot.people_company_count,
      "people_edge_count": snapshot.people_edge_count,
      "generated_via": snapshot.generated_via,
      "top_companies": [asdict(item) for item in snapshot.top_companies],
      "featured_people": [asdict(item) for item in snapshot.featured_people],
    }


def build_a16z_crypto_stage_bundle(input_root: Path | None = None) -> dict[str, object]:
    source_root = resolve_a16z_crypto_input_root(input_root)
    company_network_data = _read_json("company_network_data.json", input_root=source_root)
    company_network_summary = _read_json("company_network_summary.json", input_root=source_root)
    people_network_data = _read_json("people_network_data.json", input_root=source_root)

    return {
      "scope": "a16z-crypto",
      "source_root": str(source_root),
      "company_network_data": company_network_data,
      "company_network_summary": company_network_summary,
      "people_network_data": people_network_data,
      "dashboard_snapshot": build_a16z_crypto_dashboard_document(source_root),
    }


def write_a16z_crypto_stage_bundle(
    output_path: Path | None = None,
    *,
    input_root: Path | None = None,
) -> Path:
    stage_path = output_path or get_a16z_crypto_stage_path()
    stage_path.parent.mkdir(parents=True, exist_ok=True)
    stage_path.write_text(
      json.dumps(build_a16z_crypto_stage_bundle(input_root), indent=2, ensure_ascii=True),
      encoding="utf-8",
    )
    return stage_path


def load_a16z_crypto_stage_bundle(stage_path: Path) -> dict[str, object]:
    return json.loads(stage_path.read_text(encoding="utf-8"))


def publish_a16z_crypto_bundle(
    output_root: Path | None = None,
    *,
    input_root: Path | None = None,
    stage_path: Path | None = None,
) -> Path:
    publish_root = output_root or get_a16z_crypto_publish_root()
    publish_root.mkdir(parents=True, exist_ok=True)

    if stage_path is not None:
        stage_bundle = load_a16z_crypto_stage_bundle(stage_path)
        company_network_data = stage_bundle.get("company_network_data", {})
        company_network_summary = stage_bundle.get("company_network_summary", {})
        people_network_data = stage_bundle.get("people_network_data", {})
        dashboard_snapshot = stage_bundle.get("dashboard_snapshot", {})
    else:
        source_root = resolve_a16z_crypto_input_root(input_root)
        company_network_data = _read_json("company_network_data.json", input_root=source_root)
        company_network_summary = _read_json("company_network_summary.json", input_root=source_root)
        people_network_data = _read_json("people_network_data.json", input_root=source_root)
        dashboard_snapshot = build_a16z_crypto_dashboard_document(source_root)

    bundle_payloads = {
      "company_network_data.json": company_network_data,
      "company_network_summary.json": company_network_summary,
      "people_network_data.json": people_network_data,
      "network_data.json": company_network_data,
      "dashboard_snapshot.json": dashboard_snapshot,
    }
    for file_name, payload in bundle_payloads.items():
        (publish_root / file_name).write_text(
          json.dumps(payload, indent=2, ensure_ascii=True),
          encoding="utf-8",
        )

    return publish_root
