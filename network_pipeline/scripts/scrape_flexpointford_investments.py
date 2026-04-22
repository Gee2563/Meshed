#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import mimetypes
import re
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup, Tag

INVESTMENTS_URL = "https://flexpointford.com/investments/"
USER_AGENT = "meshed-network-pipeline/0.1 (+flexpoint ford investments scraper)"
REQUEST_TIMEOUT_SECONDS = 20
PUBLIC_ROOT = Path(__file__).resolve().parents[1] / "public" / "flexpoint-ford"
DEFAULT_OUTPUT_PATH = PUBLIC_ROOT / "investment_profiles.json"
DEFAULT_LOGO_DIR = PUBLIC_ROOT / "company-logos"
NEWS_ARTICLE_LIMIT = 6
NEWS_PATH_CANDIDATES = (
    "/news",
    "/blog",
    "/insights",
    "/resource-hub/latest-news/",
    "/incredibly/blog/",
    "/newsroom/",
    "/about/newsroom/",
)


@dataclass(frozen=True)
class NewsArticle:
    title: str
    date_published: str | None
    article_url: str


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
    latest_news: list[NewsArticle]


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


def _normalize_url(value: str | None) -> str | None:
    cleaned = _clean_text(value)
    if not cleaned:
        return None
    if cleaned.startswith("//"):
        cleaned = f"https:{cleaned}"
    if not re.match(r"^https?://", cleaned, flags=re.IGNORECASE):
        cleaned = f"https://{cleaned.lstrip('/')}"
    return cleaned.rstrip("/")


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


def _response_matches_requested_news_path(requested_url: str, resolved_url: str) -> bool:
    requested = urlparse(requested_url)
    resolved = urlparse(resolved_url)
    if requested.netloc.lower() != resolved.netloc.lower():
        return False

    requested_path = requested.path.rstrip("/").lower() or "/"
    resolved_path = resolved.path.rstrip("/").lower() or "/"

    if resolved_path == requested_path:
        return True

    return resolved_path.startswith(f"{requested_path}/page/")


def _is_likely_news_article_url(article_url: str, page_url: str) -> bool:
    article = urlparse(article_url)
    page = urlparse(page_url)
    if article.netloc.lower() != page.netloc.lower():
        return False

    article_path = article.path.rstrip("/").lower()
    page_path = page.path.rstrip("/").lower()
    if not article_path or article_path == page_path:
        return False

    ignored_prefixes = (
        "/category",
        "/tag",
        "/author",
        "/resource-type",
        "/resources",
        "/events",
        "/events-webinars",
    )
    if any(article_path == prefix or article_path.startswith(f"{prefix}/") for prefix in ignored_prefixes):
        return False

    if page_path and article_path.startswith(f"{page_path}/"):
        return True

    return any(f"/{segment}/" in article_path for segment in ("news", "blog", "insights", "newsroom"))


def _extract_news_date(container: Tag) -> str | None:
    time_node = container.select_one("time")
    if time_node is not None:
        datetime_value = _clean_text(time_node.get("datetime"))
        if datetime_value:
            return datetime_value.split("T")[0]
        time_text = _clean_text(time_node.get_text(" ", strip=True))
        if time_text:
            return time_text

    for selector in [".date", ".post-date", ".entry-date", ".published", "[datetime]"]:
        node = container.select_one(selector)
        if node is None:
            continue
        text = _clean_text(node.get_text(" ", strip=True))
        if text:
            return text
        datetime_value = _clean_text(node.get("datetime"))
        if datetime_value:
            return datetime_value.split("T")[0]

    return None


def _extract_news_link(container: Tag, news_url: str) -> tuple[str | None, str | None]:
    selectors = ["h1 a[href]", "h2 a[href]", "h3 a[href]", "h4 a[href]", "a[href]"]
    for selector in selectors:
        for link in container.select(selector):
            href = _clean_text(link.get("href"))
            title = _clean_text(link.get_text(" ", strip=True))
            if not href or href.startswith("#") or href.lower().startswith("javascript:"):
                continue
            if len(title) < 8:
                continue
            article_url = urljoin(f"{news_url}/", href)
            return title, article_url
    return None, None


def _scrape_latest_news(
    session: requests.Session,
    website_url: str | None,
    *,
    limit: int = NEWS_ARTICLE_LIMIT,
) -> list[NewsArticle]:
    normalized_website = _normalize_url(website_url)
    if not normalized_website:
        return []

    candidate_urls = [f"{normalized_website}{path}".rstrip("/") for path in NEWS_PATH_CANDIDATES]

    raw_nextjs_article_pattern = re.compile(
        r'\\"title\\":\\"(?P<title>.*?)\\",\\"slug\\":\\"(?P<slug>.*?)\\",\\"publishedAt\\":\\"(?P<date>.*?)\\"',
        flags=re.DOTALL,
    )

    def extract_json_array(source: str, marker: str) -> str | None:
        marker_index = source.find(marker)
        if marker_index < 0:
            return None

        start_index = source.find("[", marker_index)
        if start_index < 0:
            return None

        depth = 0
        in_string = False
        is_escaped = False

        for index in range(start_index, len(source)):
            char = source[index]

            if in_string:
                if is_escaped:
                    is_escaped = False
                elif char == "\\":
                    is_escaped = True
                elif char == '"':
                    in_string = False
                continue

            if char == '"':
                in_string = True
                continue

            if char == "[":
                depth += 1
            elif char == "]":
                depth -= 1
                if depth == 0:
                    return source[start_index : index + 1]

        return None

    def decode_json_fragment(value: str) -> str:
        try:
            return json.loads(f'"{value}"')
        except Exception:
            return _clean_text(value)

    for news_url in candidate_urls:
        try:
            response = session.get(news_url, timeout=REQUEST_TIMEOUT_SECONDS)
            response.raise_for_status()
        except requests.RequestException:
            continue

        if not _response_matches_requested_news_path(news_url, response.url):
            continue

        soup = BeautifulSoup(response.text, "html.parser")
        candidate_selectors = [
            "main article",
            "article",
            "main .news-item",
            "main .post",
            "main .entry",
            "main .blog-item",
            "main .card",
            "main .resource-card",
            "main .resource-item",
            "main .listing-item",
            ".elementor-post",
            ".jet-listing-grid__item",
            ".jeg_post",
            ".newsroom-item",
            "main li",
        ]

        containers: list[Tag] = []
        for selector in candidate_selectors:
            matched = [node for node in soup.select(selector) if isinstance(node, Tag)]
            if matched:
                containers = matched
                break

        articles: list[NewsArticle] = []
        seen_urls: set[str] = set()
        seen_titles: set[str] = set()

        def append_article(title: str | None, date_published: str | None, article_url: str | None) -> bool:
            cleaned_title = _clean_text(title)
            cleaned_url = _clean_text(article_url)
            if not cleaned_title or not cleaned_url:
                return False
            normalized_url = cleaned_url.rstrip("/")
            if normalized_url == news_url or not _is_likely_news_article_url(normalized_url, news_url):
                return False
            normalized_title = cleaned_title.lower()
            if normalized_url in seen_urls or normalized_title in seen_titles:
                return False
            articles.append(
                NewsArticle(
                    title=cleaned_title,
                    date_published=_clean_text(date_published) or None,
                    article_url=cleaned_url,
                )
            )
            seen_urls.add(normalized_url)
            seen_titles.add(normalized_title)
            return len(articles) >= limit

        for container in containers:
            title, article_url = _extract_news_link(container, news_url)
            if append_article(title, _extract_news_date(container), article_url):
                return articles

        if articles:
            return articles

        for script in soup.select("script"):
            script_text = script.get_text(" ", strip=False)
            if "__next_f.push" not in script_text:
                continue

            news_array = extract_json_array(script_text, '\\"news\\":[')
            if not news_array:
                continue

            for match in raw_nextjs_article_pattern.finditer(news_array):
                title = _clean_text(decode_json_fragment(match.group("title")))
                slug = _clean_text(decode_json_fragment(match.group("slug")))
                published_at = _clean_text(decode_json_fragment(match.group("date")))
                article_url = urljoin(f"{news_url}/", slug.lstrip("/")) if slug else None

                if append_article(title, published_at.split("T")[0] if published_at else None, article_url):
                    return articles

        if articles:
            return articles

        for link in soup.select("a[href]"):
            href = _clean_text(link.get("href"))
            title = _clean_text(link.get_text(" ", strip=True))
            if not href or len(title) < 8:
                continue
            if append_article(title, _extract_news_date(link.parent if isinstance(link.parent, Tag) else link), urljoin(f"{news_url}/", href)):
                break

        if articles:
            return articles

    return []


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
        latest_news: list[NewsArticle] = []
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

            website_candidates = section.select("a[href]")
            website_node = next(
                (
                    candidate
                    for candidate in website_candidates
                    if "visit website" in _clean_text(candidate.get_text(" ", strip=True)).lower()
                ),
                None,
            )
            if website_node is None:
                website_node = section.select_one("a.cta[href]")
            website = _normalize_url(_clean_text(website_node.get("href") if website_node else "")) or None
            latest_news = _scrape_latest_news(session, website)

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
                latest_news=latest_news,
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
