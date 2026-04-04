import { beforeEach, describe, expect, it, vi } from "vitest";

describe("meshing contract service mock flow", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("records a relationship and emits a portfolio crossover alert when both entities are tracked", async () => {
    const { getMeshingContractsService } = await import("@/lib/server/services/meshing-contract-service");
    const service = getMeshingContractsService();
    const suffix = Date.now().toString();
    const investor = `investor_${suffix}`;
    const companyA = `Clear Current ${suffix}`;
    const companyB = `Hyalto ${suffix}`;

    await service.registerPortfolio({
      investorAddress: investor,
      companies: [companyA, companyB],
      founders: [],
    });

    const result = await service.recordRelationship({
      entityA: companyA,
      entityB: companyB,
      relationshipType: "CONNECTED_TO",
      investorAddresses: [investor],
    });

    expect(result.relationship.verified).toBe(true);
    expect(result.alerts).toHaveLength(1);
    expect(result.alerts[0]?.investor).toBe(investor);
  });
});
