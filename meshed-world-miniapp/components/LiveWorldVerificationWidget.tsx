"use client";

import { useState } from "react";
import type { RpContext } from "@worldcoin/idkit";

import { WorldIdRequestPanel } from "@/components/WorldIdRequestPanel";
import { Button } from "@/components/ui/Button";
import {
  requestWorldRpSignature,
  submitWorldVerificationResult,
} from "@/lib/auth/world-verification-client";

type LiveWorldVerificationWidgetProps = {
  appId: `app_${string}`;
  rpId: string;
  action: string;
  signal: string;
  environment: "production" | "staging";
  onSuccess: () => void;
  label?: string;
};

export function LiveWorldVerificationWidget({
  appId,
  rpId,
  action,
  signal,
  environment,
  onSuccess,
  label = "Verify with World ID",
}: LiveWorldVerificationWidgetProps) {
  const [loadingRequest, setLoadingRequest] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rpContext, setRpContext] = useState<RpContext | null>(null);
  const [requestKey, setRequestKey] = useState(0);

  const handleOpen = async () => {
    setLoadingRequest(true);
    setErrorMessage(null);
    setRpContext(null);

    try {
      const signature = await requestWorldRpSignature(action);
      setRpContext({
        rp_id: rpId,
        nonce: signature.nonce,
        created_at: signature.created_at,
        expires_at: signature.expires_at,
        signature: signature.sig,
      });
      setRequestKey((current) => current + 1);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to start World ID verification.");
    } finally {
      setLoadingRequest(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <Button onClick={handleOpen} disabled={loadingRequest}>
        {loadingRequest ? "Preparing World ID..." : label}
      </Button>
      <p className="text-xs leading-5 text-slate-500">
        This starts a World ID request and returns you to Meshed once the proof is complete.
      </p>
      {errorMessage ? <p className="text-xs leading-5 text-rose-600">{errorMessage}</p> : null}
      {rpContext ? (
        <WorldIdRequestPanel
          key={requestKey}
          appId={appId}
          action={action}
          rpContext={rpContext}
          signal={signal}
          environment={environment}
          handleVerify={async (result) => {
            setErrorMessage(null);
            await submitWorldVerificationResult(result);
          }}
          onSuccess={async () => {
            setRpContext(null);
            setErrorMessage(null);
            onSuccess();
          }}
          onErrorMessage={(message) => {
            setErrorMessage((current) => current ?? message);
          }}
          onCancel={() => {
            setRpContext(null);
          }}
        />
      ) : null}
    </div>
  );
}
