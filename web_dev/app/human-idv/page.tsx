import { LogoutButton } from "@/components/LogoutButton";
import { Button } from "@/components/ui/Button";
import { getCurrentUser } from "@/lib/server/current-user";

export const dynamic = "force-dynamic";

export default async function HumanIdvPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <main className="px-6 py-16">
        <section className="mx-auto max-w-3xl rounded-[2rem] border border-amber-200 bg-amber-50/80 px-8 py-10 shadow-[0_30px_120px_rgba(15,23,42,0.08)]">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-700">Session required</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900">Human verification starts after Dynamic sign-in.</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-700">
            Meshed needs an active authenticated session before we can continue into the human IDV checkpoint. Return to
            the Dynamic registration page and sign in with your allowlisted email to continue.
          </p>
          <div className="mt-6">
            <Button href="/" variant="secondary">
              Return to Dynamic registration
            </Button>
          </div>
        </section>
      </main>
    );
  }

  const verificationStatus = currentUser.worldVerified ? "Verified" : "Pending";

  return (
    <main className="px-6 py-16">
      <section className="mx-auto max-w-5xl rounded-[2rem] border border-white/70 bg-white/80 px-8 py-10 shadow-[0_30px_120px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div className="space-y-6">
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-700">Human verification</p>
              <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
                Finish the trust checkpoint for {currentUser.name}.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-600">
                Dynamic has already linked your Meshed account and embedded wallet. This page is the handoff into the
                human IDV step we will wire up next, so the current slice focuses on surfacing the right signed-in context
                instead of dropping users onto a missing route.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Meshed member</p>
                <p className="mt-2 text-sm font-medium text-slate-900">{currentUser.email}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Wallet</p>
                <p className="mt-2 text-sm font-medium text-slate-900">
                  {currentUser.walletAddress ? "Connected" : "Pending connection"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Human IDV</p>
                <p className="mt-2 text-sm font-medium text-slate-900">{verificationStatus}</p>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-sky-200 bg-sky-50/80 px-6 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">Next implementation slice</p>
              <p className="mt-3 text-sm leading-6 text-slate-700">
                The next World verification slice can plug into this page without changing the current Dynamic registration
                contract. Until then, this page keeps the signed-in context visible and gives you a stable destination for
                the `/human-idv` redirect.
              </p>
            </div>
          </div>

          <div className="space-y-4 rounded-[2rem] border border-slate-200 bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Current status</p>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
              {currentUser.worldVerified ? "Human verification already recorded." : "Human verification is still pending."}
            </h2>
            <p className="text-base leading-7 text-slate-600">
              {currentUser.worldVerified
                ? "Your account already carries the World verification flag, so this page can later hand off to the next onboarding checkpoint."
                : "Your registration succeeded, and the remaining step is to attach a successful human verification result to this Meshed account."}
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button href="/" variant="secondary">
                Return home
              </Button>
              <LogoutButton />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
