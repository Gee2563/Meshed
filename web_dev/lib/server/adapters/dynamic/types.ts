// Shared contract between Dynamic adapters and the services that depend on them.
export interface WalletLinkPayload {
  walletAddress: string;
  dynamicUserId?: string | null;
}

export interface ManagedWalletProvisionPayload {
  userId: string;
  email: string;
  name: string;
}

export interface WalletLinkResult {
  walletAddress: string;
  dynamicUserId?: string | null;
  providerRef: string;
}

export interface WalletLinkService {
  linkWallet(payload: WalletLinkPayload): Promise<WalletLinkResult>;
  provisionManagedWallet(payload: ManagedWalletProvisionPayload): Promise<WalletLinkResult>;
}
