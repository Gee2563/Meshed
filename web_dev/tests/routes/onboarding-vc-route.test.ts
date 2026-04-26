import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireCurrentUser: vi.fn(),
  saveVcSelection: vi.fn(),
}));

vi.mock("@/lib/server/current-user", () => ({
  requireCurrentUser: mocks.requireCurrentUser,
}));

vi.mock("@/lib/server/services/onboarding-service", () => ({
  onboardingService: {
    saveVcSelection: mocks.saveVcSelection,
  },
}));

describe("POST /api/onboarding/vc", () => {
  beforeEach(() => {
    mocks.requireCurrentUser.mockReset();
    mocks.saveVcSelection.mockReset();
    mocks.requireCurrentUser.mockResolvedValue({
      id: "usr_world",
      name: "George Morris",
      role: "operator",
    });
  });

  it("saves the VC selection for the current member", async () => {
    mocks.saveVcSelection.mockResolvedValue({
      nextStep: "socials",
    });

    const { POST } = await import("@/app/api/onboarding/vc/route");
    const response = await POST(
      new Request("http://localhost/api/onboarding/vc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedCompanyId: "known-a16z-crypto",
          companyName: null,
          website: "https://a16z.com",
          pointOfContactName: "Dana Partner",
          pointOfContactEmail: "dana@a16z.com",
          jobTitle: "Managing Director",
          memberCompanyName: "Acme AI",
          memberCompanyAddress: "123 Market St, San Francisco, CA",
        }),
      }),
    );

    expect(mocks.saveVcSelection).toHaveBeenCalledWith(
      { id: "usr_world", name: "George Morris", role: "operator" },
      expect.objectContaining({
        selectedCompanyId: "known-a16z-crypto",
        website: "https://a16z.com",
        jobTitle: "Managing Director",
        memberCompanyName: "Acme AI",
      }),
    );
    expect(response.status).toBe(200);
  });

  it("accepts listed VC selections without requiring point-of-contact details", async () => {
    mocks.saveVcSelection.mockResolvedValue({
      nextStep: "socials",
    });

    const { POST } = await import("@/app/api/onboarding/vc/route");
    const response = await POST(
      new Request("http://localhost/api/onboarding/vc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedCompanyId: "known-flexpoint-ford",
          companyName: null,
          website: "https://flexpointford.com",
          pointOfContactName: "",
          pointOfContactEmail: "",
          jobTitle: "",
          memberCompanyName: "Acme AI",
          memberCompanyAddress: "123 Market St, San Francisco, CA",
        }),
      }),
    );

    expect(mocks.saveVcSelection).toHaveBeenCalledWith(
      { id: "usr_world", name: "George Morris", role: "operator" },
      expect.objectContaining({
        selectedCompanyId: "known-flexpoint-ford",
        pointOfContactName: "",
        pointOfContactEmail: "",
      }),
    );
    expect(response.status).toBe(200);
  });
});
