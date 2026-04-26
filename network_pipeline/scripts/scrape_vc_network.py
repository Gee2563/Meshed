#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse

from bs4 import BeautifulSoup, Tag

from vc_scraper_runtime import (
    clean_text,
    extract_candidate_links,
    external_domain_allowed,
    fetch_html,
    looks_like_company_name,
    looks_like_person_name,
    normalize_url,
    same_domain,
    session,
)

PORTFOLIO_PATHS = (
    "/portfolio",
    "/investments",
    "/companies",
    "/portfolio-companies",
    "/our-companies",
    "/our-portfolio",
)

LP_PATHS = (
    "/team",
    "/people",
    "/partners",
    "/advisors",
    "/leadership",
    "/about",
)

KEYWORD_TO_PATHS = {
    "portfolio": PORTFOLIO_PATHS,
    "lp": LP_PATHS,
}

CLASS_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_-]*$")


def _slugify_website(website: str) -> str:
    domain = urlparse(website).netloc.lower().replace("www.", "")
    slug = re.sub(r"[^a-z0-9]+", "-", domain).strip("-")
    return slug or "vc-site"


def _keyword_matches(label: str, href: str, kind: str) -> bool:
    haystack = f"{label} {href}".lower()
    if kind == "portfolio":
        return any(keyword in haystack for keyword in ("portfolio", "investment", "company", "companies"))
    return any(keyword in haystack for keyword in ("team", "people", "partner", "advisor", "leadership", "about"))


def _candidate_page_urls(site_session, website: str, kind: str) -> list[str]:
    candidates: list[str] = []
    visited: set[str] = set()

    home = fetch_html(site_session, website)
    if home:
        html, resolved_url = home
        soup = BeautifulSoup(html, "html.parser")
        for label, href in extract_candidate_links(soup, resolved_url):
            if not same_domain(website, href):
                continue
            if not _keyword_matches(label, href, kind):
                continue
            normalized = normalize_url(href)
            if normalized and normalized not in visited:
                visited.add(normalized)
                candidates.append(normalized)

    for path in KEYWORD_TO_PATHS[kind]:
        normalized = normalize_url(path, website)
        if normalized and normalized not in visited:
            visited.add(normalized)
            candidates.append(normalized)

    confirmed: list[str] = []
    for candidate in candidates[:8]:
        fetched = fetch_html(site_session, candidate)
        if not fetched:
            continue
        _, resolved_url = fetched
        if same_domain(website, resolved_url) and resolved_url not in confirmed:
            confirmed.append(resolved_url)

    return confirmed


def _selector_candidates_for_node(node: Tag) -> list[str]:
    selectors: list[str] = []
    current: Tag | None = node
    depth = 0

    while current is not None and depth < 5:
        if current.name in {"body", "html"}:
            break
        if current.name in {"article", "li", "section"}:
            selectors.append(current.name)
        for class_name in current.get("class", []):
            if not isinstance(class_name, str) or not CLASS_RE.match(class_name):
                continue
            selectors.append(f".{class_name}")
            selectors.append(f"{current.name}.{class_name}")
        parent = current.parent
        current = parent if isinstance(parent, Tag) else None
        depth += 1

    return selectors


def _best_selector(soup: BeautifulSoup, nodes: list[Tag]) -> str | None:
    counts: Counter[str] = Counter()
    for node in nodes:
        for selector in _selector_candidates_for_node(node):
            counts[selector] += 1

    for selector, frequency in counts.most_common():
        if frequency < 2:
            continue
        try:
            matches = soup.select(selector)
        except Exception:
            continue
        if 2 <= len(matches) <= 60:
            return selector

    return None


def _infer_portfolio_card_selector(site_session, website: str, page_url: str) -> tuple[str | None, str]:
    fetched = fetch_html(site_session, page_url)
    if not fetched:
        return None, "portfolio page unavailable"

    html, resolved_url = fetched
    soup = BeautifulSoup(html, "html.parser")
    candidate_nodes: list[Tag] = []
    external_count = 0
    internal_count = 0

    for anchor in soup.select("a[href]"):
        if not isinstance(anchor, Tag):
            continue
        href = normalize_url(anchor.get("href"), resolved_url)
        label = clean_text(anchor.get_text(" ", strip=True))
        if not href:
            continue
        if external_domain_allowed(href, website) and (looks_like_company_name(label) or len(label) >= 3):
            external_count += 1
            parent = anchor.parent if isinstance(anchor.parent, Tag) else anchor
            candidate_nodes.append(parent)
            continue
        if same_domain(website, href) and href.rstrip("/") != resolved_url.rstrip("/") and looks_like_company_name(label):
            internal_count += 1
            parent = anchor.parent if isinstance(anchor.parent, Tag) else anchor
            candidate_nodes.append(parent)

    selector = _best_selector(soup, candidate_nodes)
    mode = "external-company-links" if external_count >= internal_count else "internal-detail-pages"
    note = f"learned portfolio card pattern from {resolved_url} using {mode}"
    return selector, note


def _infer_lp_card_selector(site_session, page_url: str) -> tuple[str | None, str]:
    fetched = fetch_html(site_session, page_url)
    if not fetched:
        return None, "lp page unavailable"

    html, resolved_url = fetched
    soup = BeautifulSoup(html, "html.parser")
    candidate_nodes: list[Tag] = []

    for container in soup.select("article, li, section, div"):
        if not isinstance(container, Tag):
            continue
        heading = container.select_one("h1, h2, h3, h4, strong, .name")
        if heading is None:
            continue
        name = clean_text(heading.get_text(" ", strip=True))
        if not looks_like_person_name(name):
            continue
        candidate_nodes.append(container)

    selector = _best_selector(soup, candidate_nodes)
    note = f"learned lp/advisor card pattern from {resolved_url}"
    return selector, note


def _inspect_site(site_session, website: str) -> dict[str, object]:
    portfolio_pages = _candidate_page_urls(site_session, website, "portfolio")
    lp_pages = _candidate_page_urls(site_session, website, "lp")

    portfolio_selector = None
    portfolio_note = "no portfolio pattern learned"
    if portfolio_pages:
        portfolio_selector, portfolio_note = _infer_portfolio_card_selector(site_session, website, portfolio_pages[0])

    lp_selector = None
    lp_note = "no lp/advisor pattern learned"
    if lp_pages:
        lp_selector, lp_note = _infer_lp_card_selector(site_session, lp_pages[0])

    return {
        "website": website,
        "portfolio_pages": portfolio_pages,
        "portfolio_card_selector": portfolio_selector,
        "portfolio_note": portfolio_note,
        "lp_pages": lp_pages,
        "lp_card_selector": lp_selector,
        "lp_note": lp_note,
    }


def _render_generated_script(config: dict[str, object]) -> str:
    config_blob = json.dumps(config, indent=2, sort_keys=True)
    return f'''#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

PIPELINE_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PIPELINE_ROOT / "scripts"))

from vc_scraper_runtime import run_vc_scrape

CONFIG = json.loads({config_blob!r})


def main() -> int:
    parser = argparse.ArgumentParser(description="Run a generated Meshed VC scraper.")
    parser.add_argument("--output", required=True, help="Path to the output JSON file")
    args = parser.parse_args()
    run_vc_scrape(CONFIG, Path(args.output))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
'''


def _default_generated_script_path(website: str) -> Path:
    pipeline_root = Path(__file__).resolve().parent.parent
    generated_dir = pipeline_root / "generated" / "vc_scrapers"
    generated_dir.mkdir(parents=True, exist_ok=True)
    return generated_dir / f"{_slugify_website(website)}_scraper.py"


def main() -> int:
    parser = argparse.ArgumentParser(description="Inspect a VC website, generate a custom scraper, and run it.")
    parser.add_argument("--website", required=True, help="VC website to inspect")
    parser.add_argument("--output", required=True, help="Path to the output JSON file")
    parser.add_argument("--script-output", help="Where to write the generated site-specific Python scraper")
    args = parser.parse_args()

    website = normalize_url(args.website)
    if not website:
        raise SystemExit("A valid website is required.")

    output_path = Path(args.output).expanduser().resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)

    generated_script_path = Path(args.script_output).expanduser().resolve() if args.script_output else _default_generated_script_path(website)
    generated_script_path.parent.mkdir(parents=True, exist_ok=True)

    site_session = session()
    inspection = _inspect_site(site_session, website)
    generated_config: dict[str, object] = {
        "website": website,
        "portfolio_pages": inspection.get("portfolio_pages", []),
        "portfolio_card_selector": inspection.get("portfolio_card_selector"),
        "lp_pages": inspection.get("lp_pages", []),
        "lp_card_selector": inspection.get("lp_card_selector"),
        "generated_script_path": str(generated_script_path),
        "inspection": inspection,
    }

    script_source = _render_generated_script(generated_config)
    generated_script_path.write_text(script_source, encoding="utf-8")
    os.chmod(generated_script_path, 0o755)

    subprocess.run(
        [sys.executable, str(generated_script_path), "--output", str(output_path)],
        check=True,
        cwd=str(Path(__file__).resolve().parent.parent),
    )

    payload = json.loads(output_path.read_text(encoding="utf-8"))
    payload["generated_script"] = {"path": str(generated_script_path)}
    payload["inspection"] = inspection
    output_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
