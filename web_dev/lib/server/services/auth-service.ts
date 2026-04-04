import { getWalletLinkService } from "@/lib/server/adapters/dynamic";
import { getWorldVerificationService } from "@/lib/server/adapters/world";
import { ApiError } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";
import { userRepository } from "@/lib/server/repositories/user-repository";
import { worldOnboardingContractService } from "@/lib/server/services/world-onboarding-contract-service";

const verificationType = {
  WALLET_LINK: "WALLET_LINK",
  WORLD_ID: "WORLD_ID",
} as const;

const verificationStatus = {
  VERIFIED: "VERIFIED",
} as const;

function getVerificationRecordClient() {
  return prisma as unknown as {
    verificationRecord?: {
      create(args: {
        data: {
          id: string;
          userId: string;
          type: string;
          status: string;
          providerRef: string;
          metadata: Record<string, unknown>;
        };
      }): Promise<unknown>;
    };
  };
}

// Authentication service handles lightweight login plus verification side effects for wallet and World ID.
export const authService = {
  async loginAsDemoUser(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new ApiError(404, "Demo user not found.");
    }

    return user;
  },

  async linkWallet(userId: string, payload: { walletAddress: string; dynamicUserId?: string | null }) {
    // Ask the configured Dynamic adapter to validate/link first, then persist the verified result locally.
    const adapter = getWalletLinkService();
    const result = await adapter.linkWallet(payload);
    const user = await userRepository.linkWallet(userId, result.walletAddress, result.dynamicUserId);
    const prismaClient = getVerificationRecordClient();

    if (prismaClient.verificationRecord) {
      await prismaClient.verificationRecord.create({
        data: {
          id: `ver_wallet_${Date.now()}`,
          userId,
          type: verificationType.WALLET_LINK,
          status: verificationStatus.VERIFIED,
          providerRef: result.providerRef,
          metadata: {},
        },
      });
    }

    return user;
  },

  async verifyWorld(userId: string, payload: { signal: string; proof?: unknown }) {
    // World verification updates both the user record and the audit trail of verification events.
    const adapter = getWorldVerificationService();
    const result = await adapter.verify(payload);

    if (!result.verified) {
      throw new ApiError(400, "World verification failed.");
    }

    const user = await userRepository.markWorldVerified(userId);
    await worldOnboardingContractService.ensureWorldVerifiedContract(user);
    const prismaClient = getVerificationRecordClient();

    if (prismaClient.verificationRecord) {
      await prismaClient.verificationRecord.create({
        data: {
          id: `ver_world_${Date.now()}`,
          userId,
          type: verificationType.WORLD_ID,
          status: verificationStatus.VERIFIED,
          providerRef: result.providerRef,
          metadata: (result.metadata ?? {}) as Record<string, unknown>,
        },
      });
    }

    return user;
  },
};
