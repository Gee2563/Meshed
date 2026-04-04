import { createHash } from "node:crypto";

import type {
  ManagedWalletProvisionPayload,
  WalletLinkPayload,
  WalletLinkResult,
  WalletLinkService,
} from "@/lib/server/adapters/dynamic/types";

// Live Dynamic adapter stub that preserves the production-facing interface while backend wiring catches up.
export class RealDynamicService implements WalletLinkService {
  async linkWallet(payload: WalletLinkPayload): Promise<WalletLinkResult> {
    return {
      walletAddress: payload.walletAddress,
      dynamicUserId: payload.dynamicUserId ?? null,
      providerRef: `dynamic:env:${payload.walletAddress}`,
    };
  }

  async provisionManagedWallet(payload: ManagedWalletProvisionPayload): Promise<WalletLinkResult> {
    // Keep wallet generation deterministic for now so the service shape is testable before real API integration lands.
    const walletAddress = `0x${createHash("sha256")
      .update(`managed:${payload.userId}:${payload.email}`)
      .digest("hex")
      .slice(0, 40)}`;

    return {
      walletAddress,
      dynamicUserId: `dyn_env_managed_${payload.userId}`,
      providerRef: `dynamic:env:managed:${payload.userId}`,
    };
  }
}
