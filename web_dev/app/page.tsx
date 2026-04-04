import { DynamicRegistrationPanel } from "@/components/DynamicRegistrationPanel";
import { LogoutButton } from "@/components/LogoutButton";
import { MeshedLogo } from "@/components/MeshedLogo";
import { env } from "@/lib/config/env";
import { getCurrentUser } from "@/lib/server/current-user";
import { titleCase } from "@/lib/utils";

// Public landing page for the current MVP and the first stop in the verified onboarding flow.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const currentUser = await getCurrentUser();
  const dynamicLive = Boolean(env.NEXT_PUBLIC_DYNAMIC_ENV_ID) && !env.USE_MOCK_DYNAMIC;
  const registrationMilestones = [
    {
      label: "1. Dynamic auth",
      detail: "Authenticate with your allowlisted work email and let Dynamic provision the embedded wallet.",
    },
    {
      label: "2. Meshed sync",
      detail: "Meshed creates the matching user record, session, and invite-aware onboarding profile.",
    },
    {
      label: "3. Human verification",
      detail: "After registration, continue into the next trust step for your portfolio network access.",
    },
  ];
  const valueSignals = [
    {
      label: "Known network only",
      detail: "Invite-aware access keeps the first Meshed release scoped to real portfolio members and investors.",
    },
    {
      label: "Zero-wallet friction",
      detail: "Dynamic handles the embedded wallet step so Meshed can focus on trust, onboarding, and graph context.",
    },
    {
      label: "Reroute, not restart",
      detail: "Every authenticated member flows straight into the next trust checkpoint instead of another signup form.",
    },
  ];
  const liveSignals = [
    dynamicLive ? "Live Dynamic environment configured" : "Dynamic configuration still needs a live environment",
    currentUser?.walletAddress ? "Wallet already linked to this session" : "Embedded wallet routing ready for new signups",
    currentUser?.worldVerified ? "Human IDV already completed" : "Human IDV handoff waiting after registration",
  ];
  const sessionSummary = [
    {
      label: "Role",
      value: currentUser ? titleCase(currentUser.role) : "Pending session",
    },
    {
      label: "Wallet",
      value: currentUser?.walletAddress ? "Connected" : "Pending",
    },
    {
      label: "Human IDV",
      value: currentUser?.worldVerified ? "Verified" : "Pending",
    },
  ];

  return (
    <main className="relative overflow-hidden px-4 py-8 sm:px-6 sm:py-12 lg:px-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.92),transparent_58%)]" />
      <div className="pointer-events-none absolute left-[-8rem] top-24 -z-10 h-72 w-72 rounded-full bg-[rgba(207,106,47,0.18)] blur-3xl" />
      <div className="pointer-events-none absolute right-[-4rem] top-12 -z-10 h-80 w-80 rounded-full bg-[rgba(35,126,184,0.16)] blur-3xl" />

      <section className="mx-auto w-full max-w-7xl rounded-[2.5rem] border border-white/70 bg-white/55 px-5 py-5 shadow-halo backdrop-blur sm:px-8 sm:py-8">
        <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:gap-10">
          <div className="space-y-6">
            <div className="rounded-[2.2rem] border border-white/80 bg-[linear-gradient(135deg,rgba(255,250,244,0.98),rgba(247,240,229,0.72))] p-6 shadow-[0_18px_60px_rgba(21,38,58,0.08)] sm:p-8">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-sky-200 bg-sky-50 px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
                  Dynamic registration
                </span>
                <span className="rounded-full border border-white/80 bg-white/80 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate">
                  {dynamicLive ? "Live embedded auth" : "Config pending"}
                </span>
              </div>

              <div className="mt-6 flex justify-center lg:justify-start">
                <MeshedLogo />
              </div>

              <div className="mt-8 space-y-5 text-center lg:text-left">
                <h1 className="font-display text-5xl leading-tight tracking-tight text-ink sm:text-6xl">
                  Verified access for the people your portfolio already knows.
                </h1>
                <p className="max-w-3xl text-lg leading-8 text-slate">
                  Meshed now starts with live Dynamic embedded signup. The landing page is the trust gateway for investors
                  and operators, routing each invited person from authentication into the next onboarding checkpoint with
                  far less friction.
                </p>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {liveSignals.map((signal) => (
                  <div
                    key={signal}
                    className="rounded-2xl border border-white/80 bg-white/85 px-4 py-4 text-left shadow-[0_12px_30px_rgba(21,38,58,0.06)]"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate">Status</p>
                    <p className="mt-3 text-sm font-medium leading-6 text-ink">{signal}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
              <section className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_60px_rgba(21,38,58,0.08)]">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">Invitation-only onboarding</p>
                <h2 className="mt-4 font-display text-3xl tracking-tight text-ink">
                  Real access control without another manual intake form.
                </h2>
                <p className="mt-4 text-sm leading-7 text-slate">
                  Use your allowlisted email to begin the Dynamic registration flow. Once Dynamic exposes the primary
                  wallet, Meshed writes the session, binds the invite, and advances to the right route for that person.
                </p>
              </section>

              <section className="rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(238,242,247,0.84),rgba(255,255,255,0.92))] p-6 shadow-[0_18px_60px_rgba(21,38,58,0.08)]">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate">What This Slice Solves</p>
                <div className="mt-4 space-y-4">
                  {valueSignals.map((signal) => (
                    <div key={signal.label} className="rounded-2xl border border-white/80 bg-white/90 px-4 py-4">
                      <p className="text-sm font-semibold text-ink">{signal.label}</p>
                      <p className="mt-2 text-sm leading-6 text-slate">{signal.detail}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <section className="rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(21,38,58,0.97),rgba(29,70,109,0.94))] p-6 text-white shadow-halo">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-100">Meshed flow map</p>
                  <h2 className="mt-3 font-display text-3xl tracking-tight">The first trust loop is now simple and visible.</h2>
                </div>
                <p className="max-w-xl text-sm leading-6 text-sky-50/90">
                  The onboarding surface stays intentionally narrow for now: authenticate, sync the Meshed record, then
                  hand off to either human verification or company onboarding.
                </p>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {registrationMilestones.map((milestone) => (
                  <div
                    key={milestone.label}
                    className="rounded-[1.6rem] border border-white/15 bg-white/10 px-4 py-5 backdrop-blur"
                  >
                    <p className="text-sm font-semibold text-white">{milestone.label}</p>
                    <p className="mt-2 text-sm leading-6 text-sky-50/85">{milestone.detail}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <div className="relative rounded-[2.25rem] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(246,240,232,0.8))] p-4 shadow-halo sm:p-5">
              <div className="absolute inset-x-10 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(207,106,47,0.7),transparent)]" />
              <div className="rounded-[1.85rem] border border-slate-200/80 bg-white/90 p-5 sm:p-6">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate">Live signup panel</p>
                    <h2 className="mt-2 font-display text-3xl tracking-tight text-ink">
                      {currentUser ? "Your session is already active." : "Start with Dynamic."}
                    </h2>
                  </div>
                  <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                    {dynamicLive ? "Dynamic live" : "Needs env"}
                  </div>
                </div>

                {currentUser ? (
                  <div className="space-y-5">
                    <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50/85 px-5 py-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Meshed session active</p>
                      <h3 className="mt-3 text-2xl font-semibold tracking-tight text-ink">Welcome back, {currentUser.name}.</h3>
                      <p className="mt-3 text-sm leading-6 text-slate">
                        Dynamic is already linked to this Meshed account, so this page can act as a stable control room
                        while we build the next onboarding checkpoints one slice at a time.
                      </p>
                    </div>

                    <dl className="grid gap-3 sm:grid-cols-3">
                      {sessionSummary.map((item) => (
                        <div key={item.label} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                          <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate">{item.label}</dt>
                          <dd className="mt-2 text-sm font-medium text-ink">{item.value}</dd>
                        </div>
                      ))}
                    </dl>

                    <div className="rounded-[1.5rem] border border-slate-200 bg-mist/80 px-5 py-5">
                      <p className="text-sm leading-7 text-slate">
                        Keep the session open to continue into the next route, or log out and test the live registration
                        experience again from the same landing page.
                      </p>
                      <div className="mt-4">
                        <LogoutButton />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <DynamicRegistrationPanel />
                    <div className="rounded-[1.5rem] border border-slate-200 bg-mist/75 px-5 py-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate">Current routing</p>
                      <p className="mt-3 text-sm leading-6 text-slate">
                        Portfolio invites currently land on <span className="font-semibold text-ink">/human-idv</span>.
                        VC invites land on <span className="font-semibold text-ink">/onboarding</span>. Both stay
                        inside the same Meshed trust flow once Dynamic finishes authentication.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
