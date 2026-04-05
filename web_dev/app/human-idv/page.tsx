import { HumanIdvIdentityForm } from "@/components/HumanIdvIdentityForm";
import { LogoutButton } from "@/components/LogoutButton";
import { WorldVerificationButton } from "@/components/WorldVerificationButton";
import { Button } from "@/components/ui/Button";
import { clientEnv } from "@/lib/config/env";
import { getCurrentUser } from "@/lib/server/current-user";

export const dynamic = "force-dynamic";

function splitDisplayName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return {
      firstName: "",
      lastName: "",
    };
  }

  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

export default async function HumanIdvPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <main className="px-6 py-16">
        <section className="mx-auto max-w-3xl rounded-[2rem] border border-amber-200 bg-amber-50/80 px-8 py-10 shadow-[0_30px_120px_rgba(15,23,42,0.08)]">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-700">Session required</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900">Human verification starts after sign-in.</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-700">
            Meshed needs an active authenticated session before we can continue into the human IDV checkpoint. Return to
            the home page and sign in with your allowlisted email to continue.
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

  const verificationStatus = currentUser.worldVerified ? "Verified" : "Pending";
  const verificationSignal = currentUser.id;
  const worldAction = `${clientEnv.worldAction}-${currentUser.id}`;
  const nameParts = splitDisplayName(currentUser.name);

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
                Your authenticated Meshed session is active. Use this page to confirm the member name that should be
                shown across the network, then continue into World ID staging so Meshed can record the verified result
                against the current account.
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

            <HumanIdvIdentityForm initialFirstName={nameParts.firstName} initialLastName={nameParts.lastName} />

            <div className="rounded-[1.75rem] border border-sky-200 bg-sky-50/80 px-6 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">World staging flow</p>
              <p className="mt-3 text-sm leading-6 text-slate-700">
                Meshed requests a signed RP context from the backend, launches the World connector in staging, then sends
                the returned IDKit payload back to the server for verification and local account marking.
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
                ? "Your account already carries the World verification flag, so this page can hand off to the rest of the Meshed product surface."
                : "Once your member details look right, complete World ID and attach that verified result to this Meshed account."}
            </p>
            <div className="rounded-[1.5rem] border border-slate-200 bg-mist/80 px-5 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Verification action</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Meshed binds the World proof to your current signed-in member identity so the verification result lands on
                the correct account every time.
              </p>
              <div className="mt-4">
                <WorldVerificationButton
                  signal={verificationSignal}
                  verified={currentUser.worldVerified}
                  action={worldAction}
                />
              </div>
            </div>
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
