import { DynamicRegistrationPanel } from "@/components/DynamicRegistrationPanel";
import { LogoutButton } from "@/components/LogoutButton";
import { MeshedLogo } from "@/components/MeshedLogo";
import { getCurrentUser } from "@/lib/server/current-user";

// Public landing page for the current MVP and the first stop in the verified onboarding flow.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const currentUser = await getCurrentUser();
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

  return (
    <main className="px-6 py-16">
      <section className="mx-auto w-full max-w-6xl rounded-[2rem] border border-white/70 bg-white/80 px-8 py-10 shadow-[0_30px_120px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div className="space-y-8">
            <MeshedLogo />
            <div className="space-y-4 text-center lg:text-left">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-700">Dynamic registration</p>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
                Verified onboarding for investors and operators inside the Meshed portfolio network.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-600">
                Start with Dynamic for authentication and embedded wallet setup. Meshed then syncs the invite, creates the
                account, and moves the member into the next verification step without a separate signup form.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {registrationMilestones.map((milestone) => (
                <div
                  key={milestone.label}
                  className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-4 text-left shadow-sm"
                >
                  <p className="text-sm font-semibold text-slate-900">{milestone.label}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{milestone.detail}</p>
                </div>
              ))}
            </div>

            {currentUser ? (
              <section className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50/80 px-6 py-5 text-left">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">Meshed session active</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
                  Welcome back, {currentUser.name}.
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-700">
                  Your Dynamic-authenticated Meshed session is already live. You can stay signed in here while we keep
                  building the next onboarding routes, or log out and test the registration flow again.
                </p>
                <dl className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-emerald-200 bg-white/90 px-4 py-3">
                    <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Role</dt>
                    <dd className="mt-2 text-sm font-medium text-slate-900">{currentUser.role}</dd>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-white/90 px-4 py-3">
                    <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Wallet</dt>
                    <dd className="mt-2 text-sm font-medium text-slate-900">
                      {currentUser.walletAddress ? "Connected" : "Pending"}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-white/90 px-4 py-3">
                    <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Human IDV</dt>
                    <dd className="mt-2 text-sm font-medium text-slate-900">
                      {currentUser.worldVerified ? "Verified" : "Pending"}
                    </dd>
                  </div>
                </dl>
                <div className="mt-5">
                  <LogoutButton />
                </div>
              </section>
            ) : (
              <section className="rounded-[1.75rem] border border-sky-200 bg-sky-50/80 px-6 py-5 text-left">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">Invitation-only onboarding</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
                  Use your allowlisted email to begin the Dynamic registration flow.
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-700">
                  Once Dynamic finishes authentication and exposes the primary wallet, Meshed automatically registers the
                  account, writes the session cookie, and advances to the invite-aware next step.
                </p>
              </section>
            )}
          </div>

          <div className="lg:pl-4">
            {currentUser ? (
              <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Registration ready</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
                  Dynamic is already linked to this Meshed account.
                </h2>
                <p className="mt-4 text-base leading-7 text-slate-600">
                  This landing page now acts as the registration entrypoint for new members and as a safe signed-in state
                  for repeat visits while we build the rest of the onboarding surface one slice at a time.
                </p>
              </div>
            ) : (
              <DynamicRegistrationPanel />
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
