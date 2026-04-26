"use client";

import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { clientEnv } from "@/lib/config/env";
import type {
  A16zCompanyGraphNewsItem,
  A16zCompanyGraphNode,
  A16zCompanyGraphPartner,
  A16zCompanyGraphPerson,
} from "@/lib/server/meshed-network/a16z-crypto-dashboard";
import { formatRelativeCount, titleCase } from "@/lib/utils";

function extractDomainFromWebsite(website: string | null | undefined) {
  if (!website) {
    return null;
  }

  try {
    return new URL(website).hostname.replace(/^www\./, "");
  } catch {
    return website.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || null;
  }
}

function buildLogoDevUrl(website: string | null | undefined, size: number, localAssetPath?: string | null) {
  if (localAssetPath) {
    return localAssetPath;
  }

  const domain = extractDomainFromWebsite(website);

  if (!domain) {
    return null;
  }

  const url = new URL(`https://img.logo.dev/${domain}`);
  url.searchParams.set("size", String(size));
  url.searchParams.set("format", "png");
  url.searchParams.set("retina", "true");

  if (clientEnv.logoDevToken) {
    url.searchParams.set("token", clientEnv.logoDevToken);
  }

  return url.toString();
}

function formatTagLabel(tag: string) {
  return tag
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function companyOverview(node: A16zCompanyGraphNode) {
  const location = node.location && node.location !== "Unknown" ? node.location : node.locationRegion;
  const compactSignal = (node.peopleConnectionSummary ?? node.peoplePainPointOverview ?? "")
    .split("|")[0]
    .replace(/\s+Importance.*$/i, "")
    .trim();

  const parts = [
    node.vertical ? `${node.vertical}` : "Portfolio company",
    node.stage,
    location && location !== "Unknown" ? location : null,
  ].filter(Boolean);

  return [
    parts.join(" | "),
    compactSignal || `${formatRelativeCount(node.peopleCount, "person")} mapped with ${formatRelativeCount(node.degree, "bridge")}.`,
  ]
    .filter(Boolean)
    .join(". ");
}

export function personAvatarUrl(person: A16zCompanyGraphPerson) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(person.name)}&background=0f172a&color=ffffff&size=96&bold=true`;
}

export function dispatchGraphConnectRequest(person: A16zCompanyGraphPerson) {
  if (typeof window === "undefined") {
    return;
  }

  window.postMessage(
    {
      type: "meshed:graph-connect-request",
      payload: {
        id: person.id,
        name: person.name,
        company: person.company,
        role: person.suggestedRole,
        linkedinUrl: person.linkedinUrl ?? undefined,
        contact: person.contact ?? undefined,
        why: person.connectionSummary ?? person.relationshipSummary[0] ?? `${person.name} was surfaced from the graph.`,
      },
    },
    window.location.origin,
  );

  document.getElementById("meshed-connections-panel")?.scrollIntoView?.({
    behavior: "smooth",
    block: "start",
  });
}

export function dispatchPartnerConnectRequest(partner: A16zCompanyGraphPartner, companyName: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.postMessage(
    {
      type: "meshed:graph-connect-request",
      payload: {
        id: partner.id,
        name: partner.name,
        company: companyName,
        role: partner.jobTitle ?? "LP partner",
        why:
          partner.summary ??
          partner.meshedReviews[0]?.review ??
          `${partner.name} was surfaced from the LP coverage mapped to ${companyName}.`,
      },
    },
    window.location.origin,
  );

  document.getElementById("meshed-connections-panel")?.scrollIntoView?.({
    behavior: "smooth",
    block: "start",
  });
}

export function partnerInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function GraphModalShell({
  ariaLabel,
  dataTestId,
  maxWidthClass,
  onClose,
  children,
}: {
  ariaLabel: string;
  dataTestId?: string;
  maxWidthClass: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[80] overflow-y-auto bg-[rgba(148,163,184,0.34)] backdrop-blur-[1.5px]"
      role="presentation"
      onClick={onClose}
    >
      <div className="flex min-h-full items-center justify-center px-4 py-8">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel}
          data-testid={dataTestId}
          className={`w-full ${maxWidthClass} rounded-[2rem] border border-white/80 bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.25)] sm:p-7`}
          onClick={(event) => event.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function PersonDetailModal({
  person,
  onClose,
  onConnect,
}: {
  person: A16zCompanyGraphPerson;
  onClose: () => void;
  onConnect: (person: A16zCompanyGraphPerson) => void;
}) {
  return (
    <GraphModalShell ariaLabel={`${person.name} details`} dataTestId="company-person-modal" maxWidthClass="max-w-2xl" onClose={onClose}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <img
              src={personAvatarUrl(person)}
              alt={person.name}
              className="h-20 w-20 rounded-[1.4rem] border-2 border-slate-200 object-cover"
            />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate">People details</p>
              <h3 className="mt-2 font-display text-3xl tracking-tight text-ink">{person.name}</h3>
              <p className="mt-2 text-sm text-slate">
                {person.company ?? "Unassigned company"}
                {person.suggestedRole ? ` | ${titleCase(person.suggestedRole)}` : ""}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate transition-colors hover:bg-mist"
            aria-label="Close person details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[1.2rem] border border-slate-200 bg-mist/60 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Importance score</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">{person.networkImportanceScore}</p>
          </div>
          <div className="rounded-[1.2rem] border border-slate-200 bg-mist/60 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Engagement</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">{person.engagementScore}</p>
          </div>
          <div className="rounded-[1.2rem] border border-slate-200 bg-mist/60 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Reliability</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">{person.reliabilityScore}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Current pain point</p>
            <p className="mt-2 text-sm leading-6 text-ink">
              {person.currentPainPointLabel ?? "No current pain point mapped."}
            </p>
          </div>
          <div className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Resolved pain points</p>
            <p className="mt-2 text-sm leading-6 text-ink">
              {person.resolvedPainPointsLabel ?? "No resolved pain points mapped."}
            </p>
          </div>
          <div className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Contact</p>
            <p className="mt-2 text-sm leading-6 text-ink">{person.contact ?? "No contact info available."}</p>
          </div>
          <div className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">LinkedIn</p>
            {person.linkedinUrl ? (
              <a
                href={person.linkedinUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-sky-700 hover:text-sky-800"
              >
                Open profile
                <ExternalLink className="h-4 w-4" />
              </a>
            ) : (
              <p className="mt-2 text-sm leading-6 text-ink">No LinkedIn profile available.</p>
            )}
          </div>
        </div>

        {person.trustSignals.length ? (
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Trust signals</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {person.trustSignals.map((signal) => (
                <span
                  key={signal}
                  className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-sky-700"
                >
                  {titleCase(signal)}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {person.relationshipSummary.length ? (
          <div className="mt-6 rounded-[1.2rem] border border-slate-200 bg-white px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Relationship summary</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-ink">
              {person.relationshipSummary.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {person.connectionSummary ? (
          <div className="mt-6 rounded-[1.2rem] border border-slate-200 bg-white px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Connection summary</p>
            <p className="mt-2 text-sm leading-6 text-ink">{person.connectionSummary}</p>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={() => onConnect(person)}>Connect on Meshed</Button>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
    </GraphModalShell>
  );
}

export function PartnerDetailModal({
  partner,
  companyName,
  onClose,
}: {
  partner: A16zCompanyGraphPartner;
  companyName: string;
  onClose: () => void;
}) {
  const highlightedInvestments = partner.investments.map((investment) => ({
    name: investment,
    isCurrentCompany: investment.trim().toLowerCase() === companyName.trim().toLowerCase(),
  }));
  const partnerImageUrl = partner.picturePath ?? partner.pictureUrl ?? null;

  return (
    <GraphModalShell ariaLabel={`${partner.name} details`} maxWidthClass="max-w-2xl" onClose={onClose}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {partnerImageUrl ? (
              <img
                src={partnerImageUrl}
                alt={partner.name}
                className="h-20 w-20 rounded-[1.4rem] border-2 border-slate-200 object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-[1.4rem] border-2 border-slate-200 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.96),rgba(125,211,252,0.42),rgba(129,140,248,0.34))] text-xl font-semibold tracking-tight text-ink">
                {partnerInitials(partner.name)}
              </div>
            )}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate">Flexford partner</p>
              <h3 className="mt-2 font-display text-3xl tracking-tight text-ink">{partner.name}</h3>
              <p className="mt-2 text-sm text-slate">
                {partner.jobTitle ?? "Partner profile"}
                {partner.location ? ` | ${partner.location}` : ""}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate transition-colors hover:bg-mist"
            aria-label="Close partner details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[1.2rem] border border-slate-200 bg-mist/60 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Relevant company</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">{companyName}</p>
          </div>
          <div className="rounded-[1.2rem] border border-slate-200 bg-mist/60 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Tracked investments</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">{partner.investments.length}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Role</p>
            <p className="mt-2 text-sm leading-6 text-ink">{partner.jobTitle ?? "No title available."}</p>
          </div>
          <div className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Location</p>
            <p className="mt-2 text-sm leading-6 text-ink">{partner.location ?? "No location available."}</p>
          </div>
        </div>

        {partner.summary ? (
          <div className="mt-6 rounded-[1.2rem] border border-slate-200 bg-white px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Summary</p>
            <p className="mt-2 text-sm leading-6 text-ink">{partner.summary}</p>
          </div>
        ) : null}

        {partner.meshedReviews.length ? (
          <details className="mt-6 rounded-[1.2rem] border border-slate-200 bg-white px-4 py-4">
            <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Meshed reviews</p>
                <span className="rounded-full border border-slate-200 bg-mist/60 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate">
                  {partner.meshedReviews.length}
                </span>
              </div>
            </summary>
            <div className="mt-4 space-y-3">
              {partner.meshedReviews.map((review) => (
                <div
                  key={`${review.from}-${review.review.slice(0, 32)}`}
                  className="rounded-[1rem] border border-slate-200 bg-mist/40 px-4 py-4"
                >
                  <div className="flex items-start gap-3">
                    {review.imageUrl ? (
                      <img
                        src={review.imageUrl}
                        alt={review.from}
                        className="h-12 w-12 rounded-2xl border border-slate-200 object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-xs font-semibold text-ink">
                        {partnerInitials(review.from)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink">{review.from}</p>
                      <p className="mt-2 text-sm leading-6 text-slate">{review.review}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </details>
        ) : null}

        <div className="mt-6 rounded-[1.2rem] border border-slate-200 bg-white px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Portfolio coverage</p>
          {highlightedInvestments.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {highlightedInvestments.map((investment) => (
                <span
                  key={investment.name}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    investment.isCurrentCompany
                      ? "border border-sky-200 bg-sky-50 text-sky-700"
                      : "border border-slate-200 bg-mist/70 text-slate"
                  }`}
                >
                  {investment.name}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm leading-6 text-ink">No portfolio coverage list is attached to this partner.</p>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={() => dispatchPartnerConnectRequest(partner, companyName)}>Connect on Meshed</Button>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
    </GraphModalShell>
  );
}

export function LatestNewsModal({
  companyName,
  items,
  onClose,
}: {
  companyName: string;
  items: A16zCompanyGraphNewsItem[];
  onClose: () => void;
}) {
  return (
    <GraphModalShell ariaLabel={`${companyName} latest news`} maxWidthClass="max-w-2xl" onClose={onClose}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate">Latest news</p>
            <h3 className="mt-2 font-display text-3xl tracking-tight text-ink">{companyName}</h3>
            <p className="mt-2 text-sm text-slate">
              {formatRelativeCount(items.length, "article")} surfaced from the company&apos;s `/news` page.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate transition-colors hover:bg-mist"
            aria-label="Close latest news"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 space-y-3">
          {items.map((item) => (
            <a
              key={`${item.articleUrl}-${item.title}`}
              href={item.articleUrl}
              target="_blank"
              rel="noreferrer"
              className="block rounded-[1.2rem] border border-slate-200 bg-white px-4 py-4 transition-colors hover:bg-mist/60"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-6 text-ink">{item.title}</p>
                  {item.datePublished ? (
                    <p className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-slate">{item.datePublished}</p>
                  ) : null}
                </div>
                <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" />
              </div>
            </a>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
    </GraphModalShell>
  );
}

export function CompanyDetailModal({
  company,
  onClose,
}: {
  company: A16zCompanyGraphNode;
  onClose: () => void;
}) {
  const logoUrl = buildLogoDevUrl(company.website, 160, company.flexpointLogoPath);
  const latestNewsPreview = company.latestNews.slice(0, 3);

  return (
    <GraphModalShell ariaLabel={`${company.companyName} details`} maxWidthClass="max-w-4xl" onClose={onClose}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={`${company.companyName} logo`}
                className="h-20 w-20 rounded-[1.4rem] border-2 border-slate-200 bg-white object-contain p-2"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-[1.4rem] border-2 border-slate-200 bg-mist/70 px-3 text-center text-sm font-semibold text-ink">
                {company.companyName}
              </div>
            )}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate">Company details</p>
              <h3 className="mt-2 font-display text-3xl tracking-tight text-ink">{company.companyName}</h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate">{companyOverview(company)}</p>
              {company.website ? (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-sky-700 hover:text-sky-800"
                >
                  Visit website
                  <ExternalLink className="h-4 w-4" />
                </a>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate transition-colors hover:bg-mist"
            aria-label="Close company details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[1.2rem] border border-slate-200 bg-mist/60 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Vertical</p>
            <p className="mt-2 text-sm font-semibold text-ink">{company.vertical ?? "Not labeled"}</p>
          </div>
          <div className="rounded-[1.2rem] border border-slate-200 bg-mist/60 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Stage</p>
            <p className="mt-2 text-sm font-semibold text-ink">{company.stage ?? "Not labeled"}</p>
          </div>
          <div className="rounded-[1.2rem] border border-slate-200 bg-mist/60 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Mapped people</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">{company.peopleCount}</p>
          </div>
          <div className="rounded-[1.2rem] border border-slate-200 bg-mist/60 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Company bridges</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">{company.degree}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Current pain points</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {company.currentPainPointTags.length ? (
                company.currentPainPointTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-800"
                  >
                    {formatTagLabel(tag)}
                  </span>
                ))
              ) : (
                <p className="text-sm text-slate">No current pain points mapped.</p>
              )}
            </div>
          </div>

          <div className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Resolved pain points</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {company.resolvedPainPointTags.length ? (
                company.resolvedPainPointTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-800"
                  >
                    {formatTagLabel(tag)}
                  </span>
                ))
              ) : (
                <p className="text-sm text-slate">No resolved pain points mapped.</p>
              )}
            </div>
          </div>

          {company.partners.length ? (
            <div className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Flexford partners</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {company.partners.map((partner) => (
                  <span
                    key={partner.id}
                    className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-700"
                  >
                    {partner.name}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {company.people.length ? (
            <div className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">People in this node</p>
              <div className="mt-3 space-y-2">
                {company.people.slice(0, 4).map((person) => (
                  <div key={person.id} className="rounded-xl border border-slate-200 bg-mist/40 px-3 py-2">
                    <p className="text-sm font-semibold text-ink">{person.name}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.12em] text-slate">
                      {person.suggestedRole ? titleCase(person.suggestedRole) : "Operator"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {latestNewsPreview.length ? (
          <div className="mt-6 rounded-[1.2rem] border border-slate-200 bg-white px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Latest news</p>
            <div className="mt-3 space-y-2">
              {latestNewsPreview.map((item) => (
                <a
                  key={`${item.articleUrl}-${item.title}`}
                  href={item.articleUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-xl border border-slate-200 bg-mist/40 px-3 py-3 transition-colors hover:bg-mist/60"
                >
                  <p className="text-sm font-semibold leading-6 text-ink">{item.title}</p>
                  {item.datePublished ? (
                    <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-slate">{item.datePublished}</p>
                  ) : null}
                </a>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
    </GraphModalShell>
  );
}
