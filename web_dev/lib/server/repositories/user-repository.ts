import { prisma } from "@/lib/server/prisma";
import { toUserSummary } from "./mappers";

// User repository centralizes profile lookups and the small state transitions tied to verification.
export const userRepository = {
  async listDemoUsers() {
    const users = await prisma.user.findMany({
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });
    return users.map(toUserSummary);
  },

  async findById(id: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    return user ? toUserSummary(user) : null;
  },

  async findByEmail(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    return user ? toUserSummary(user) : null;
  },

  async findByDynamicUserId(dynamicUserId: string) {
    const user = await prisma.user.findUnique({ where: { dynamicUserId } });
    return user ? toUserSummary(user) : null;
  },

  async findByLinkedinUrl(linkedinUrl: string) {
    // LinkedIn URLs are normalized in memory because legacy records may not share one canonical format.
    const normalized = linkedinUrl.trim().toLowerCase();
    const users = await prisma.user.findMany({
      where: {
        linkedinUrl: {
          not: null,
        },
      },
    });

    const matched =
      users.find((user: { linkedinUrl: string | null }) => user.linkedinUrl?.trim().toLowerCase() === normalized) ??
      null;
    return matched ? toUserSummary(matched) : null;
  },

  async findByWalletAddress(walletAddress: string) {
    const user = await prisma.user.findUnique({ where: { walletAddress } });
    return user ? toUserSummary(user) : null;
  },

  async create(data: {
    id: string;
    name: string;
    email: string;
    role: "COMPANY" | "CONSULTANT" | "MENTOR" | "OPERATOR" | "INVESTOR" | "ADMIN";
    bio: string;
    skills: string[];
    sectors: string[];
    profileImageUrl?: string | null;
    linkedinUrl?: string | null;
    outsideNetworkAccessEnabled?: boolean;
  }) {
    // Default nullable/boolean fields here so callers do not need to repeat repository-level conventions.
    const user = await prisma.user.create({
      data: {
        ...data,
        profileImageUrl: data.profileImageUrl ?? null,
        linkedinUrl: data.linkedinUrl ?? null,
        outsideNetworkAccessEnabled: data.outsideNetworkAccessEnabled ?? false,
      },
    });
    return toUserSummary(user);
  },

  async updateProfile(
    userId: string,
    data: {
      name?: string;
      role?: "COMPANY" | "CONSULTANT" | "MENTOR" | "OPERATOR" | "INVESTOR" | "ADMIN";
      bio?: string;
      skills?: string[];
      sectors?: string[];
      profileImageUrl?: string | null;
      linkedinUrl?: string | null;
      outsideNetworkAccessEnabled?: boolean;
    },
  ) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        role: data.role,
        bio: data.bio,
        skills: data.skills,
        sectors: data.sectors,
        profileImageUrl: data.profileImageUrl,
        linkedinUrl: data.linkedinUrl,
        outsideNetworkAccessEnabled: data.outsideNetworkAccessEnabled,
      },
    });
    return toUserSummary(user);
  },

  async setOutsideNetworkAccess(userId: string, outsideNetworkAccessEnabled: boolean) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { outsideNetworkAccessEnabled },
    });
    return toUserSummary(user);
  },

  async linkWallet(userId: string, walletAddress: string, dynamicUserId?: string | null) {
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    // Verification badges are additive; wallet linking should not remove any prior badge state.
    const badges = [...new Set([...(existing?.verificationBadges ?? []), "wallet_connected"])];
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        walletAddress,
        dynamicUserId,
        verificationBadges: badges,
      },
    });
    return toUserSummary(user);
  },

  async markWorldVerified(userId: string) {
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    // Preserve previous badges while marking the user as human-verified.
    const badges = [...new Set([...(existing?.verificationBadges ?? []), "world_verified"])];
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        worldVerified: true,
        verificationBadges: badges,
      },
    });
    return toUserSummary(user);
  },
};
