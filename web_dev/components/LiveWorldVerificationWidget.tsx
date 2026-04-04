"use client";

import { useState } from "react";
import {
  IDKitRequestWidget,
  type IDKitErrorCodes,
  orbLegacy,
  type RpContext,
  type IDKitResult,
} from "@worldcoin/idkit";

import { Button } from "@/components/ui/Button";
import {
  requestWorldRpSignature,
  submitWorldVerificationResult,
} from "@/lib/auth/world-verification-client";
import { clientEnv } from "@/lib/config/env";

type LiveWorldVerificationWidgetProps = {
  appId: `app_${string}`;
  rpId: string;
  action: string;
  signal: string;
  environment: "production" | "staging";
  onSuccess: () => void;
  label?: string;
};

function formatWorldError(code: IDKitErrorCodes) {
  return code.replaceAll("_", " ");
}

export function LiveWorldVerificationWidget({
  appId,
  rpId,
  action,
  signal,
  environment,
  onSuccess,
  label = "Verify with World ID",
}: LiveWorldVerificationWidgetProps) {
  const [open, setOpen] = useState(false);
  const [loadingRequest, setLoadingRequest] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rpContext, setRpContext] = useState<RpContext | null>(null);

  const handleOpen = async () => {
    setLoadingRequest(true);
    setErrorMessage(null);

    try {
      const signature = await requestWorldRpSignature(action);
      setRpContext({
        rp_id: rpId,
        nonce: signature.nonce,
        created_at: signature.created_at,
        expires_at: signature.expires_at,
        signature: signature.sig,
      });
      setOpen(true);
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
        This opens World&apos;s built-in verification modal so you can continue with the staging simulator flow.
      </p>
      {errorMessage ? <p className="text-xs leading-5 text-rose-600">{errorMessage}</p> : null}
      {rpContext ? (
        <IDKitRequestWidget
          open={open}
          onOpenChange={setOpen}
          app_id={appId}
          action={action}
          rp_context={rpContext}
          allow_legacy_proofs
          environment={environment}
          return_to={`${clientEnv.appUrl.replace(/\/$/, "")}/human-idv`}
          preset={orbLegacy({ signal })}
          handleVerify={async (result: IDKitResult) => {
            try {
              setErrorMessage(null);
              await submitWorldVerificationResult(result);
            } catch (error) {
              const message = error instanceof Error ? error.message : "Unable to complete World ID verification.";
              setErrorMessage(message);
              throw error;
            }
          }}
          onSuccess={async () => {
            setOpen(false);
            setErrorMessage(null);
            onSuccess();
          }}
          onError={async (errorCode) => {
            setOpen(false);
            setErrorMessage((current) => current ?? `World ID verification did not complete (${formatWorldError(errorCode)}).`);
          }}
          language="en"
        />
      ) : null}
    </div>
  );
}
