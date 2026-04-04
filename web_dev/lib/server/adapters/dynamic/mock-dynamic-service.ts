import { createHash } from "node:crypto";

import type {
  ManagedWalletProvisionPayload,
  WalletLinkPayload,
  WalletLinkResult,
  WalletLinkService,
} from "@/lib/server/adapters/dynamic/types";

export class MockDynamicService implements WalletLinkService {
  async linkWallet(payload: WalletLinkPayload): Promise<WalletLinkResult> {
    return {
      walletAddress: payload.walletAddress,
      dynamicUserId: payload.dynamicUserId ?? "dyn_mock_user",
      providerRef: `dynamic:mock:${payload.walletAddress}`,
    };
  }

  async provisionManagedWallet(payload: ManagedWalletProvisionPayload): Promise<WalletLinkResult> {
    const walletAddress = `0x${createHash("sha256")
      .update(`${payload.userId}:${payload.email}`)
      .digest("hex")
      .slice(0, 40)}`;

    return {
      walletAddress,
      dynamicUserId: `dyn_managed_${payload.userId}`,
      providerRef: `dynamic:mock:managed:${payload.userId}`,
    };
  }
}
