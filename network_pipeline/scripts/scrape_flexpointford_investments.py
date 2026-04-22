#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import mimetypes
import re
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup, Tag

INVESTMENTS_URL = "https://flexpointford.com/investments/"
USER_AGENT = "meshed-network-pipeline/0.1 (+flexpoint ford investments scraper)"
REQUEST_TIMEOUT_SECONDS = 20
PUBLIC_ROOT = Path(__file__).resolve().parents[1] / "public" / "flexpoint-ford"
DEFAULT_OUTPUT_PATH = PUBLIC_ROOT / "investment_profiles.json"
DEFAULT_LOGO_DIR = PUBLIC_ROOT / "company-logos"


@dataclass(frozen=True)
class InvestmentProfile:
    name: str
    slug: str
    summary: str | None
    year_of_investment: int | None
    fund: str | None
    sub_sector: str | None
    status: str | None
    location: str | None
    website: str | None
    flexpoint_logo_url: str | None
    flexpoint_logo_path: str | None


def _clean_text(value: object) -> str:
    if value is None:
        return ""
    return re.sub(r"\s+", " ", str(value)).strip()


def _slugify(value: str) -> str:
    cleaned = _clean_text(value).lower()
    cleaned = re.sub(r"[&]", " and ", cleaned)
    cleaned = re.sub(r"[.,'()]", "", cleaned)
    cleaned = re.sub(r"[^a-z0-9]+", "-", cleaned)
    return cleaned.strip("-")


def _parse_int(value: str) -> int | None:
    cleaned = _clean_text(value)
    if not cleaned:
        return None
    try:
        return int(cleaned)
    except ValueError:
        return None


def _guess_extension(url: str, content_type: str | None) -> str:
    suffix = Path(urlparse(url).path).suffix.lower()
    if suffix:
        return suffix
    if content_type:
        guessed = mimetypes.guess_extension(content_type.split(";")[0].strip())
        if guessed:
            return guessed
    return ".img"


def _download_logo(session: requests.Session, logo_url: str, slug: str, logo_dir: Path) -> str | None:
    if not logo_url:
        return None

    try:
        response = session.get(logo_url, timeout=REQUEST_TIMEOUT_SECONDS)
        response.raise_for_status()
    except requests.RequestException:
        return None

    extension = _guess_extension(logo_url, response.headers.get("content-type"))
    logo_dir.mkdir(parents=True, exist_ok=True)
    file_name = f"{slug}{extension}"
    output_path = logo_dir / file_name
    output_path.write_bytes(response.content)
    return f"/flexpoint-ford/company-logos/{file_name}"


def _extract_summary(section: Tag) -> str | None:
    stack = section.select_one("div.stack")
    if stack is None:
        return None
    paragraphs = [_clean_text(paragraph.get_text(" ", strip=True)) for paragraph in stack.select("p")]
    paragraphs = [paragraph for paragraph in paragraphs if paragraph]
    if not paragraphs:
        return None
    return "\n\n".join(paragraphs)


def _extract_investment_data(section: Tag) -> dict[str, str]:
    data: dict[str, str] = {}
    for paragraph in section.select(".investment-data p"):
        text = paragraph.get_text(" ", strip=True)
        if ":" not in text:
            continue
        label, value = text.split(":", 1)
        data[_clean_text(label).lower()] = _clean_text(value)
    return data


def _extract_profiles_from_investments_page(
    session: requests.Session,
    html: str,
    *,
    logo_dir: Path,
) -> list[InvestmentProfile]:
    soup = BeautifulSoup(html, "html.parser")
    cards = soup.select("section.filtered-grid.investments a.item")
    detail_sections = {
        _clean_text(section.get("data-slug")): section
        for section in soup.select("section.single.hide.investments[data-slug]")
        if _clean_text(section.get("data-slug"))
    }

    profiles: list[InvestmentProfile] = []
    for card in cards:
        card_name = _clean_text(card.get("data-name"))
        if not card_name:
            continue

        href = _clean_text(card.get("href"))
        slug = href.lstrip("#") if href.startswith("#") else _slugify(card_name)
        section = detail_sections.get(slug)
        if section is None:
            naive_slug = _slugify(card_name)
            section = detail_sections.get(naive_slug)
            if section is not None:
                slug = naive_slug

        summary = None
        year_of_investment = None
        fund = None
        sub_sector = None
        status = None
        location = None
        website = None
        logo_url = _clean_text((card.select_one("img.logo") or {}).get("data-src")) or None

        if section is not None:
            summary = _extract_summary(section)
            investment_data = _extract_investment_data(section)
            year_of_investment = _parse_int(investment_data.get("year of investment", ""))
            fund = investment_data.get("fund") or None
            sub_sector = investment_data.get("sub-sector") or None
            status = investment_data.get("status") or None
            location = investment_data.get("headquarters") or None

            logo_node = section.select_one("img.logo")
            section_logo_url = _clean_text(logo_node.get("data-src") if logo_node else "")
            if section_logo_url:
                logo_url = section_logo_url

            website_node = section.select_one("a.cta[href]")
            website = _clean_text(website_node.get("href") if website_node else "") or None

        if summary is None:
            excerpt_container = card.select_one(".excerpt")
            excerpt_text = _clean_text(excerpt_container.get_text(" ", strip=True) if excerpt_container else "")
            if excerpt_text:
                status_suffix = _clean_text(card.get("data-status"))
                if status_suffix:
                    excerpt_text = re.sub(rf"\b{re.escape(status_suffix)}\b$", "", excerpt_text, flags=re.IGNORECASE).strip()
                summary = excerpt_text or None

        if status is None:
            card_status = _clean_text(card.get("data-status"))
            if card_status:
                status = "Active" if card_status.lower() == "current" else "Realized" if card_status.lower() == "past" else card_status

        flexpoint_logo_path = _download_logo(session, logo_url, slug, logo_dir) if logo_url else None

        profiles.append(
            InvestmentProfile(
                name=card_name,
                slug=slug,
                summary=summary,
                year_of_investment=year_of_investment,
                fund=fund,
                sub_sector=sub_sector,
                status=status,
                location=location,
                website=website,
                flexpoint_logo_url=logo_url,
                flexpoint_logo_path=flexpoint_logo_path,
            )
        )

    return profiles


def scrape_flexpoint_ford_investments(*, logo_dir: Path = DEFAULT_LOGO_DIR) -> list[InvestmentProfile]:
    session = requests.Session()
    session.headers.update({"User-Agent": USER_AGENT})
    response = session.get(INVESTMENTS_URL, timeout=REQUEST_TIMEOUT_SECONDS)
    response.raise_for_status()
    return _extract_profiles_from_investments_page(session, response.text, logo_dir=logo_dir)


def write_profiles(output_path: Path, profiles: Iterable[InvestmentProfile]) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    payload = [asdict(profile) for profile in profiles]
    output_path.write_text(json.dumps(payload, indent=2, ensure_ascii=True), encoding="utf-8")
    return output_path


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Scrape Flexpoint Ford investments and download company logos.")
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT_PATH,
        help=f"Path to write JSON output. Defaults to {DEFAULT_OUTPUT_PATH}.",
    )
    parser.add_argument(
        "--logo-dir",
        type=Path,
        default=DEFAULT_LOGO_DIR,
        help=f"Directory where company logos are stored. Defaults to {DEFAULT_LOGO_DIR}.",
    )
    parser.add_argument(
        "--stdout",
        action="store_true",
        help="Print JSON to stdout instead of writing a file.",
    )
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    profiles = scrape_flexpoint_ford_investments(logo_dir=args.logo_dir)
    payload = [asdict(profile) for profile in profiles]

    if args.stdout:
        print(json.dumps(payload, indent=2, ensure_ascii=True))
        return 0

    output_path = write_profiles(args.output, profiles)
    print(f"Wrote {len(payload)} Flexpoint Ford investment profiles to {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
