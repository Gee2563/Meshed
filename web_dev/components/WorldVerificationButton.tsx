"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { clientEnv } from "@/lib/config/env";

const LiveWorldVerificationWidget = dynamic(
  () => import("@/components/LiveWorldVerificationWidget").then((module) => module.LiveWorldVerificationWidget),
  { ssr: false },
);

type WorldVerificationButtonProps = {
  signal: string;
  verified: boolean;
};

export function WorldVerificationButton({ signal, verified }: WorldVerificationButtonProps) {
  const router = useRouter();
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

  if (!worldReady) {
    return (
      <div className="flex flex-col items-start gap-2">
        <Button disabled>Verify with World ID</Button>
        <p className="text-xs leading-5 text-slate-500">World ID staging is not configured for this environment yet.</p>
      </div>
    );
  }

  return (
    <LiveWorldVerificationWidget
      appId={clientEnv.worldAppId as `app_${string}`}
      rpId={clientEnv.worldRpId as string}
      action={clientEnv.worldAction}
      signal={signal}
      environment={clientEnv.worldEnvironment}
      onSuccess={() => router.refresh()}
    />
  );
}
