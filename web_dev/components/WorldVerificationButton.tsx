"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { runWorldVerification } from "@/lib/auth/world-verification-client";
import { clientEnv } from "@/lib/config/env";

type WorldVerificationButtonProps = {
  signal: string;
  verified: boolean;
};

export function WorldVerificationButton({ signal, verified }: WorldVerificationButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [connectorUrl, setConnectorUrl] = useState<string | null>(null);
  const worldReady = Boolean(clientEnv.worldAppId && clientEnv.worldRpId) && !clientEnv.useMockWorld;

  if (verified) {
    return (
      <div className="flex flex-col items-start gap-2">
        <Button variant="secondary" disabled>
          World ID verified
        </Button>
        <p className="text-xs leading-5 text-emerald-700">Meshed already recorded a successful human verification.</p>
      </div>
    );
  }

  const launchConnector = (connectorUri: string, pendingWindow: Window | null) => {
    if (pendingWindow && !pendingWindow.closed) {
      pendingWindow.location.href = connectorUri;
      pendingWindow.focus?.();
      return true;
    }

    const popup = window.open(connectorUri, "_blank");
    if (popup) {
      popup.focus?.();
      return true;
    }

    return false;
  };

  const handleVerify = async () => {
    const pendingWindow = window.open("", "meshed_world_id");

    setPending(true);
    setErrorMessage(null);
    setStatusMessage("Preparing the World ID staging handoff...");
    setConnectorUrl(null);

    try {
      const result = await runWorldVerification({
        signal,
        onConnectorReady: (connectorUri) => {
          setConnectorUrl(connectorUri);

          const launched = launchConnector(connectorUri, pendingWindow);
          setStatusMessage(
            launched
              ? "World ID opened in a new tab or app. Complete verification there, then return here."
              : "Open World ID using the manual link below, then return here after approving.",
          );
        },
      });

      setPending(false);
      setStatusMessage(result?.verification?.message ?? "World verification recorded. Refreshing Meshed state.");
      router.refresh();
    } catch (error) {
      if (pendingWindow && !pendingWindow.closed) {
        pendingWindow.close();
      }
      setPending(false);
      setErrorMessage(error instanceof Error ? error.message : "Unable to complete World ID verification.");
    }
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <Button onClick={handleVerify} disabled={pending || !worldReady}>
        {pending ? "Opening World ID..." : "Verify with World ID"}
      </Button>
      <p className="text-xs leading-5 text-slate-500">
        {worldReady
          ? "This slice uses World staging so you can verify with the simulator before production credentials are ready."
          : "World ID staging is not configured for this environment yet."}
      </p>
      {connectorUrl ? (
        <a
          href={connectorUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-semibold leading-5 text-sky-700 underline underline-offset-2"
        >
          If nothing opened, open World ID manually
        </a>
      ) : null}
      {statusMessage ? <p className="text-xs leading-5 text-emerald-700">{statusMessage}</p> : null}
      {errorMessage ? <p className="text-xs leading-5 text-rose-600">{errorMessage}</p> : null}
    </div>
  );
}
