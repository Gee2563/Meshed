import { prisma } from "@/lib/server/prisma";
import { toCompanySummary } from "./mappers";

// Company repository keeps company creation defaults and summary mapping in one place.
export const companyRepository = {
  async create(data: {
    id: string;
    name: string;
    description: string;
    sector: string;
    stage: string;
    website: string;
    ownerUserId: string;
    currentPainTags: string[];
    resolvedPainTags: string[];
    companyKind?: "VC" | "PORTFOLIO" | "OPERATING";
    parentCompanyId?: string | null;
    outsideNetworkAccessEnabled?: boolean;
  }) {
    // These defaults mirror the current onboarding flow: standalone operating company unless specified otherwise.
    const company = await prisma.company.create({
      data: {
        ...data,
        companyKind: data.companyKind ?? "OPERATING",
        parentCompanyId: data.parentCompanyId ?? null,
        outsideNetworkAccessEnabled: data.outsideNetworkAccessEnabled ?? false,
      },
    });
    return toCompanySummary(company);
  },

  async findById(id: string) {
    const company = await prisma.company.findUnique({ where: { id } });
    return company ? toCompanySummary(company) : null;
  },

  async findByOwnerUserId(ownerUserId: string) {
    const company = await prisma.company.findFirst({ where: { ownerUserId } });
    return company ? toCompanySummary(company) : null;
  },
};
