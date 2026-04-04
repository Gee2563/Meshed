import { Prisma, VerificationStatus, VerificationType } from "@prisma/client";

import { getWalletLinkService } from "@/lib/server/adapters/dynamic";
import type { WalletLinkService } from "@/lib/server/adapters/dynamic/types";
import { ApiError } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";
import { userRepository } from "@/lib/server/repositories/user-repository";
import type { UserSummary } from "@/lib/types";

// Provision managed wallets only when a user does not already have one linked.
type ManagedWalletServiceDependencies = {
  dynamicService: Pick<WalletLinkService, "provisionManagedWallet">;
  userRepository: {
    findById(userId: string): Promise<UserSummary | null>;
    linkWallet(userId: string, walletAddress: string, dynamicUserId?: string | null): Promise<UserSummary>;
  };
  verificationRepository: {
    findWalletVerification(userId: string): Promise<unknown | null>;
    createWalletVerification(userId: string, providerRef: string, metadata: Record<string, unknown>): Promise<unknown>;
  };
};

export function createManagedWalletService(deps: ManagedWalletServiceDependencies) {
  return {
    async ensureWalletForUser(userId: string) {
      const existingUser = await deps.userRepository.findById(userId);
      if (!existingUser) {
        throw new ApiError(404, "User not found.");
      }

      if (existingUser.walletAddress) {
        // Treat wallet creation as idempotent so repeat calls are safe from onboarding and retry flows.
        return existingUser;
      }

      const provisionedWallet = await deps.dynamicService.provisionManagedWallet({
        userId: existingUser.id,
        email: existingUser.email,
        name: existingUser.name,
      });

      const user = await deps.userRepository.linkWallet(
        userId,
        provisionedWallet.walletAddress,
        provisionedWallet.dynamicUserId,
      );

      const existingVerification = await deps.verificationRepository.findWalletVerification(userId);
      if (!existingVerification) {
        await deps.verificationRepository.createWalletVerification(userId, provisionedWallet.providerRef, {
          mode: "passive",
          walletAddress: provisionedWallet.walletAddress,
          dynamicUserId: provisionedWallet.dynamicUserId ?? null,
        });
      }

      return user;
    },
  };
}

export const managedWalletService = createManagedWalletService({
  dynamicService: getWalletLinkService(),
  userRepository,
  verificationRepository: {
    async findWalletVerification(userId: string) {
      return prisma.verificationRecord.findFirst({
        where: {
          userId,
          type: VerificationType.WALLET_LINK,
          status: VerificationStatus.VERIFIED,
        },
      });
    },
    async createWalletVerification(userId: string, providerRef: string, metadata: Record<string, unknown>) {
      return prisma.verificationRecord.create({
        data: {
          id: `ver_wallet_passive_${Date.now()}`,
          userId,
          type: VerificationType.WALLET_LINK,
          status: VerificationStatus.VERIFIED,
          providerRef,
          metadata: metadata as Prisma.InputJsonValue,
        },
      });
    },
  },
});
