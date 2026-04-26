"use client";

import { useEffect, useRef, useState } from "react";
import {
  IDKitErrorCodes,
  orbLegacy,
  type IDKitResult,
  type RpContext,
  useIDKitRequest,
} from "@worldcoin/idkit";

import { Button } from "@/components/ui/Button";
import { clientEnv } from "@/lib/config/env";

type WorldIdRequestPanelProps = {
  appId: `app_${string}`;
  action: string;
  rpContext: RpContext;
  signal: string;
  environment: "production" | "staging";
  handleVerify: (result: IDKitResult) => Promise<void>;
  onSuccess: () => void | Promise<void>;
  onErrorMessage: (message: string) => void;
  onCancel?: () => void;
};

function formatWorldError(code: IDKitErrorCodes) {
  return code.replaceAll("_", " ");
}

function simulatorUrl(connectorUri: string) {
  return `https://simulator.worldcoin.org?connect_url=${encodeURIComponent(connectorUri)}`;
}

const externalLinkClassName =
  "inline-flex items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-ink ring-1 ring-line transition-colors hover:bg-mist";

export function WorldIdRequestPanel({
  appId,
  action,
  rpContext,
  signal,
  environment,
  handleVerify,
  onSuccess,
  onErrorMessage,
  onCancel,
}: WorldIdRequestPanelProps) {
  const openedRef = useRef(false);
  const submittedRef = useRef(false);
  const reportedErrorRef = useRef<IDKitErrorCodes | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const flow = useIDKitRequest({
    app_id: appId,
    action,
    rp_context: rpContext,
    allow_legacy_proofs: true,
    environment,
    return_to: `${clientEnv.appUrl.replace(/\/$/, "")}/agent`,
    preset: orbLegacy({ signal }),
  });

  useEffect(() => {
    if (openedRef.current) {
      return;
    }
    openedRef.current = true;
    flow.open();
  }, [flow]);

  useEffect(() => {
    if (!flow.errorCode || reportedErrorRef.current === flow.errorCode) {
      return;
    }

    reportedErrorRef.current = flow.errorCode;
    onErrorMessage(`World ID verification did not complete (${formatWorldError(flow.errorCode)}).`);
  }, [flow.errorCode, onErrorMessage]);

  useEffect(() => {
    if (!flow.result || submittedRef.current) {
      return;
    }

    submittedRef.current = true;
    setSubmitting(true);

    void handleVerify(flow.result)
      .then(onSuccess)
      .catch((error) => {
        submittedRef.current = false;
        onErrorMessage(error instanceof Error ? error.message : "Unable to complete World ID verification.");
      })
      .finally(() => {
        setSubmitting(false);
      });
  }, [flow.result, handleVerify, onErrorMessage, onSuccess]);

  const statusLabel = submitting
    ? "Completing Meshed registration..."
    : flow.isAwaitingUserConfirmation
      ? "Waiting for approval in World App or the simulator..."
      : flow.connectorURI
        ? "World ID request ready."
        : "Preparing World ID request...";

  return (
    <div className="rounded-[1.5rem] border border-sky-200 bg-sky-50/80 p-4 text-sm text-slate-700">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-900">{statusLabel}</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Staging requests can be completed with World App or the World ID simulator.
          </p>
        </div>
        {onCancel ? (
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>

      {flow.connectorURI ? (
        <div className="mt-4 flex flex-wrap gap-3">
          <a href={flow.connectorURI} className={externalLinkClassName}>
            Open World App
          </a>
          {environment === "staging" ? (
            <a
              href={simulatorUrl(flow.connectorURI)}
              target="_blank"
              rel="noopener noreferrer"
              className={externalLinkClassName}
            >
              Use World ID simulator
            </a>
          ) : null}
        </div>
      ) : flow.isInWorldApp ? (
        <p className="mt-4 text-xs leading-5 text-slate-600">
          Continue in World App to approve the request.
        </p>
      ) : null}
    </div>
  );
}
