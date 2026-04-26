import { LogoutButton } from "@/components/LogoutButton";
import { WorldRegistrationPanel } from "@/components/WorldRegistrationPanel";
import { Button } from "@/components/ui/Button";
import { getCurrentUser } from "@/lib/server/current-user";
import { titleCase } from "@/lib/utils";

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
                By combining real-time network intelligence with World ID verification, Meshed turns fragmented
                professional graphs into a World-backed trust layer where valuable intros, collaborations, and rewards
                can be tied back to verified humans.
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
                      Your Meshed account is already active. Open your Agent, jump into the dashboard, or review your
                      profile.
                    </p>
                    <dl className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                        <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate">Role</dt>
                        <dd className="mt-2 text-sm font-medium text-ink">{titleCase(currentUser.role)}</dd>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                        <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate">Meshed Sign-In</dt>
                        <dd className="mt-2 text-sm font-medium text-ink">
                          {currentUser.worldVerified ? "World-backed" : "Session active"}
                        </dd>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                        <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate">World ID</dt>
                        <dd className="mt-2 text-sm font-medium text-ink">
                          {currentUser.worldVerified ? "Verified Human" : "Pending"}
                        </dd>
                      </div>
                    </dl>
                    <div className="flex flex-wrap gap-3">
                      <Button href="/agent">Open Agent</Button>
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
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate">World-native onboarding</p>
                      <h2 className="mt-2 font-display text-3xl tracking-tight text-ink">Register with World ID.</h2>
                    </div>
                    <WorldRegistrationPanel />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
