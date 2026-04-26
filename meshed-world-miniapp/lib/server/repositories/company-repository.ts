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
    address?: string | null;
    pointOfContactName?: string | null;
    pointOfContactEmail?: string | null;
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
        address: data.address ?? null,
        pointOfContactName: data.pointOfContactName ?? null,
        pointOfContactEmail: data.pointOfContactEmail ?? null,
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

  async findByWebsite(website: string) {
    const normalized = website.trim().toLowerCase().replace(/\/+$/, "");
    const companies = await prisma.company.findMany({
      where: {
        website: {
          not: "",
        },
      },
    });

    const matched =
      companies.find((company) => company.website.trim().toLowerCase().replace(/\/+$/, "") === normalized) ?? null;
    return matched ? toCompanySummary(matched) : null;
  },

  async listVcCompanies() {
    const companies = await prisma.company.findMany({
      where: {
        companyKind: "VC",
      },
      orderBy: [{ name: "asc" }],
    });
    return companies.map(toCompanySummary);
  },

  async findByOwnerUserId(ownerUserId: string) {
    const company = await prisma.company.findFirst({ where: { ownerUserId } });
    return company ? toCompanySummary(company) : null;
  },

  async findByName(name: string) {
    const normalized = name.trim().toLowerCase();
    if (!normalized) {
      return null;
    }

    const companies = await prisma.company.findMany({
      where: {
        name: {
          not: "",
        },
      },
    });

    const matched = companies.find((company) => company.name.trim().toLowerCase() === normalized) ?? null;
    return matched ? toCompanySummary(matched) : null;
  },

  async updateDetails(
    companyId: string,
    data: {
      name?: string;
      description?: string;
      sector?: string;
      stage?: string;
      address?: string | null;
      website?: string;
      companyKind?: "VC" | "PORTFOLIO" | "OPERATING";
      parentCompanyId?: string | null;
    },
  ) {
    const company = await prisma.company.update({
      where: { id: companyId },
      data: {
        name: data.name,
        description: data.description,
        sector: data.sector,
        stage: data.stage,
        address: data.address,
        website: data.website,
        companyKind: data.companyKind,
        parentCompanyId: data.parentCompanyId,
      },
    });
    return toCompanySummary(company);
  },

  async updateContact(
    companyId: string,
    data: { pointOfContactName?: string | null; pointOfContactEmail?: string | null; website?: string; address?: string | null },
  ) {
    const company = await prisma.company.update({
      where: { id: companyId },
      data: {
        address: data.address,
        pointOfContactName: data.pointOfContactName,
        pointOfContactEmail: data.pointOfContactEmail,
        website: data.website,
      },
    });
    return toCompanySummary(company);
  },

  async updatePainTags(
    companyId: string,
    data: {
      currentPainTags?: string[];
      resolvedPainTags?: string[];
    },
  ) {
    const company = await prisma.company.update({
      where: { id: companyId },
      data: {
        currentPainTags: data.currentPainTags,
        resolvedPainTags: data.resolvedPainTags,
      },
    });

    return toCompanySummary(company);
  },
};
