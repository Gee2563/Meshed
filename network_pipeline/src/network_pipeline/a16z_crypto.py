from __future__ import annotations

import json
import os
import re
from collections import Counter
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any


REQUIRED_A16Z_CRYPTO_FILES = (
    "company_network_data.json",
    "company_network_summary.json",
    "people_network_data.json",
)


def get_a16z_crypto_artifacts_root() -> Path:
    return _project_root() / "public" / "crypto_ecosystems" / "a16z-crypto"


def get_a16z_crypto_fetch_root() -> Path:
    return _project_root() / "data" / "raw" / "a16z-crypto"


def get_a16z_crypto_staging_root() -> Path:
    return _project_root() / "data" / "staging" / "a16z-crypto"


def get_a16z_crypto_stage_path() -> Path:
    return get_a16z_crypto_staging_root() / "portfolio_snapshot.json"


def get_a16z_crypto_normalized_path() -> Path:
    return get_a16z_crypto_staging_root() / "companies_normalized.json"


def get_a16z_crypto_network_root() -> Path:
    return _project_root() / "data" / "network" / "a16z-crypto"


def get_a16z_crypto_company_nodes_path() -> Path:
    return get_a16z_crypto_network_root() / "company_nodes.json"


def get_a16z_crypto_company_edges_path() -> Path:
    return get_a16z_crypto_network_root() / "company_edges.json"


def get_a16z_crypto_publish_root() -> Path:
    return _project_root() / "public" / "a16z-crypto"


def _project_root() -> Path:
    env_root = os.environ.get("NETWORK_PIPELINE_ROOT")
    if env_root:
        return Path(env_root).expanduser().resolve()

    search_roots = [Path.cwd(), *Path.cwd().parents, *Path(__file__).resolve().parents]
    seen: set[Path] = set()
    for root in search_roots:
        resolved = root.resolve()
        if resolved in seen:
            continue
        seen.add(resolved)
        if (resolved / "pyproject.toml").exists() and (resolved / "src" / "network_pipeline").exists():
            return resolved

    return Path.cwd().resolve()


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


def _as_float(value: object) -> float | None:
    if isinstance(value, bool):
        return float(int(value))
    if isinstance(value, int):
        return float(value)
    if isinstance(value, float):
        return float(value)
    return None


def _normalize_company_name(value: object) -> str:
    text = _as_text(value).lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


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


def build_a16z_crypto_normalized_companies(stage_path: Path) -> list[dict[str, object]]:
    stage_bundle = load_a16z_crypto_stage_bundle(stage_path)
    company_network_data = stage_bundle.get("company_network_data", {})
    company_nodes = company_network_data.get("nodes", []) if isinstance(company_network_data, dict) else []

    normalized: list[dict[str, object]] = []
    for node in company_nodes:
        if not isinstance(node, dict):
            continue

        company_name = _as_text(node.get("company_name")) or _as_text(node.get("label")) or "Unknown company"
        website = _as_text(node.get("website"))
        normalized.append(
          {
            "source_id": "a16z-crypto",
            "investor_name": _as_text(node.get("investor_names_label")) or "a16z crypto",
            "source_type": "crypto_ecosystem",
            "company_id": _as_text(node.get("company_id")) or _as_text(node.get("id")) or company_name,
            "company_name": company_name,
            "company_name_raw": company_name,
            "company_name_norm": _normalize_company_name(company_name),
            "website_domain": _as_text(node.get("website_domain")) or None,
            "website": website or None,
            "vertical": _as_text(node.get("vertical")) or None,
            "vertical_raw": _as_text(node.get("vertical")) or None,
            "stage": _as_text(node.get("stage")) or None,
            "stage_raw": _as_text(node.get("stage")) or None,
            "location": _as_text(node.get("location")) or None,
            "location_raw": _as_text(node.get("location")) or None,
            "location_region": _as_text(node.get("location_region")) or None,
            "flexpoint_logo_url": _as_text(node.get("flexpoint_logo_url")) or None,
            "flexpoint_logo_path": _as_text(node.get("flexpoint_logo_path")) or None,
            "employees": _as_float(node.get("employees")),
            "amount_raised": _as_float(node.get("amount_raised")),
            "revenue": _as_float(node.get("revenue")),
            "current_pain_point_tags": _as_text(node.get("current_pain_point_tags")) or None,
            "current_pain_point_count": _as_int(node.get("current_pain_point_count")),
            "resolved_pain_point_tags": _as_text(node.get("resolved_pain_point_tags")) or None,
            "resolved_pain_point_count": _as_int(node.get("resolved_pain_point_count")),
            "investor_names": _as_text(node.get("investor_names")) or "a16z crypto",
            "investor_names_label": _as_text(node.get("investor_names_label")) or "a16z crypto",
            "investor_count": _as_int(node.get("investor_count")),
            "taxonomy_tokens": _as_text(node.get("taxonomy_tokens")) or None,
            "degree": _as_int(node.get("degree")),
            "people_count": _as_int(node.get("people_count")),
          }
        )

    return normalized


def write_a16z_crypto_normalized_companies(
    output_path: Path | None = None,
    *,
    stage_path: Path,
) -> Path:
    normalized_path = output_path or get_a16z_crypto_normalized_path()
    normalized_path.parent.mkdir(parents=True, exist_ok=True)
    normalized_path.write_text(
      json.dumps(build_a16z_crypto_normalized_companies(stage_path), indent=2, ensure_ascii=True),
      encoding="utf-8",
    )
    return normalized_path


def load_a16z_crypto_normalized_companies(path: Path) -> list[dict[str, object]]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    return payload if isinstance(payload, list) else []


def load_a16z_crypto_company_nodes(path: Path) -> list[dict[str, object]]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    return payload if isinstance(payload, list) else []


def load_a16z_crypto_company_edges(path: Path) -> list[dict[str, object]]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    return payload if isinstance(payload, list) else []


def _build_company_network_legend(nodes: list[dict[str, object]]) -> list[dict[str, object]]:
    counts = Counter(_as_text(node.get("vertical")) or "Other" for node in nodes if isinstance(node, dict))
    colors = {
        _as_text(node.get("vertical")) or "Other": _as_text(node.get("color_hex")) or "#64748b"
        for node in nodes
        if isinstance(node, dict)
    }
    return [
        {"vertical": vertical, "color": colors.get(vertical, "#64748b"), "count": counts.get(vertical, 0)}
        for vertical in sorted(counts)
    ]


def _build_company_network_payload(
    stage_bundle: dict[str, object],
    *,
    company_nodes_path: Path | None = None,
    company_edges_path: Path | None = None,
) -> dict[str, object]:
    company_network_data = stage_bundle.get("company_network_data", {})
    if not isinstance(company_network_data, dict):
        company_network_data = {}

    if company_nodes_path is None or company_edges_path is None:
        return company_network_data

    source_nodes = company_network_data.get("nodes", [])
    source_nodes_by_company_id: dict[str, dict[str, object]] = {}
    if isinstance(source_nodes, list):
        for node in source_nodes:
            if not isinstance(node, dict):
                continue
            company_id = _as_text(node.get("company_id")) or _as_text(node.get("id"))
            if company_id:
                source_nodes_by_company_id[company_id] = node

    merged_nodes: list[dict[str, object]] = []
    for node in load_a16z_crypto_company_nodes(company_nodes_path):
        company_id = _as_text(node.get("company_id")) or _as_text(node.get("id"))
        source_node = source_nodes_by_company_id.get(company_id, {})
        merged_nodes.append({**source_node, **node})

    edges = load_a16z_crypto_company_edges(company_edges_path)
    return {
        "scope": _as_text(company_network_data.get("scope")) or "a16z-crypto",
        "scope_label": _as_text(company_network_data.get("scope_label")) or "a16z crypto",
        "nodes": merged_nodes,
        "edges": edges,
        "legend": _build_company_network_legend(merged_nodes),
    }


def _build_company_network_summary_payload(
    company_network_data: dict[str, object],
    people_network_data: dict[str, object],
) -> dict[str, object]:
    company_nodes = company_network_data.get("nodes", []) if isinstance(company_network_data, dict) else []
    company_edges = company_network_data.get("edges", []) if isinstance(company_network_data, dict) else []
    people_summary = people_network_data.get("summary", {}) if isinstance(people_network_data, dict) else {}
    vertical_count = len(
        {
            _as_text(node.get("vertical")) or "Other"
            for node in company_nodes
            if isinstance(node, dict)
        }
    )

    return {
        "summary": {
            "scope": _as_text(company_network_data.get("scope")) or "a16z-crypto",
            "scope_label": _as_text(company_network_data.get("scope_label")) or "a16z crypto",
            "company_count": len(company_nodes),
            "edge_count": len(company_edges),
            "people_profile_count": _as_int(people_summary.get("people_count")),
            "vertical_count": vertical_count,
            "generated_via": "network_pipeline.similarity_scoring",
        }
    }


def publish_a16z_crypto_bundle(
    output_root: Path | None = None,
    *,
    input_root: Path | None = None,
    stage_path: Path | None = None,
    company_nodes_path: Path | None = None,
    company_edges_path: Path | None = None,
) -> Path:
    publish_root = output_root or get_a16z_crypto_publish_root()
    publish_root.mkdir(parents=True, exist_ok=True)

    if stage_path is not None:
        stage_bundle = load_a16z_crypto_stage_bundle(stage_path)
        people_network_data = stage_bundle.get("people_network_data", {})
        company_network_data = _build_company_network_payload(
            stage_bundle,
            company_nodes_path=company_nodes_path,
            company_edges_path=company_edges_path,
        )
        company_network_summary = _build_company_network_summary_payload(company_network_data, people_network_data)
    else:
        source_root = resolve_a16z_crypto_input_root(input_root)
        company_network_data = _read_json("company_network_data.json", input_root=source_root)
        company_network_summary = _read_json("company_network_summary.json", input_root=source_root)
        people_network_data = _read_json("people_network_data.json", input_root=source_root)

    bundle_payloads = {
      "company_network_data.json": company_network_data,
      "company_network_summary.json": company_network_summary,
      "people_network_data.json": people_network_data,
      "network_data.json": company_network_data,
    }
    for file_name, payload in bundle_payloads.items():
        (publish_root / file_name).write_text(
          json.dumps(payload, indent=2, ensure_ascii=True),
          encoding="utf-8",
        )

    dashboard_snapshot = build_a16z_crypto_dashboard_document(publish_root)
    (publish_root / "dashboard_snapshot.json").write_text(
      json.dumps(dashboard_snapshot, indent=2, ensure_ascii=True),
      encoding="utf-8",
    )

    return publish_root
