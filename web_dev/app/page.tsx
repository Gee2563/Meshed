import { DynamicRegistrationPanel } from "@/components/DynamicRegistrationPanel";
import { LogoutButton } from "@/components/LogoutButton";
import { Button } from "@/components/ui/Button";
import { getCurrentUser } from "@/lib/server/current-user";
import { titleCase } from "@/lib/utils";
import { Globe, Rocket, Shield, TrendingUp, Users, Zap } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const currentUser = await getCurrentUser();

  return (
    <main className="relative overflow-hidden bg-gradient-to-b from-[#fffaf4] via-[#f8f4ee] to-[#f2f7ff] px-4 py-8 sm:px-6 sm:py-12 lg:px-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.92),transparent_58%)]" />
      <div className="pointer-events-none absolute left-[-8rem] top-24 -z-10 h-72 w-72 rounded-full bg-[rgba(207,106,47,0.18)] blur-3xl" />
      <div className="pointer-events-none absolute right-[-4rem] top-12 -z-10 h-80 w-80 rounded-full bg-[rgba(35,126,184,0.16)] blur-3xl" />

      <section className="mx-auto w-full max-w-7xl rounded-[2.5rem] border border-white/70 bg-white/55 px-5 py-5 shadow-halo backdrop-blur sm:px-8 sm:py-8">
        <div className="grid gap-8 lg:grid-cols-[1.02fr_0.98fr] lg:gap-10">
          <div className="space-y-6">
            <div className="rounded-[2.2rem] border border-white/80 bg-[linear-gradient(135deg,rgba(255,250,244,0.98),rgba(247,240,229,0.72))] p-6 shadow-[0_18px_60px_rgba(21,38,58,0.08)] sm:p-8">
              <div className="flex justify-center">
                <img src="/meshed-logo.png" alt="Meshed" className="h-auto w-full max-w-[23rem]" />
              </div>
              <h1 className="mt-6 font-display text-3xl leading-tight tracking-tight text-ink sm:text-4xl">
                Meshed turns static VC portfolios into intelligent trust networks that drive better outcomes.
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-slate">
                By combining real-time data systems with verifiable identity and attestation layers, we built a
                platform that transforms fragmented, untrusted professional networks into a cohesive, intelligent, and
                provably trustworthy ecosystem.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[2.25rem] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(246,240,232,0.82))] p-6 shadow-halo sm:p-8">
              {currentUser ? (
                <div className="mt-8 rounded-[1.7rem] border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_60px_rgba(21,38,58,0.08)]">
                  <div className="space-y-5">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate">Session active</p>
                      <h2 className="mt-2 font-display text-3xl tracking-tight text-ink">Welcome back, {currentUser.name}.</h2>
                    </div>
                    <p className="text-sm leading-7 text-slate">
                      Your Meshed account is already active. Continue into the dashboard, update your profile, or finish
                      human verification if it is still pending.
                    </p>
                    <dl className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                        <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate">Role</dt>
                        <dd className="mt-2 text-sm font-medium text-ink">{titleCase(currentUser.role)}</dd>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                        <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate">Dynamic Wallet</dt>
                        <dd className="mt-2 text-sm font-medium text-ink">
                          {currentUser.walletAddress ? "Connected" : "Pending"}
                        </dd>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                        <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate">World ID</dt>
                        <dd className="mt-2 text-sm font-medium text-ink">
                          {currentUser.worldVerified ? "Verified" : "Pending"}
                        </dd>
                      </div>
                    </dl>
                    <div className="flex flex-wrap gap-3">
                      <Button href={currentUser.worldVerified ? "/dashboard" : "/human-idv"}>
                        {currentUser.worldVerified ? "Open dashboard" : "Continue to human IDV"}
                      </Button>
                      <Button href="/profile" variant="secondary">
                        View profile
                      </Button>
                      <LogoutButton />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-8 rounded-[1.7rem] border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_60px_rgba(21,38,58,0.08)]">
                  <div className="space-y-5">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate">Member sign-in</p>
                      <h2 className="mt-2 font-display text-3xl tracking-tight text-ink">Sign in to Meshed.</h2>
                    </div>
                    <DynamicRegistrationPanel />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-8 w-full max-w-7xl rounded-[2.5rem] border border-white/70 bg-white/60 px-5 py-8 shadow-halo backdrop-blur sm:px-8 sm:py-10">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate">Portfolio intelligence</p>
          <h2 className="mt-4 font-display text-3xl tracking-tight text-ink sm:text-4xl">
            Neural Portfolio Graphs for Modern Investors
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-slate">
            Surface high-value introductions, and opportunities that would otherwise stay hidden.
          </p>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <article className="rounded-[1.8rem] border border-white/80 bg-white/90 p-6 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="mt-5 text-xl font-semibold tracking-tight text-ink">AI-Powered Relationship Graphs</h3>
            <p className="mt-3 text-sm leading-7 text-slate">
              Map company, founder, and investor relationships to identify strategic partnerships and collaboration
              opportunities across your portfolio.
            </p>
          </article>

          <article className="rounded-[1.8rem] border border-white/80 bg-white/90 p-6 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
              <TrendingUp className="h-6 w-6" />
            </div>
            <h3 className="mt-5 text-xl font-semibold tracking-tight text-ink">Ranked Recommendations</h3>
            <p className="mt-3 text-sm leading-7 text-slate">
              Turn portfolio data into ranked, explainable founder connection recommendations that help investors move
              from insight to action.
            </p>
          </article>

          <article className="rounded-[1.8rem] border border-white/80 bg-white/90 p-6 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <Rocket className="h-6 w-6" />
            </div>
            <h3 className="mt-5 text-xl font-semibold tracking-tight text-ink">Post-Investment Value Creation</h3>
            <p className="mt-3 text-sm leading-7 text-slate">
              Identify enterprise-level pain points and connect companies facing challenges with others that have
              already solved them.
            </p>
          </article>

          <article className="rounded-[1.8rem] border border-white/80 bg-white/90 p-6 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <Globe className="h-6 w-6" />
            </div>
            <h3 className="mt-5 text-xl font-semibold tracking-tight text-ink">Multi-Entity Support</h3>
            <p className="mt-3 text-sm leading-7 text-slate">
              Built for VCs, family offices, private equity firms, and live investor communities that need better
              network visibility.
            </p>
          </article>

          <article className="rounded-[1.8rem] border border-white/80 bg-white/90 p-6 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
              <Shield className="h-6 w-6" />
            </div>
            <h3 className="mt-5 text-xl font-semibold tracking-tight text-ink">Enhanced Community Participation</h3>
            <p className="mt-3 text-sm leading-7 text-slate">
              Authenticate participation across investment ecosystems with verified identities, trusted profiles, and
              higher-confidence introductions.
            </p>
          </article>

          <article className="rounded-[1.8rem] border border-white/80 bg-white/90 p-6 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
              <Zap className="h-6 w-6" />
            </div>
            <h3 className="mt-5 text-xl font-semibold tracking-tight text-ink">Strategic Partnership Discovery</h3>
            <p className="mt-3 text-sm leading-7 text-slate">
              Uncover shared customers, operating similarities, and strategic synergies that unlock growth
              opportunities across the network.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
