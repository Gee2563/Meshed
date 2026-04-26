import { ethers } from "ethers";

import { opportunityAlertAbi } from "@/lib/contracts/opportunityAlertAbi";
import { portfolioRegistryAbi } from "@/lib/contracts/portfolioRegistryAbi";
import { relationshipRegistryAbi } from "@/lib/contracts/relationshipRegistryAbi";
import { env } from "@/lib/config/env";

export interface PortfolioRegistrationInput {
  investorAddress: string;
  companies: string[];
  founders: string[];
}

export interface RelationshipEventInput {
  entityA: string;
  entityB: string;
  relationshipType: string;
  investorAddresses?: string[];
}

export interface MeshingPortfolio {
  investorAddress: string;
  companies: string[];
  founders: string[];
  updatedAt: string;
}

export interface MeshingRelationshipRecord {
  relationshipId: string;
  entityA: string;
  entityB: string;
  relationshipType: string;
  timestamp: string;
  verified: boolean;
}

export interface MeshingAlert {
  id: string;
  investor: string;
  relationshipId: string;
  entityA: string;
  entityB: string;
  relationshipType: string;
  opportunityType: string;
  timestamp: string;
  source: "mock" | "chain";
}

export interface MeshingContractCallTrace {
  network: string;
  contractAddress: string;
  contract: "RelationshipRegistry" | "PortfolioRegistry" | "OpportunityAlert";
  method: string;
  args: unknown[];
  txHash: string | null;
  blockNumber: number | null;
}

export interface RecordRelationshipResult {
  relationship: MeshingRelationshipRecord;
  alerts: MeshingAlert[];
  contractCall: MeshingContractCallTrace;
}

export interface MeshingContractsService {
  registerPortfolio(input: PortfolioRegistrationInput): Promise<MeshingPortfolio>;
  getPortfolio(investorAddress: string): Promise<MeshingPortfolio | null>;
  listPortfolios(): Promise<MeshingPortfolio[]>;
  recordRelationship(input: RelationshipEventInput): Promise<RecordRelationshipResult>;
  getInvestorAlerts(investorAddress: string): Promise<MeshingAlert[]>;
  listRecentAlerts(limit: number): Promise<MeshingAlert[]>;
}

type MockPortfolio = MeshingPortfolio & {
  companyLookup: Set<string>;
  founderLookup: Set<string>;
};

const abiCoder = ethers.AbiCoder.defaultAbiCoder();
const mockPortfolios = new Map<string, MockPortfolio>();
const mockRelationships = new Map<string, MeshingRelationshipRecord>();
const mockAlerts: MeshingAlert[] = [];
const emittedAlertKeys = new Set<string>();

function cleanEntityList(values: string[]) {
  const deduped = new Set<string>();
  for (const value of values) {
    const normalized = value.trim();
    if (normalized) {
      deduped.add(normalized);
    }
  }
  return [...deduped];
}

function normalizeAddress(value: string) {
  return value.trim().toLowerCase();
}

function normalizePrivateKey(value: string) {
  const trimmed = value.trim();
  return trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
}

function normalizeEntity(value: string) {
  return value.trim().toLowerCase();
}

function relationshipIdFor(entityA: string, entityB: string, relationshipType: string) {
  return ethers.keccak256(
    abiCoder.encode(["string", "string", "string"], [entityA.trim(), entityB.trim(), relationshipType.trim()]),
  );
}

function assertNonEmpty(value: string, label: string) {
  if (!value.trim()) {
    throw new Error(`${label} is required.`);
  }
}

class MockMeshingContractsService implements MeshingContractsService {
  async registerPortfolio(input: PortfolioRegistrationInput): Promise<MeshingPortfolio> {
    assertNonEmpty(input.investorAddress, "Investor address");

    const companies = cleanEntityList(input.companies);
    const founders = cleanEntityList(input.founders);
    const now = new Date().toISOString();
    const investorAddress = normalizeAddress(input.investorAddress);

    const portfolio: MockPortfolio = {
      investorAddress,
      companies,
      founders,
      updatedAt: now,
      companyLookup: new Set(companies.map(normalizeEntity)),
      founderLookup: new Set(founders.map(normalizeEntity)),
    };

    mockPortfolios.set(investorAddress, portfolio);
    return {
      investorAddress: portfolio.investorAddress,
      companies: [...portfolio.companies],
      founders: [...portfolio.founders],
      updatedAt: portfolio.updatedAt,
    };
  }

  async getPortfolio(investorAddress: string): Promise<MeshingPortfolio | null> {
    const portfolio = mockPortfolios.get(normalizeAddress(investorAddress));
    if (!portfolio) {
      return null;
    }

    return {
      investorAddress: portfolio.investorAddress,
      companies: [...portfolio.companies],
      founders: [...portfolio.founders],
      updatedAt: portfolio.updatedAt,
    };
  }

  async listPortfolios(): Promise<MeshingPortfolio[]> {
    return [...mockPortfolios.values()].map((portfolio) => ({
      investorAddress: portfolio.investorAddress,
      companies: [...portfolio.companies],
      founders: [...portfolio.founders],
      updatedAt: portfolio.updatedAt,
    }));
  }

  async recordRelationship(input: RelationshipEventInput): Promise<RecordRelationshipResult> {
    assertNonEmpty(input.entityA, "Entity A");
    assertNonEmpty(input.entityB, "Entity B");
    assertNonEmpty(input.relationshipType, "Relationship type");

    const entityA = input.entityA.trim();
    const entityB = input.entityB.trim();
    const relationshipType = input.relationshipType.trim();
    const relationshipId = relationshipIdFor(entityA, entityB, relationshipType);
    const now = new Date().toISOString();

    const relationship: MeshingRelationshipRecord = {
      relationshipId,
      entityA,
      entityB,
      relationshipType,
      timestamp: now,
      verified: true,
    };
    mockRelationships.set(relationshipId, relationship);

    const investorsToCheck =
      input.investorAddresses && input.investorAddresses.length > 0
        ? [...new Set(input.investorAddresses.map(normalizeAddress))]
        : [...mockPortfolios.keys()];

    const entityANormalized = normalizeEntity(entityA);
    const entityBNormalized = normalizeEntity(entityB);
    const alerts: MeshingAlert[] = [];

    for (const investor of investorsToCheck) {
      const portfolio = mockPortfolios.get(investor);
      if (!portfolio) {
        continue;
      }

      const entityAInPortfolio =
        portfolio.companyLookup.has(entityANormalized) || portfolio.founderLookup.has(entityANormalized);
      const entityBInPortfolio =
        portfolio.companyLookup.has(entityBNormalized) || portfolio.founderLookup.has(entityBNormalized);
      if (!entityAInPortfolio || !entityBInPortfolio) {
        continue;
      }

      const dedupeKey = `${relationshipId}:${investor}`;
      if (emittedAlertKeys.has(dedupeKey)) {
        continue;
      }

      const alert: MeshingAlert = {
        id: `mock_alert_${mockAlerts.length}`,
        investor,
        relationshipId,
        entityA,
        entityB,
        relationshipType,
        opportunityType: "PORTFOLIO_CROSSOVER",
        timestamp: now,
        source: "mock",
      };

      emittedAlertKeys.add(dedupeKey);
      mockAlerts.push(alert);
      alerts.push(alert);
    }

    return {
      relationship,
      alerts,
      contractCall: {
        network: "mock-local",
        contractAddress: "mock://relationship-registry",
        contract: "RelationshipRegistry",
        method: "recordRelationship",
        args: [entityA, entityB, relationshipType],
        txHash: null,
        blockNumber: null,
      },
    };
  }

  async getInvestorAlerts(investorAddress: string): Promise<MeshingAlert[]> {
    const investor = normalizeAddress(investorAddress);
    return [...mockAlerts]
      .filter((alert) => alert.investor === investor)
      .sort((left, right) => (left.timestamp < right.timestamp ? 1 : -1));
  }

  async listRecentAlerts(limit: number): Promise<MeshingAlert[]> {
    return [...mockAlerts]
      .sort((left, right) => (left.timestamp < right.timestamp ? 1 : -1))
      .slice(0, Math.max(limit, 0));
  }
}

type RealMeshingConfig = {
  rpcUrl: string;
  privateKey: string;
  relationshipRegistryAddress: string;
  portfolioRegistryAddress: string;
  opportunityAlertAddress: string;
};

class RealMeshingContractsService implements MeshingContractsService {
  private readonly signer: ethers.Wallet;
  private readonly relationshipRegistry: ethers.Contract;
  private readonly portfolioRegistry: ethers.Contract;
  private readonly opportunityAlert: ethers.Contract;
  private readonly relationshipRegistryAddress: string;
  private readonly network: string;

  constructor(config: RealMeshingConfig) {
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.signer = new ethers.Wallet(normalizePrivateKey(config.privateKey), provider);
    this.relationshipRegistryAddress = config.relationshipRegistryAddress;
    this.network = "flare-coston2";
    this.relationshipRegistry = new ethers.Contract(
      config.relationshipRegistryAddress,
      relationshipRegistryAbi,
      this.signer,
    );
    this.portfolioRegistry = new ethers.Contract(config.portfolioRegistryAddress, portfolioRegistryAbi, this.signer);
    this.opportunityAlert = new ethers.Contract(config.opportunityAlertAddress, opportunityAlertAbi, this.signer);
  }

  async registerPortfolio(input: PortfolioRegistrationInput): Promise<MeshingPortfolio> {
    const investorAddress = normalizeAddress(input.investorAddress);
    const signerAddress = normalizeAddress(await this.signer.getAddress());
    if (investorAddress !== signerAddress) {
      throw new Error("Investor address must match the backend signer for on-chain writes.");
    }

    const companies = cleanEntityList(input.companies);
    const founders = cleanEntityList(input.founders);
    const tx = await this.portfolioRegistry.registerPortfolio(companies, founders);
    await tx.wait();

    return {
      investorAddress,
      companies,
      founders,
      updatedAt: new Date().toISOString(),
    };
  }

  async getPortfolio(investorAddress: string): Promise<MeshingPortfolio | null> {
    const investor = normalizeAddress(investorAddress);
    const [companies, founders] = await Promise.all([
      this.portfolioRegistry.getCompanies(investor),
      this.portfolioRegistry.getFounders(investor),
    ]);

    const cleanCompanies = cleanEntityList(companies);
    const cleanFounders = cleanEntityList(founders);
    if (cleanCompanies.length === 0 && cleanFounders.length === 0) {
      return null;
    }

    return {
      investorAddress: investor,
      companies: cleanCompanies,
      founders: cleanFounders,
      updatedAt: new Date().toISOString(),
    };
  }

  async listPortfolios(): Promise<MeshingPortfolio[]> {
    return [];
  }

  async recordRelationship(input: RelationshipEventInput): Promise<RecordRelationshipResult> {
    assertNonEmpty(input.entityA, "Entity A");
    assertNonEmpty(input.entityB, "Entity B");
    assertNonEmpty(input.relationshipType, "Relationship type");

    const entityA = input.entityA.trim();
    const entityB = input.entityB.trim();
    const relationshipType = input.relationshipType.trim();

    const tx = await this.relationshipRegistry.recordRelationship(entityA, entityB, relationshipType);
    const receipt = await tx.wait();

    const relationshipId = await this.relationshipRegistry.relationshipIdFor(entityA, entityB, relationshipType);
    const relationship: MeshingRelationshipRecord = {
      relationshipId,
      entityA,
      entityB,
      relationshipType,
      timestamp: new Date().toISOString(),
      verified: true,
    };

    const alerts: MeshingAlert[] = [];
    const investorsToCheck =
      input.investorAddresses && input.investorAddresses.length > 0
        ? [...new Set(input.investorAddresses.map(normalizeAddress))]
        : [];

    for (const investor of investorsToCheck) {
      const shouldCreate = await this.opportunityAlert.checkForOpportunity.staticCall(
        investor,
        entityA,
        entityB,
        relationshipType,
      );
      if (!shouldCreate) {
        continue;
      }

      const createTx = await this.opportunityAlert.checkForOpportunity(investor, entityA, entityB, relationshipType);
      await createTx.wait();

      const alertIds = (await this.opportunityAlert.getInvestorAlerts(investor)) as bigint[];
      const latestAlertId = alertIds[alertIds.length - 1];
      const rawAlert = await this.opportunityAlert.getAlert(latestAlertId);
      alerts.push({
        id: `chain_alert_${latestAlertId.toString()}`,
        investor,
        relationshipId: rawAlert.relationshipId,
        entityA: rawAlert.entityA,
        entityB: rawAlert.entityB,
        relationshipType: rawAlert.relationshipType,
        opportunityType: rawAlert.opportunityType,
        timestamp: new Date(Number(rawAlert.timestamp) * 1000).toISOString(),
        source: "chain",
      });
    }

    return {
      relationship,
      alerts,
      contractCall: {
        network: this.network,
        contractAddress: this.relationshipRegistryAddress,
        contract: "RelationshipRegistry",
        method: "recordRelationship",
        args: [entityA, entityB, relationshipType],
        txHash: tx.hash,
        blockNumber: receipt ? Number(receipt.blockNumber) : null,
      },
    };
  }

  async getInvestorAlerts(investorAddress: string): Promise<MeshingAlert[]> {
    const investor = normalizeAddress(investorAddress);
    const alertIds = (await this.opportunityAlert.getInvestorAlerts(investor)) as bigint[];
    const alerts: MeshingAlert[] = [];

    for (const alertId of alertIds) {
      const rawAlert = await this.opportunityAlert.getAlert(alertId);
      alerts.push({
        id: `chain_alert_${alertId.toString()}`,
        investor,
        relationshipId: rawAlert.relationshipId,
        entityA: rawAlert.entityA,
        entityB: rawAlert.entityB,
        relationshipType: rawAlert.relationshipType,
        opportunityType: rawAlert.opportunityType,
        timestamp: new Date(Number(rawAlert.timestamp) * 1000).toISOString(),
        source: "chain",
      });
    }

    return alerts.sort((left, right) => (left.timestamp < right.timestamp ? 1 : -1));
  }

  async listRecentAlerts(_limit: number): Promise<MeshingAlert[]> {
    return [];
  }
}

export function getRealMeshingConfig(): RealMeshingConfig | null {
  const required = {
    rpcUrl: env.FLARE_RPC_URL,
    privateKey: env.PRIVATE_KEY,
    relationshipRegistryAddress: env.RELATIONSHIP_REGISTRY_ADDRESS,
    portfolioRegistryAddress: env.PORTFOLIO_REGISTRY_ADDRESS,
    opportunityAlertAddress: env.OPPORTUNITY_ALERT_ADDRESS,
  };

  if (
    !required.rpcUrl ||
    !required.privateKey ||
    !required.relationshipRegistryAddress ||
    !required.portfolioRegistryAddress ||
    !required.opportunityAlertAddress
  ) {
    return null;
  }

  if (
    !ethers.isAddress(required.relationshipRegistryAddress) ||
    !ethers.isAddress(required.portfolioRegistryAddress) ||
    !ethers.isAddress(required.opportunityAlertAddress)
  ) {
    return null;
  }

  return {
    rpcUrl: required.rpcUrl,
    privateKey: required.privateKey,
    relationshipRegistryAddress: required.relationshipRegistryAddress,
    portfolioRegistryAddress: required.portfolioRegistryAddress,
    opportunityAlertAddress: required.opportunityAlertAddress,
  };
}

export function isRealMeshingEnabled() {
  return !env.USE_MOCK_MESHING && Boolean(getRealMeshingConfig());
}

let meshingContractsService: MeshingContractsService | null = null;

export function getMeshingContractsService() {
  if (meshingContractsService) {
    return meshingContractsService;
  }

  const realConfig = getRealMeshingConfig();
  if (!env.USE_MOCK_MESHING) {
    if (!realConfig) {
      throw new Error(
        "Real meshing mode is enabled but contract configuration is incomplete. Provide FLARE_RPC_URL, PRIVATE_KEY, RELATIONSHIP_REGISTRY_ADDRESS, PORTFOLIO_REGISTRY_ADDRESS, and OPPORTUNITY_ALERT_ADDRESS.",
      );
    }
    meshingContractsService = new RealMeshingContractsService(realConfig);
    return meshingContractsService;
  }

  meshingContractsService = new MockMeshingContractsService();
  return meshingContractsService;
}
