"use client";

import { useEffect, useRef, useState } from "react";
import {
  DynamicEmbeddedWidget,
  useDynamicContext,
} from "@dynamic-labs/sdk-react-core";
import { useRouter } from "next/navigation";

import { getDynamicRegistrationGate } from "@/lib/auth/dynamic-registration-gate";
import {
  buildDynamicRegistrationPayload,
  normalizeDynamicNextRoute,
} from "@/lib/auth/dynamic-onboarding";
import { getDynamicProviderDiagnostics } from "@/lib/config/dynamic-provider";
import { clientEnv } from "@/lib/config/env";

type SyncState = "idle" | "waiting_for_wallet" | "syncing_meshed" | "error";

// This panel owns the handoff from Dynamic auth into Meshed account registration.
export function DynamicRegistrationPanel() {
  const diagnostics = getDynamicProviderDiagnostics(clientEnv);

  useEffect(() => {
    console.info("[meshed][dynamic-panel] render diagnostics", diagnostics);
  }, [diagnostics]);

  if (!clientEnv.dynamicEnvironmentId || clientEnv.useMockDynamic) {
    console.warn("[meshed][dynamic-panel] live signup unavailable, showing fallback.", diagnostics);
    return (
      <div className="rounded-[2rem] border border-amber-200 bg-amber-50/80 p-6 text-left text-sm text-amber-900">
        <p className="font-semibold">Dynamic is not configured for live signup yet.</p>
        <p className="mt-2 leading-6">
          Set <code>NEXT_PUBLIC_DYNAMIC_ENV_ID</code> and disable <code>USE_MOCK_DYNAMIC</code> to use the real
          Dynamic registration flow on this screen.
        </p>
      </div>
    );
  }

  return <DynamicRegistrationPanelInner />;
}

function DynamicRegistrationPanelInner() {
  const router = useRouter();
  const { primaryWallet, sdkHasLoaded, user } = useDynamicContext();
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  // Dynamic can emit several auth-related updates in a row, so guard against duplicate POSTs.
  const registrationSubmitted = useRef(false);
  const registrationGate = getDynamicRegistrationGate({
    hasPrimaryWallet: Boolean(primaryWallet?.address),
    hasUser: Boolean(user),
  });

  useEffect(() => {
    // Seed the editable fields from Dynamic once, then let the user correct them locally.
    if (!firstName && user?.firstName?.trim()) {
      setFirstName(user.firstName.trim());
    }
    if (!lastName && user?.lastName?.trim()) {
      setLastName(user.lastName.trim());
    }
  }, [firstName, lastName, user?.firstName, user?.lastName]);

  useEffect(() => {
    console.info("[meshed][dynamic-panel] auth state changed", {
      hasUser: Boolean(user),
      dynamicUserId: user?.userId ?? user?.lastVerifiedCredentialId ?? null,
      hasPrimaryWallet: Boolean(primaryWallet?.address),
      primaryWalletAddress: primaryWallet?.address ?? null,
      registrationGate,
      sdkHasLoaded,
      syncState,
    });
  }, [
    primaryWallet?.address,
    registrationGate,
    sdkHasLoaded,
    syncState,
    user?.lastVerifiedCredentialId,
    user?.userId,
  ]);

  useEffect(() => {
    // Auth success and wallet creation can complete at different times, so this effect acts as a small state machine.
    if (registrationGate === "awaiting_auth") {
      registrationSubmitted.current = false;
      if (syncState !== "idle" || errorMessage) {
        setSyncState("idle");
        setErrorMessage(null);
      }
      console.info("[meshed][dynamic-panel] waiting for Dynamic auth success.");
      return;
    }

    if (registrationGate === "awaiting_wallet") {
      if (syncState !== "waiting_for_wallet" || errorMessage) {
        console.info("[meshed][dynamic-panel] waiting for Dynamic to finish wallet sync.", {
          dynamicUserId: user?.userId ?? user?.lastVerifiedCredentialId ?? null,
          sdkHasLoaded,
        });
        setSyncState("waiting_for_wallet");
        setErrorMessage(null);
      }
      return;
    }

    if (registrationSubmitted.current) {
      console.info("[meshed][dynamic-panel] registration already submitted, waiting for completion.");
      return;
    }

    registrationSubmitted.current = true;
    setSyncState("syncing_meshed");
    setErrorMessage(null);

    if (!user || !primaryWallet?.address) {
      registrationSubmitted.current = false;
      setSyncState("error");
      setErrorMessage("Dynamic auth completed without a primary wallet.");
      console.error("[meshed][dynamic-panel] Dynamic auth completed without a primary wallet.", {
        dynamicUserId: user?.userId ?? user?.lastVerifiedCredentialId ?? null,
      });
      return;
    }

    const normalizedFirstName = firstName.trim();
    const normalizedLastName = lastName.trim();
    if (!normalizedFirstName || !normalizedLastName) {
      registrationSubmitted.current = false;
      setSyncState("error");
      setErrorMessage("Enter first and last name before continuing.");
      return;
    }

    const payload = buildDynamicRegistrationPayload({
      user,
      walletAddress: primaryWallet.address,
      firstName: normalizedFirstName,
      lastName: normalizedLastName,
    });
    console.info("[meshed][dynamic-panel] posting Dynamic registration payload.", {
      dynamicUserId: payload.dynamicUserId,
      email: payload.email,
      firstName: normalizedFirstName,
      lastName: normalizedLastName,
      walletAddress: payload.walletAddress,
      target: "/api/auth/dynamic/register",
    });

    void fetch("/api/auth/dynamic/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
      .then(async (response) => {
        const body = (await response.json().catch(() => null)) as
          | { ok?: boolean; error?: string; data?: { nextRoute?: string | null } }
          | null;
        console.info("[meshed][dynamic-panel] Dynamic registration response.", {
          status: response.status,
          ok: response.ok,
          body,
        });

        if (!response.ok || !body?.ok) {
          throw new Error(body?.error ?? "Unable to register your Meshed account.");
        }

        router.replace(normalizeDynamicNextRoute(body.data?.nextRoute));
        router.refresh();
      })
      .catch((error: unknown) => {
        registrationSubmitted.current = false;
        const message = error instanceof Error ? error.message : "Unable to register your Meshed account.";
        console.error("[meshed][dynamic-panel] Dynamic registration failed.", {
          message,
          error,
        });
        setErrorMessage(message);
        setSyncState("error");
      });
  }, [
    errorMessage,
    firstName,
    lastName,
    primaryWallet?.address,
    registrationGate,
    router,
    sdkHasLoaded,
    syncState,
    user,
  ]);

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <div className="border-b border-slate-100 px-6 py-5">
          <div className="text-center text-2xl font-semibold tracking-tight text-slate-900">Log in or sign up</div>
        </div>
        <div className="px-4 py-4">
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              First name
              <input
                type="text"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
                placeholder="First name"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Last name
              <input
                type="text"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
                placeholder="Last name"
              />
            </label>
          </div>
          <DynamicEmbeddedWidget background="none" />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/90 px-5 py-4 text-sm text-slate-600">
        {syncState === "waiting_for_wallet" ? (
          <p>Dynamic is finalizing the embedded wallet. Meshed will continue as soon as the primary wallet is ready.</p>
        ) : null}
        {syncState === "syncing_meshed" ? (
          <p>Syncing the authenticated Dynamic user into Meshed and preparing the next verification step.</p>
        ) : null}
        {syncState === "idle" ? (
          <p>Use Dynamic to register. Once the wallet is ready, Meshed will move you straight to human verification.</p>
        ) : null}
        {syncState === "error" ? (
          <p className="text-rose-600">{errorMessage ?? "Unable to complete Dynamic registration."}</p>
        ) : null}
      </div>
    </div>
  );
}
