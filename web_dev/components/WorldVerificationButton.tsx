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

  const handleVerify = async () => {
    setPending(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const result = await runWorldVerification({ signal });
      setStatusMessage(result?.verification?.message ?? "World verification recorded. Refreshing Meshed state.");
      router.refresh();
    } catch (error) {
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
      {statusMessage ? <p className="text-xs leading-5 text-emerald-700">{statusMessage}</p> : null}
      {errorMessage ? <p className="text-xs leading-5 text-rose-600">{errorMessage}</p> : null}
    </div>
  );
}
