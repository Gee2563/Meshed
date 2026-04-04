// Shared domain types used across the app, server services, and tests.
export type UserRole =
  | "company"
  | "consultant"
  | "mentor"
  | "operator"
  | "investor"
  | "admin";

export type BadgeKey =
  | "world_verified"
  | "wallet_connected"
  | "payment_verified"
  | "cross_chain_verified"
  | "external_kpi_verified"
  | "rising_contributor"
  | "trusted_mentor"
  | "verified_operator"
  | "high_engagement_consultant";

export type OnboardingMode = "company" | "individual";

export type CompanyKind = "vc" | "portfolio" | "operating";

export type RegistrationFlowStep =
  | "vc_company"
  | "portfolio_company"
  | "company_access"
  | "individual_profile"
  | "complete";

export type OnboardingContractStep =
  | "vc_company_registered"
  | "portfolio_company_registered"
  | "company_access_registered"
  | "individual_profile_registered"
  | "world_verified";

export type ContractGenerationMode = "mock" | "real";
export type ConnectionRequestStatus = "pending" | "accepted" | "declined";

// Summary interfaces represent the stable, serialized shapes passed between layers.
export interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  bio: string;
  skills: string[];
  sectors: string[];
  linkedinUrl?: string | null;
  walletAddress?: string | null;
  worldVerified: boolean;
  dynamicUserId?: string | null;
  engagementScore: number;
  reliabilityScore: number;
  verificationBadges: BadgeKey[];
  outsideNetworkAccessEnabled?: boolean;
  lastActiveAt?: string | null;
  createdAt: string;
}

export interface CompanySummary {
  id: string;
  name: string;
  description: string;
  sector: string;
  stage: string;
  website: string;
  ownerUserId: string;
  currentPainTags: string[];
  resolvedPainTags: string[];
  companyKind?: CompanyKind;
  parentCompanyId?: string | null;
  outsideNetworkAccessEnabled?: boolean;
}

export interface ConnectionSummary {
  id: string;
  sourceUserId: string;
  targetUserId: string;
  type: "intro" | "consulting" | "mentorship" | "investment" | "endorsement";
  verified: boolean;
}

export interface ConnectionRequestSummary {
  id: string;
  requesterUserId: string;
  recipientUserId: string;
  requesterName: string;
  requesterRole: UserRole;
  requesterCompany: string | null;
  requesterContact: string;
  requesterLinkedinUrl?: string | null;
  type: ConnectionSummary["type"];
  status: ConnectionRequestStatus;
  message?: string | null;
  acceptedConnectionId?: string | null;
  contractAddress?: string | null;
  contractNetwork?: string | null;
  generationMode?: ContractGenerationMode | null;
  contractTxHash?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  respondedAt?: string | null;
}

// UI onboarding steps include wallet/world/team states that may span more than one persisted record.
export interface OnboardingStep {
  id:
    | "vc_company"
    | "portfolio_company"
    | "company_access"
    | "individual_profile"
    | "wallet"
    | "world"
    | "team";
  label: string;
  complete: boolean;
  detail: string;
}

export interface OnboardingContractArtifactSummary {
  id: string;
  userId: string;
  companyId?: string | null;
  contractStep: OnboardingContractStep;
  contractName: string;
  contractAddress: string;
  network: string;
  generationMode: ContractGenerationMode;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface OnboardingProfileSummary {
  id: string;
  userId: string;
  companyId?: string | null;
  vcCompanyId?: string | null;
  portfolioCompanyId?: string | null;
  mode: OnboardingMode;
  title: string;
  isExecutive: boolean;
  executiveSignoffEmail?: string | null;
  currentStep: RegistrationFlowStep;
  teamCsvUploadedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}
