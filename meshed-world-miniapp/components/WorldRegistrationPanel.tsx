"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { RpContext } from "@worldcoin/idkit";

import { WorldIdRequestPanel } from "@/components/WorldIdRequestPanel";
import { Button } from "@/components/ui/Button";
import { requestWorldRpSignature } from "@/lib/auth/world-verification-client";
import { registerWorldMeshedAccount } from "@/lib/auth/world-registration-client";
import { clientEnv } from "@/lib/config/env";

type RegistrationRole = "investor" | "founder" | "employee";

const registrationSignal = "meshed-world-registration";

type PendingRegistration = {
  key: number;
  name: string;
  email: string;
  role: RegistrationRole;
  rpContext: RpContext;
};

export function WorldRegistrationPanel() {
  const router = useRouter();
  const worldReady = Boolean(clientEnv.worldAppId && clientEnv.worldRpId) && !clientEnv.useMockWorld;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<RegistrationRole>("founder");
  const [loadingRequest, setLoadingRequest] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingRegistration, setPendingRegistration] = useState<PendingRegistration | null>(null);

  const trimmedName = useMemo(() => name.trim(), [name]);

  if (!worldReady) {
    return (
      <div className="rounded-[2rem] border border-amber-200 bg-amber-50/80 p-6 text-left text-sm text-amber-900">
        <p className="font-semibold">World ID registration needs Meshed credentials.</p>
        <p className="mt-2 leading-6">
          Add the World ID app, relying-party, and signing-key values to connect this screen to Meshed registration.
        </p>
      </div>
    );
  }

  const handleOpen = async () => {
    if (!trimmedName) {
      setErrorMessage("Enter the name that Meshed should show before continuing.");
      return;
    }

    setLoadingRequest(true);
    setErrorMessage(null);
    setPendingRegistration(null);

    try {
      const signature = await requestWorldRpSignature(clientEnv.worldAction);
      setPendingRegistration({
        key: Date.now(),
        name: trimmedName,
        email: email.trim(),
        role,
        rpContext: {
          rp_id: clientEnv.worldRpId as string,
          nonce: signature.nonce,
          created_at: signature.created_at,
          expires_at: signature.expires_at,
          signature: signature.sig,
        },
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to start World ID registration.");
    } finally {
      setLoadingRequest(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-[1.8rem] border border-slate-200 bg-white/90 p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate">World ID registration</p>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Register or sign back into Meshed with World ID first. We only store a privacy-preserving World verification
          reference, plus the profile details you choose to add here.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Name
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="George Morris"
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />
          </label>
          <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Optional"
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />
            <span className="mt-2 block text-[11px] font-normal normal-case tracking-normal text-slate-500">
              Optional. If you leave it blank, Meshed will create a private account reference for this session.
            </span>
          </label>
        </div>

        <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Role
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as RegistrationRole)}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          >
            <option value="investor">Investor</option>
            <option value="founder">Founder</option>
            <option value="employee">Employee</option>
          </select>
        </label>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button onClick={handleOpen} disabled={loadingRequest}>
            {loadingRequest ? "Preparing World ID..." : "Register with World ID"}
          </Button>
          <p className="text-xs leading-5 text-slate-500">
            Returning members can use the same World ID action to sign back into the same Meshed account.
          </p>
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/80 px-5 py-4 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      {pendingRegistration ? (
        <WorldIdRequestPanel
          key={pendingRegistration.key}
          appId={clientEnv.worldAppId as `app_${string}`}
          action={clientEnv.worldAction}
          rpContext={pendingRegistration.rpContext}
          signal={registrationSignal}
          environment={clientEnv.worldEnvironment}
          handleVerify={async (result) => {
            setErrorMessage(null);
            await registerWorldMeshedAccount({
              name: pendingRegistration.name,
              email: pendingRegistration.email,
              role: pendingRegistration.role,
              verification: result as unknown,
            });
          }}
          onSuccess={async () => {
            setPendingRegistration(null);
            setErrorMessage(null);
            router.replace("/agent");
            router.refresh();
          }}
          onErrorMessage={(message) => {
            setErrorMessage((current) => current ?? message);
          }}
          onCancel={() => {
            setPendingRegistration(null);
          }}
        />
      ) : null}
    </div>
  );
}
