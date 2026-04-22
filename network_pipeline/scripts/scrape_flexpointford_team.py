#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable

import requests
from bs4 import BeautifulSoup, Tag

TEAM_URL = "https://flexpointford.com/team/"
USER_AGENT = "meshed-network-pipeline/0.1 (+flexpoint ford team scraper)"
REQUEST_TIMEOUT_SECONDS = 20
DEFAULT_OUTPUT_PATH = Path(__file__).resolve().parents[1] / "public" / "flexpoint-ford" / "team_profiles.json"
SUFFIX_TOKENS = {"jr", "sr", "ii", "iii", "iv", "v"}


@dataclass(frozen=True)
class ParsedName:
    name: str
    first_name: str
    mid_initial: str | None
    surname: str


@dataclass(frozen=True)
class TeamProfile:
    name: str
    first_name: str
    mid_initial: str | None
    surname: str
    job_title: str | None
    location: str | None
    summary: str | None
    investments: list[str] | None


def _clean_text(value: object) -> str:
    if value is None:
        return ""
    return re.sub(r"\s+", " ", str(value)).strip()


def _slugify(value: str) -> str:
    cleaned = _clean_text(value).lower()
    cleaned = re.sub(r"[.,']", "", cleaned)
    cleaned = re.sub(r"[^a-z0-9]+", "-", cleaned)
    return cleaned.strip("-")


def _is_middle_initial(token: str) -> bool:
    normalized = re.sub(r"[^A-Za-z]", "", token or "")
    return len(normalized) == 1


def _parse_name(name: str) -> ParsedName:
    tokens = _clean_text(name).replace(",", "").split()
    if not tokens:
        return ParsedName(name=name, first_name="", mid_initial=None, surname="")

    trimmed_tokens = list(tokens)
    if trimmed_tokens and trimmed_tokens[-1].lower().rstrip(".") in SUFFIX_TOKENS:
        trimmed_tokens = trimmed_tokens[:-1]

    if not trimmed_tokens:
        return ParsedName(name=name, first_name=tokens[0], mid_initial=None, surname="")

    first_name = trimmed_tokens[0]
    mid_initial: str | None = None
    surname_tokens: list[str]

    if len(trimmed_tokens) >= 3 and _is_middle_initial(trimmed_tokens[1]):
        mid_initial = re.sub(r"[^A-Za-z]", "", trimmed_tokens[1]) or None
        surname_tokens = trimmed_tokens[2:]
    else:
        surname_tokens = trimmed_tokens[1:]

    surname = " ".join(surname_tokens).strip()
    if not surname and len(trimmed_tokens) > 1:
        surname = trimmed_tokens[-1]

    return ParsedName(
        name=_clean_text(name),
        first_name=first_name,
        mid_initial=mid_initial,
        surname=surname,
    )


def _candidate_profile_urls(parsed_name: ParsedName) -> list[str]:
    first_slug = _slugify(parsed_name.first_name)
    surname_slug = _slugify(parsed_name.surname)
    candidates: list[str] = []

    if parsed_name.mid_initial:
        candidates.append(f"{TEAM_URL.rstrip('/')}/{first_slug}-{_slugify(parsed_name.mid_initial)}-{surname_slug}")
    candidates.append(f"{TEAM_URL.rstrip('/')}/{first_slug}-{surname_slug}")

    deduped: list[str] = []
    seen: set[str] = set()
    for candidate in candidates:
        if candidate and candidate not in seen:
            deduped.append(candidate)
            seen.add(candidate)
    return deduped


def _profile_url_exists(session: requests.Session, url: str) -> bool:
    try:
        response = session.head(url, allow_redirects=True, timeout=REQUEST_TIMEOUT_SECONDS)
        if response.status_code == 405:
            response = session.get(url, allow_redirects=True, timeout=REQUEST_TIMEOUT_SECONDS)
        return response.status_code < 400
    except requests.RequestException:
        return False


def _resolve_profile_source_url(session: requests.Session, parsed_name: ParsedName, slug: str) -> str:
    for candidate_url in _candidate_profile_urls(parsed_name):
        if _profile_url_exists(session, candidate_url):
            return candidate_url
    return f"{TEAM_URL}#{slug}"


def _extract_summary(section: Tag) -> str | None:
    summary_container = section.select_one("div.stack.mt-4")
    if summary_container is None:
        return None

    paragraphs = [_clean_text(paragraph.get_text(" ", strip=True)) for paragraph in summary_container.select("p")]
    paragraphs = [paragraph for paragraph in paragraphs if paragraph]
    if not paragraphs:
        return None
    return "\n\n".join(paragraphs)


def _extract_investments(section: Tag) -> list[str] | None:
    investments = [
        _clean_text(anchor.get_text(" ", strip=True))
        for anchor in section.select(".select-investments a")
        if _clean_text(anchor.get_text(" ", strip=True))
    ]
    return investments or None


def _extract_profiles_from_team_page(session: requests.Session, html: str) -> list[TeamProfile]:
    soup = BeautifulSoup(html, "html.parser")
    cards = soup.select("section.filtered-grid.team a.item")
    detail_sections = {
        _clean_text(section.get("data-slug")): section
        for section in soup.select("section.single[data-slug]")
        if _clean_text(section.get("data-slug"))
    }

    profiles: list[TeamProfile] = []
    for card in cards:
        card_name = _clean_text(card.get("data-name") or (card.select_one(".name").get_text(" ", strip=True) if card.select_one(".name") else ""))
        if not card_name:
            continue

        parsed_name = _parse_name(card_name)
        href = _clean_text(card.get("href"))
        slug = href.lstrip("#") if href.startswith("#") else _slugify(card_name)
        section = detail_sections.get(slug)

        _resolve_profile_source_url(session, parsed_name, slug)

        job_title = None
        location = None
        summary = None
        investments = None

        if section is not None:
            title_node = section.select_one(".title")
            location_node = section.select_one(".location")
            job_title = _clean_text(title_node.get_text(" ", strip=True) if title_node else "") or None
            location = _clean_text(location_node.get_text(" ", strip=True) if location_node else "") or None
            summary = _extract_summary(section)
            investments = _extract_investments(section)

        if job_title is None:
            title_node = card.select_one(".title")
            job_title = _clean_text(title_node.get_text(" ", strip=True) if title_node else "") or None

        if location is None:
            location = _clean_text(card.get("data-location")) or None

        profiles.append(
            TeamProfile(
                name=parsed_name.name,
                first_name=parsed_name.first_name,
                mid_initial=parsed_name.mid_initial,
                surname=parsed_name.surname,
                job_title=job_title,
                location=location,
                summary=summary,
                investments=investments,
            )
        )

    return profiles


def scrape_flexpoint_ford_team() -> list[TeamProfile]:
    session = requests.Session()
    session.headers.update({"User-Agent": USER_AGENT})
    response = session.get(TEAM_URL, timeout=REQUEST_TIMEOUT_SECONDS)
    response.raise_for_status()
    return _extract_profiles_from_team_page(session, response.text)


def write_profiles(output_path: Path, profiles: Iterable[TeamProfile]) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    payload = [asdict(profile) for profile in profiles]
    output_path.write_text(json.dumps(payload, indent=2, ensure_ascii=True), encoding="utf-8")
    return output_path


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Scrape Flexpoint Ford team profiles and investments.")
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT_PATH,
        help=f"Path to write JSON output. Defaults to {DEFAULT_OUTPUT_PATH}.",
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

    profiles = scrape_flexpoint_ford_team()
    payload = [asdict(profile) for profile in profiles]

    if args.stdout:
        print(json.dumps(payload, indent=2, ensure_ascii=True))
        return 0

    output_path = write_profiles(args.output, profiles)
    print(f"Wrote {len(payload)} Flexpoint Ford team profiles to {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
