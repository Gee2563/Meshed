import { prisma } from "@/lib/server/prisma";
import type { OnboardingProfileSummary } from "@/lib/types";

// Repository wrapper for onboarding profile persistence and DB-to-summary conversion.
function toSummary(profile: Awaited<ReturnType<typeof prisma.onboardingProfile.findFirstOrThrow>>): OnboardingProfileSummary {
  return {
    id: profile.id,
    userId: profile.userId,
    companyId: profile.companyId,
    vcCompanyId: profile.vcCompanyId,
    portfolioCompanyId: profile.portfolioCompanyId,
    mode: profile.mode.toLowerCase() as OnboardingProfileSummary["mode"],
    title: profile.title,
    isExecutive: profile.isExecutive,
    executiveSignoffEmail: profile.executiveSignoffEmail,
    currentStep: profile.currentStep.toLowerCase() as OnboardingProfileSummary["currentStep"],
    teamCsvUploadedAt: profile.teamCsvUploadedAt?.toISOString() ?? null,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
}

export const onboardingRepository = {
  async upsertByUserId(
    userId: string,
    data: {
      id?: string;
      companyId?: string | null;
      vcCompanyId?: string | null;
      portfolioCompanyId?: string | null;
      mode: "COMPANY" | "INDIVIDUAL";
      title: string;
      isExecutive: boolean;
      executiveSignoffEmail?: string | null;
      currentStep?: "VC_COMPANY" | "PORTFOLIO_COMPANY" | "COMPANY_ACCESS" | "INDIVIDUAL_PROFILE" | "COMPLETE";
      teamCsvUploadedAt?: Date | null;
    },
  ) {
    // Upsert keeps onboarding idempotent so repeated auth callbacks update one profile instead of creating duplicates.
    const profile = await prisma.onboardingProfile.upsert({
      where: { userId },
      update: {
        companyId: data.companyId ?? null,
        vcCompanyId: data.vcCompanyId === undefined ? undefined : data.vcCompanyId,
        portfolioCompanyId: data.portfolioCompanyId === undefined ? undefined : data.portfolioCompanyId,
        mode: data.mode,
        title: data.title,
        isExecutive: data.isExecutive,
        executiveSignoffEmail: data.executiveSignoffEmail ?? null,
        currentStep: data.currentStep,
        teamCsvUploadedAt: data.teamCsvUploadedAt === undefined ? undefined : data.teamCsvUploadedAt,
      },
      create: {
        id: data.id ?? `onb_${userId}`,
        userId,
        companyId: data.companyId ?? null,
        vcCompanyId: data.vcCompanyId ?? null,
        portfolioCompanyId: data.portfolioCompanyId ?? null,
        mode: data.mode,
        title: data.title,
        isExecutive: data.isExecutive,
        executiveSignoffEmail: data.executiveSignoffEmail ?? null,
        currentStep: data.currentStep ?? "VC_COMPANY",
        teamCsvUploadedAt: data.teamCsvUploadedAt ?? null,
      },
    });

    return toSummary(profile);
  },

  async markTeamUploadComplete(userId: string) {
    // Team upload completion is tracked with a timestamp so later flows can audit when the CSV arrived.
    const profile = await prisma.onboardingProfile.update({
      where: { userId },
      data: { teamCsvUploadedAt: new Date() },
    });
    return toSummary(profile);
  },

  async findByUserId(userId: string) {
    // Missing onboarding state is a normal condition for newly authenticated users.
    const profile = await prisma.onboardingProfile.findUnique({ where: { userId } });
    return profile ? toSummary(profile) : null;
  },
};
