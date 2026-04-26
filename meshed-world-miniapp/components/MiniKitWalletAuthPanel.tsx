"use client";

import { MiniKit } from "@worldcoin/minikit-js";
import { WalletCards } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { requestWorldWalletAuthNonce, submitWorldWalletAuthResult } from "@/lib/auth/world-wallet-auth-client";

type MiniKitWalletAuthPanelProps = {
  walletAddress?: string | null;
};

function formatAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function MiniKitWalletAuthPanel({ walletAddress }: MiniKitWalletAuthPanelProps) {
  const router = useRouter();
  const [inWorldApp, setInWorldApp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setInWorldApp(MiniKit.isInWorldApp());
  }, []);

  async function handleWalletAuth() {
    setLoading(true);
    setMessage(null);

    try {
      if (!MiniKit.isInWorldApp()) {
        throw new Error("Open Meshed in World App to connect the wallet for this verified session.");
      }

      const authRequest = await requestWorldWalletAuthNonce();
      const result = await MiniKit.walletAuth({
        nonce: authRequest.nonce,
        statement: authRequest.statement,
        requestId: authRequest.requestId,
        expirationTime: authRequest.expirationTime,
      });

      await submitWorldWalletAuthResult({
        address: result.data.address,
        message: result.data.message,
        signature: result.data.signature,
      });

      void MiniKit.sendHapticFeedback({
        hapticsType: "notification",
        style: "success",
        fallback: () => ({
          status: "success",
          version: 1,
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => null);

      setMessage("World wallet connected.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to connect your World wallet.");
    } finally {
      setLoading(false);
    }
  }

  if (walletAddress) {
    return (
      <div className="rounded-[1.4rem] border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900 shadow-sm">
        <div className="flex items-center gap-2 font-semibold">
          <WalletCards className="h-4 w-4" />
          World wallet connected
        </div>
        <p className="mt-2 text-xs text-emerald-800">{formatAddress(walletAddress)}</p>
      </div>
    );
  }

  return (
    <div className="rounded-[1.4rem] border border-slate-200 bg-white px-4 py-4 text-sm text-ink shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-semibold">
            <WalletCards className="h-4 w-4" />
            Connect World wallet
          </div>
          <p className="mt-2 text-xs leading-5 text-slate">
            World ID proves human uniqueness. Wallet auth connects this Meshed session to the wallet used for future
            WorldChain attestations.
          </p>
        </div>
        <button
          type="button"
          onClick={handleWalletAuth}
          disabled={loading || !inWorldApp}
          className="shrink-0 rounded-full bg-accent px-3 py-2 text-xs font-bold text-white transition hover:bg-accentStrong disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Binding" : "Bind"}
        </button>
      </div>
      {message ? <p className="mt-3 text-xs leading-5 text-slate">{message}</p> : null}
      {!inWorldApp ? <p className="mt-3 text-xs leading-5 text-slate">Open Meshed in World App to connect this wallet.</p> : null}
    </div>
  );
}
