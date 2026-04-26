import { describe, expect, it } from "vitest";

import { dedupeVcOptions, resolveCurrentStep } from "@/lib/server/services/onboarding-service";

describe("resolveCurrentStep", () => {
  it("dedupes listed VCs against manual DB entries for the same firm", () => {
    const options = dedupeVcOptions(
      [
        {
          id: "known-flexpoint-ford",
          scope: "flexpoint-ford",
          name: "Flexpoint Ford",
          website: "https://flexpointford.com",
          scopeLabel: "Flexpoint Ford",
        },
      ],
      [
        {
          id: "co_manual_flexpoint",
          name: "Flexpoint Ford",
          description: "Manual VC shell",
          sector: "venture capital",
          stage: "active",
          website: "https://Use https://flexpointford.com",
          ownerUserId: "usr_1",
          currentPainTags: [],
          resolvedPainTags: [],
          companyKind: "vc",
          parentCompanyId: null,
          outsideNetworkAccessEnabled: false,
          pointOfContactName: "Stephane Essamma",
          pointOfContactEmail: "stephane@example.com",
        },
      ],
    );

    expect(options).toHaveLength(1);
    expect(options[0]).toMatchObject({
      id: "known-flexpoint-ford",
      name: "Flexpoint Ford",
      source: "known",
    });
  });

  it("keeps the user on step 1 when the onboarding profile explicitly says vc_company", () => {
    const step = resolveCurrentStep({
      onboardingProfile: {
        id: "onb_1",
        userId: "usr_1",
        mode: "individual",
        title: "Investor",
        isExecutive: true,
        currentStep: "vc_company",
        vcCompanyId: "co_existing",
        companyId: null,
        portfolioCompanyId: null,
        executiveSignoffEmail: null,
        teamCsvUploadedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      socialConnections: [],
      latestNetworkJob: null,
      knownDashboardScope: "flexpoint-ford",
    });

    expect(step).toBe("vc_company");
  });

  it("moves to socials when the VC is chosen and no social graph is registered yet", () => {
    const step = resolveCurrentStep({
      onboardingProfile: {
        id: "onb_2",
        userId: "usr_2",
        mode: "individual",
        title: "Investor",
        isExecutive: true,
        currentStep: "socials",
        vcCompanyId: "co_existing",
        companyId: null,
        portfolioCompanyId: null,
        executiveSignoffEmail: null,
        teamCsvUploadedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      socialConnections: [],
      latestNetworkJob: null,
      knownDashboardScope: "flexpoint-ford",
    });

    expect(step).toBe("socials");
  });

  it("marks built-in VC networks as ready once the social graph step is complete", () => {
    const step = resolveCurrentStep({
      onboardingProfile: {
        id: "onb_3",
        userId: "usr_3",
        mode: "individual",
        title: "Investor",
        isExecutive: true,
        currentStep: "network_preparing",
        vcCompanyId: "co_existing",
        companyId: null,
        portfolioCompanyId: null,
        executiveSignoffEmail: null,
        teamCsvUploadedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      socialConnections: [
        { id: "1", userId: "usr_3", provider: "linkedin", status: "connected", accountLabel: "", metadata: null, createdAt: "", updatedAt: "" },
        { id: "2", userId: "usr_3", provider: "email", status: "connected", accountLabel: "", metadata: null, createdAt: "", updatedAt: "" },
        { id: "3", userId: "usr_3", provider: "slack", status: "skipped", accountLabel: "", metadata: null, createdAt: "", updatedAt: "" },
        { id: "4", userId: "usr_3", provider: "microsoft_teams", status: "skipped", accountLabel: "", metadata: null, createdAt: "", updatedAt: "" },
        { id: "5", userId: "usr_3", provider: "twitter", status: "skipped", accountLabel: "", metadata: null, createdAt: "", updatedAt: "" },
        { id: "6", userId: "usr_3", provider: "calendar", status: "skipped", accountLabel: "", metadata: null, createdAt: "", updatedAt: "" },
        { id: "7", userId: "usr_3", provider: "instagram", status: "skipped", accountLabel: "", metadata: null, createdAt: "", updatedAt: "" },
      ],
      latestNetworkJob: {
        id: "job_failed",
        userId: "usr_3",
        vcCompanyId: "co_existing",
        sourceWebsite: "https://flexpointford.com",
        status: "failed",
        statusMessage: "failed",
        outputPath: null,
        result: null,
        errorMessage: "missing bs4",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        startedAt: null,
        completedAt: null,
      },
      knownDashboardScope: "flexpoint-ford",
    });

    expect(step).toBe("ready");
  });
});
