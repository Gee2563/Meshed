import { LogoutButton } from "@/components/LogoutButton";
import { Button } from "@/components/ui/Button";
import { loadA16zCryptoDashboardData } from "@/lib/server/meshed-network/a16z-crypto-dashboard";
import { getCurrentUser } from "@/lib/server/current-user";
import { formatRelativeCount, titleCase } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [currentUser, dashboard] = await Promise.all([getCurrentUser(), loadA16zCryptoDashboardData()]);

  if (!currentUser) {
    return (
      <main className="px-4 py-10 sm:px-6 lg:px-10">
        <section className="mx-auto max-w-3xl rounded-[2rem] border border-white/75 bg-white/75 p-6 shadow-halo backdrop-blur sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate">Dashboard access</p>
          <h1 className="mt-4 font-display text-4xl tracking-tight text-ink">Session required</h1>
          <p className="mt-4 text-sm leading-7 text-slate">
            The dashboard is part of the Meshed trust flow. Start from Dynamic registration first, then return once the
            session is active.
          </p>
          <div className="mt-6">
            <Button href="/" variant="secondary">
              Return home
            </Button>
          </div>
        </section>
      </main>
    );
  }

  if (!dashboard) {
    return (
      <main className="px-4 py-10 sm:px-6 lg:px-10">
        <section className="mx-auto max-w-3xl rounded-[2rem] border border-white/75 bg-white/75 p-6 shadow-halo backdrop-blur sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate">Dashboard data</p>
          <h1 className="mt-4 font-display text-4xl tracking-tight text-ink">A16z crypto bundle unavailable</h1>
          <p className="mt-4 text-sm leading-7 text-slate">
            The dashboard page is ready, but the generated `network_pipeline/public/a16z-crypto` bundle is missing or
            unreadable. Re-run the pipeline slice, then refresh this page.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button href="/" variant="secondary">
              Return home
            </Button>
            <LogoutButton />
          </div>
        </section>
      </main>
    );
  }

  const { snapshot, strongestBridges, topVerticals } = dashboard;
  const statusItems = [
    { label: "Role", value: titleCase(currentUser.role) },
    { label: "Wallet", value: currentUser.walletAddress ? "Connected" : "Pending" },
    { label: "Human IDV", value: currentUser.worldVerified ? "Verified" : "Pending" },
    { label: "Trust badges", value: formatRelativeCount(currentUser.verificationBadges.length, "badge") },
  ];

  return (
    <main className="px-4 py-8 sm:px-6 lg:px-10">
      <section className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-[2.4rem] border border-white/75 bg-white/65 p-5 shadow-halo backdrop-blur sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-sky-200 bg-sky-50 px-4 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
                  A16z crypto
                </span>
                <span className="rounded-full border border-white/80 bg-white/80 px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate">
                  Dashboard slice
                </span>
              </div>

              <div>
                <p className="text-sm font-medium text-slate">Signed in as {currentUser.name}</p>
                <h1 className="mt-3 font-display text-5xl tracking-tight text-ink sm:text-6xl">
                  A16z crypto network dashboard
                </h1>
                <p className="mt-4 max-w-3xl text-lg leading-8 text-slate">
                  The first live dashboard slice now reads directly from the generated `network_pipeline` bundle. This
                  page focuses on the overview that matters for the demo: network size, strongest company bridges, and
                  the people surfacing out of the synthetic talent graph.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[1.5rem] border border-white/80 bg-white/90 px-5 py-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate">Companies</p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight text-ink">{snapshot.company_count}</p>
                  <p className="mt-2 text-sm text-slate">{snapshot.vertical_count} tracked verticals</p>
                </div>
                <div className="rounded-[1.5rem] border border-white/80 bg-white/90 px-5 py-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate">Company bridges</p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight text-ink">{snapshot.company_edge_count}</p>
                  <p className="mt-2 text-sm text-slate">Similarity-driven redeployment signals</p>
                </div>
                <div className="rounded-[1.5rem] border border-white/80 bg-white/90 px-5 py-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate">People</p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight text-ink">{snapshot.people_count}</p>
                  <p className="mt-2 text-sm text-slate">{snapshot.people_company_count} companies represented</p>
                </div>
                <div className="rounded-[1.5rem] border border-white/80 bg-white/90 px-5 py-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate">People bridges</p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight text-ink">{snapshot.people_edge_count}</p>
                  <p className="mt-2 text-sm text-slate">Synthetic peer-support routes</p>
                </div>
              </div>
            </div>

            <aside className="rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(238,242,247,0.84),rgba(255,255,255,0.92))] p-6 shadow-[0_18px_60px_rgba(21,38,58,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate">Session context</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {statusItems.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/80 bg-white/90 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate">{item.label}</p>
                    <p className="mt-2 text-sm font-medium text-ink">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-2xl border border-white/80 bg-white/90 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate">Generated via</p>
                <p className="mt-2 text-sm text-ink">{snapshot.generated_via ?? "network pipeline"}</p>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button href="/" variant="secondary">
                  Return home
                </Button>
                <LogoutButton />
              </div>
            </aside>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_60px_rgba(21,38,58,0.08)]">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate">Top companies</p>
                <h2 className="mt-2 font-display text-3xl tracking-tight text-ink">Most connected companies</h2>
              </div>
              <p className="max-w-lg text-sm leading-6 text-slate">
                These are the most central companies in the current `a16z-crypto` graph, ranked by company bridge
                degree with people density as the tie-breaker.
              </p>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {snapshot.top_companies.map((company) => (
                <article key={company.id} className="rounded-[1.5rem] border border-slate-200 bg-mist/70 px-5 py-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-ink">{company.company_name}</h3>
                      <p className="mt-1 text-sm text-slate">
                        {company.vertical ?? "Unassigned vertical"}
                        {company.location_region ? ` | ${company.location_region}` : ""}
                      </p>
                    </div>
                    <span className="rounded-full border border-white/90 bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate">
                      Degree {company.degree}
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate">
                    {formatRelativeCount(company.people_count, "person")} currently synthesized around this company in
                    the talent graph.
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_60px_rgba(21,38,58,0.08)]">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate">Network bridges</p>
                <h2 className="mt-2 font-display text-3xl tracking-tight text-ink">Strongest company bridges</h2>
              </div>
              <p className="max-w-lg text-sm leading-6 text-slate">
                These bridge explanations come straight from the generated company-network payload and give us the first
                readable handoff into redeployment opportunities.
              </p>
            </div>
            <div className="mt-6 space-y-3">
              {strongestBridges.map((bridge) => (
                <article key={bridge.id} className="rounded-[1.5rem] border border-slate-200 bg-white px-5 py-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold text-ink">
                      {bridge.sourceName} to {bridge.targetName}
                    </h3>
                    <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">
                      Score {bridge.score.toFixed(2)}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-medium text-ink">{bridge.reason}</p>
                  <p className="mt-2 text-sm leading-6 text-slate">{bridge.explanation}</p>
                </article>
              ))}
            </div>
          </section>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <section className="rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(238,242,247,0.84),rgba(255,255,255,0.92))] p-6 shadow-[0_18px_60px_rgba(21,38,58,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate">Vertical mix</p>
            <h2 className="mt-2 font-display text-3xl tracking-tight text-ink">Top tracked verticals</h2>
            <div className="mt-6 space-y-3">
              {topVerticals.map((vertical) => (
                <div key={vertical.vertical} className="rounded-[1.4rem] border border-white/80 bg-white/92 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: vertical.color }} />
                      <span className="text-sm font-medium text-ink">{vertical.vertical}</span>
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">
                      {formatRelativeCount(vertical.count, "company")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(21,38,58,0.97),rgba(29,70,109,0.94))] p-6 text-white shadow-halo">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-100">People layer</p>
                <h2 className="mt-2 font-display text-3xl tracking-tight">Featured people signals</h2>
              </div>
              <p className="max-w-lg text-sm leading-6 text-sky-50/85">
                This is the first dashboard use of the synthetic people graph. It gives us a demo-ready view of who
                might be surfaced for redeployment once a company starts to struggle.
              </p>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {snapshot.featured_people.map((person) => (
                <article key={person.id} className="rounded-[1.5rem] border border-white/15 bg-white/10 px-5 py-5 backdrop-blur">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{person.name}</h3>
                      <p className="mt-1 text-sm text-sky-50/80">{person.company ?? "Unassigned company"}</p>
                    </div>
                    <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-sky-50">
                      {titleCase(person.suggested_role ?? "operator")}
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-sky-50/90">
                    Current signal: {person.current_pain_point_label ?? "General network support"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-sky-50/75">
                    Importance score {person.network_importance_score} with{" "}
                    {person.trust_signals.length ? person.trust_signals.map(titleCase).join(", ") : "no trust badges yet"}.
                  </p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
