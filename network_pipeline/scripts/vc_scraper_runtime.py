#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup, Tag

USER_AGENT = "meshed-network-pipeline/0.2 (+custom vc scraper runtime)"
REQUEST_TIMEOUT_SECONDS = 20
MAX_PORTFOLIO_COMPANIES = 24
MAX_NEWS_ARTICLES = 4
MAX_TEAM_MEMBERS = 10

NEWS_PATHS = (
    "/news",
    "/blog",
    "/insights",
    "/newsroom",
    "/updates",
)

TEAM_PATHS = (
    "/team",
    "/about/team",
    "/leadership",
    "/people",
    "/about",
)

COMMON_NAV_LABELS = {
    "home",
    "about",
    "contact",
    "careers",
    "portfolio",
    "investments",
    "team",
    "people",
    "news",
    "blog",
    "insights",
    "login",
    "sign in",
}

EXCLUDED_EXTERNAL_DOMAINS = {
    "linkedin.com",
    "www.linkedin.com",
    "twitter.com",
    "www.twitter.com",
    "x.com",
    "www.x.com",
    "instagram.com",
    "www.instagram.com",
    "facebook.com",
    "www.facebook.com",
    "youtube.com",
    "www.youtube.com",
    "medium.com",
    "www.medium.com",
}


@dataclass(frozen=True)
class NewsArticle:
    title: str
    article_url: str


@dataclass(frozen=True)
class TeamMember:
    name: str
    title: str | None


@dataclass(frozen=True)
class PortfolioCompany:
    name: str
    website: str | None
    source_url: str
    latest_news: list[NewsArticle]
    team_members: list[TeamMember]


@dataclass(frozen=True)
class LpContact:
    name: str
    title: str | None
    source_url: str


def clean_text(value: object) -> str:
    if value is None:
        return ""
    return re.sub(r"\s+", " ", str(value)).strip()


def normalize_url(value: str | None, base_url: str | None = None) -> str | None:
    cleaned = clean_text(value)
    if not cleaned:
        return None
    if cleaned.startswith("//"):
        cleaned = f"https:{cleaned}"
    if base_url is not None:
        cleaned = urljoin(f"{base_url.rstrip('/')}/", cleaned)
    if not re.match(r"^https?://", cleaned, flags=re.IGNORECASE):
        cleaned = f"https://{cleaned.lstrip('/')}"
    return cleaned.rstrip("/")


def same_domain(left: str, right: str) -> bool:
    return urlparse(left).netloc.lower().replace("www.", "") == urlparse(right).netloc.lower().replace("www.", "")


def external_domain_allowed(url: str, vc_website: str) -> bool:
    if same_domain(vc_website, url):
        return False
    domain = urlparse(url).netloc.lower().replace("www.", "")
    return bool(domain) and domain not in EXCLUDED_EXTERNAL_DOMAINS


def fetch_html(session: requests.Session, url: str) -> tuple[str, str] | None:
    try:
        response = session.get(url, timeout=REQUEST_TIMEOUT_SECONDS, allow_redirects=True)
        response.raise_for_status()
    except requests.RequestException:
        return None

    content_type = clean_text(response.headers.get("content-type")).lower()
    if "html" not in content_type and "<html" not in response.text.lower():
        return None

    return response.text, response.url.rstrip("/")


def looks_like_person_name(text: str) -> bool:
    cleaned = clean_text(text)
    if len(cleaned) < 5 or len(cleaned) > 60:
        return False
    if cleaned.lower() in COMMON_NAV_LABELS:
        return False
    if any(token in cleaned.lower() for token in ("portfolio", "investment", "company", "news", "blog")):
        return False
    return bool(re.match(r"^[A-Z][A-Za-z'.-]+(?: [A-Z][A-Za-z'.-]+){1,3}$", cleaned))


def looks_like_company_name(text: str) -> bool:
    cleaned = clean_text(text)
    if len(cleaned) < 2 or len(cleaned) > 80:
        return False
    if cleaned.lower() in COMMON_NAV_LABELS:
        return False
    if cleaned.startswith("#"):
        return False
    return bool(re.search(r"[A-Za-z]", cleaned))


def session() -> requests.Session:
    client = requests.Session()
    client.headers.update({"User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml"})
    return client


def serialize(items: Iterable[object]) -> list[dict[str, object]]:
    return [asdict(item) for item in items]


def extract_candidate_links(soup: BeautifulSoup, page_url: str) -> list[tuple[str, str]]:
    links: list[tuple[str, str]] = []
    for anchor in soup.select("a[href]"):
        href = normalize_url(anchor.get("href"), page_url)
        label = clean_text(anchor.get_text(" ", strip=True))
        if not href or not label:
            continue
        if href.startswith("mailto:") or href.startswith("tel:"):
            continue
        links.append((label, href))
    return links


def _first_heading_text(container: Tag) -> str | None:
    heading = container.select_one("h1, h2, h3, h4, strong, .name, [data-name]")
    text = clean_text(heading.get_text(" ", strip=True) if heading else "")
    return text or None


def _resolve_company_from_detail_page(
    client: requests.Session,
    detail_url: str,
    vc_website: str,
    fallback_name: str | None,
) -> tuple[str, str, str] | None:
    fetched = fetch_html(client, detail_url)
    if not fetched:
        return None

    html, resolved_url = fetched
    soup = BeautifulSoup(html, "html.parser")
    page_name = _first_heading_text(soup) if isinstance(soup, Tag) else None
    company_name = page_name or fallback_name or ""

    ranked_candidates: list[tuple[int, str, str]] = []
    for anchor in soup.select("a[href]"):
        href = normalize_url(anchor.get("href"), resolved_url)
        label = clean_text(anchor.get_text(" ", strip=True))
        if not href or not external_domain_allowed(href, vc_website):
            continue

        lowered = label.lower()
        score = 0
        if any(keyword in lowered for keyword in ("website", "company", "visit", "learn more", "product")):
            score += 4
        if company_name and company_name.lower() in lowered:
            score += 2
        if href.endswith("/"):
            score += 1
        ranked_candidates.append((score, label, href))

    if not ranked_candidates:
        return None

    ranked_candidates.sort(key=lambda item: item[0], reverse=True)
    _, label, href = ranked_candidates[0]
    resolved_name = company_name or label
    if not looks_like_company_name(resolved_name):
        return None
    return resolved_name, href, resolved_url


def _portfolio_from_card(
    client: requests.Session,
    card: Tag,
    page_url: str,
    vc_website: str,
) -> tuple[str, str, str] | None:
    fallback_name = _first_heading_text(card)
    anchors: list[tuple[str, str]] = []

    for anchor in card.select("a[href]"):
        href = normalize_url(anchor.get("href"), page_url)
        label = clean_text(anchor.get_text(" ", strip=True))
        if not href:
            continue
        if href.startswith("mailto:") or href.startswith("tel:"):
            continue
        anchors.append((label or fallback_name or "", href))

    external_candidates = [(label, href) for label, href in anchors if external_domain_allowed(href, vc_website)]
    if external_candidates:
        label, href = external_candidates[0]
        company_name = fallback_name or label
        if company_name and looks_like_company_name(company_name):
            return company_name, href, page_url

    internal_candidates = [
        (label, href)
        for label, href in anchors
        if same_domain(vc_website, href) and href.rstrip("/") != page_url.rstrip("/")
    ]
    for label, href in internal_candidates:
        resolved = _resolve_company_from_detail_page(client, href, vc_website, fallback_name or label)
        if resolved:
            return resolved

    return None


def _fallback_portfolio_candidates(
    client: requests.Session,
    soup: BeautifulSoup,
    page_url: str,
    vc_website: str,
) -> list[tuple[str, str, str]]:
    results: list[tuple[str, str, str]] = []
    seen: set[str] = set()

    for label, href in extract_candidate_links(soup, page_url):
        if len(results) >= MAX_PORTFOLIO_COMPANIES:
            break

        if external_domain_allowed(href, vc_website):
            name = label
            if not looks_like_company_name(name):
                continue
            domain_key = urlparse(href).netloc.lower().replace("www.", "")
            if domain_key in seen:
                continue
            seen.add(domain_key)
            results.append((name, href, page_url))
            continue

        if same_domain(vc_website, href) and href.rstrip("/") != page_url.rstrip("/"):
            resolved = _resolve_company_from_detail_page(client, href, vc_website, label)
            if not resolved:
                continue
            name, company_website, source_url = resolved
            domain_key = urlparse(company_website).netloc.lower().replace("www.", "")
            if domain_key in seen:
                continue
            seen.add(domain_key)
            results.append((name, company_website, source_url))

    return results


def discover_portfolio_companies(client: requests.Session, config: dict[str, object]) -> tuple[list[PortfolioCompany], list[str]]:
    website = normalize_url(str(config.get("website") or ""))
    if not website:
        return [], []

    page_urls = [normalize_url(str(value), website) for value in (config.get("portfolio_pages") or [])]
    portfolio_pages = [value for value in page_urls if value]
    card_selector = clean_text(config.get("portfolio_card_selector")) or None

    visited_pages: list[str] = []
    companies: list[PortfolioCompany] = []
    seen_domains: set[str] = set()

    for page_url in portfolio_pages:
        fetched = fetch_html(client, page_url)
        if not fetched:
            continue
        html, resolved_url = fetched
        if not same_domain(website, resolved_url):
            continue
        visited_pages.append(resolved_url)
        soup = BeautifulSoup(html, "html.parser")

        extracted: list[tuple[str, str, str]] = []
        if card_selector:
            for card in soup.select(card_selector):
                if not isinstance(card, Tag):
                    continue
                company = _portfolio_from_card(client, card, resolved_url, website)
                if company is not None:
                    extracted.append(company)
                if len(extracted) >= MAX_PORTFOLIO_COMPANIES:
                    break

        if not extracted:
            extracted = _fallback_portfolio_candidates(client, soup, resolved_url, website)

        for name, company_website, source_url in extracted:
            domain_key = urlparse(company_website).netloc.lower().replace("www.", "")
            if not domain_key or domain_key in seen_domains:
                continue
            seen_domains.add(domain_key)
            latest_news = scrape_latest_news(client, company_website)
            team_members = scrape_team_members(client, company_website)
            companies.append(
                PortfolioCompany(
                    name=name,
                    website=company_website,
                    source_url=source_url,
                    latest_news=latest_news,
                    team_members=team_members,
                )
            )
            if len(companies) >= MAX_PORTFOLIO_COMPANIES:
                return companies, visited_pages

    return companies, visited_pages


def _extract_contact_from_card(card: Tag, page_url: str) -> LpContact | None:
    heading = card.select_one("h1, h2, h3, h4, strong, .name, [data-name]")
    if heading is None:
        return None

    name = clean_text(heading.get_text(" ", strip=True))
    if not looks_like_person_name(name):
        return None

    title_node = card.select_one(".title, .role, .position, p, span")
    title = clean_text(title_node.get_text(" ", strip=True) if title_node else "") or None
    return LpContact(name=name, title=title, source_url=page_url)


def _fallback_contact_cards(soup: BeautifulSoup, page_url: str) -> list[LpContact]:
    contacts: list[LpContact] = []
    for container in soup.select("article, li, .team-member, .person, .member, .card, .advisor, .partner"):
        if not isinstance(container, Tag):
            continue
        contact = _extract_contact_from_card(container, page_url)
        if contact is not None:
            contacts.append(contact)
    return contacts


def discover_lp_contacts(client: requests.Session, config: dict[str, object]) -> tuple[list[LpContact], list[str]]:
    website = normalize_url(str(config.get("website") or ""))
    if not website:
        return [], []

    page_urls = [normalize_url(str(value), website) for value in (config.get("lp_pages") or [])]
    lp_pages = [value for value in page_urls if value]
    card_selector = clean_text(config.get("lp_card_selector")) or None

    visited_pages: list[str] = []
    contacts: dict[str, LpContact] = {}

    for page_url in lp_pages:
        fetched = fetch_html(client, page_url)
        if not fetched:
            continue
        html, resolved_url = fetched
        if not same_domain(website, resolved_url):
            continue
        visited_pages.append(resolved_url)
        soup = BeautifulSoup(html, "html.parser")

        extracted: list[LpContact] = []
        if card_selector:
            for card in soup.select(card_selector):
                if not isinstance(card, Tag):
                    continue
                contact = _extract_contact_from_card(card, resolved_url)
                if contact is not None:
                    extracted.append(contact)
        if not extracted:
            extracted = _fallback_contact_cards(soup, resolved_url)

        for contact in extracted:
            contacts.setdefault(contact.name.lower(), contact)

    return list(contacts.values()), visited_pages


def scrape_latest_news(client: requests.Session, website: str | None) -> list[NewsArticle]:
    normalized_website = normalize_url(website)
    if not normalized_website:
        return []

    articles: dict[str, NewsArticle] = {}

    for path in NEWS_PATHS:
        target_url = normalize_url(path, normalized_website)
        if not target_url:
            continue
        fetched = fetch_html(client, target_url)
        if not fetched:
            continue

        html, resolved_url = fetched
        if not same_domain(normalized_website, resolved_url):
            continue

        soup = BeautifulSoup(html, "html.parser")
        for anchor in soup.select("article a[href], h1 a[href], h2 a[href], h3 a[href], h4 a[href]"):
            href = normalize_url(anchor.get("href"), resolved_url)
            title = clean_text(anchor.get_text(" ", strip=True))
            if not href or not title or not same_domain(normalized_website, href):
                continue
            if href == resolved_url or len(title) < 8:
                continue

            articles.setdefault(
                href,
                NewsArticle(
                    title=title,
                    article_url=href,
                ),
            )
            if len(articles) >= MAX_NEWS_ARTICLES:
                break

        if len(articles) >= MAX_NEWS_ARTICLES:
            break

    return list(articles.values())[:MAX_NEWS_ARTICLES]


def scrape_team_members(client: requests.Session, website: str | None) -> list[TeamMember]:
    normalized_website = normalize_url(website)
    if not normalized_website:
        return []

    members: dict[str, TeamMember] = {}

    for path in TEAM_PATHS:
        target_url = normalize_url(path, normalized_website)
        if not target_url:
            continue
        fetched = fetch_html(client, target_url)
        if not fetched:
            continue

        html, resolved_url = fetched
        if not same_domain(normalized_website, resolved_url):
            continue

        soup = BeautifulSoup(html, "html.parser")
        for container in soup.select("article, li, .team-member, .member, .person, .leadership-card, .card"):
            if not isinstance(container, Tag):
                continue
            heading = container.select_one("h1, h2, h3, h4, strong, .name")
            if heading is None:
                continue

            name = clean_text(heading.get_text(" ", strip=True))
            if not looks_like_person_name(name):
                continue

            title_node = container.select_one("p, span, .title, .role")
            title = clean_text(title_node.get_text(" ", strip=True) if title_node else "") or None
            members.setdefault(name.lower(), TeamMember(name=name, title=title))
            if len(members) >= MAX_TEAM_MEMBERS:
                break

        if len(members) >= MAX_TEAM_MEMBERS:
            break

    return list(members.values())[:MAX_TEAM_MEMBERS]


def run_vc_scrape(config: dict[str, object], output_path: Path) -> dict[str, object]:
    website = normalize_url(str(config.get("website") or ""))
    if not website:
        raise SystemExit("A valid website is required.")

    output_path = output_path.expanduser().resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)

    client = session()
    portfolio_companies, portfolio_pages = discover_portfolio_companies(client, config)
    lp_contacts, lp_pages = discover_lp_contacts(client, config)

    payload: dict[str, object] = {
        "source_website": website,
        "portfolio_pages": portfolio_pages,
        "lp_pages": lp_pages,
        "portfolio_companies": serialize(portfolio_companies),
        "lp_contacts": serialize(lp_contacts),
        "summary": {
            "portfolio_company_count": len(portfolio_companies),
            "lp_contact_count": len(lp_contacts),
            "company_scan_count": sum(1 for company in portfolio_companies if company.website),
        },
    }

    if config.get("generated_script_path"):
        payload["generated_script"] = {
            "path": str(config["generated_script_path"]),
        }
    if config.get("inspection"):
        payload["inspection"] = config["inspection"]

    output_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return payload
