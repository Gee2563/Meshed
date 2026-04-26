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
  | "socials"
  | "network_preparing"
  | "ready"
  | "complete";

export type OnboardingContractStep =
  | "vc_company_registered"
  | "portfolio_company_registered"
  | "company_access_registered"
  | "individual_profile_registered"
  | "world_verified";

export type ContractGenerationMode = "mock" | "real";
export type ConnectionRequestStatus = "pending" | "accepted" | "declined";
export type VerifiedInteractionType =
  | "MATCH_SUGGESTED"
  | "INTRO_REQUESTED"
  | "INTRO_ACCEPTED"
  | "COLLABORATION_STARTED"
  | "COLLABORATION_COMPLETED"
  | "REWARD_EARNED"
  | "REWARD_DISTRIBUTED";

export type RewardStatus =
  | "NOT_REWARDABLE"
  | "REWARDABLE"
  | "EARNED"
  | "DISTRIBUTED";

export type SocialProvider =
  | "linkedin"
  | "email"
  | "slack"
  | "microsoft_teams"
  | "twitter"
  | "calendar"
  | "instagram";

export type SocialConnectionStatus = "connected" | "skipped";

export type NetworkPreparationStatus = "queued" | "running" | "ready" | "failed";
export type AgentNotificationKind = "pain_point_match" | "social_signal" | "coordination_prompt";
export type AgentNotificationSource = "meshed_graph" | "linkedin_signal" | "external_social";
export type AgentNotificationStatus = "unread" | "read" | "acted_on" | "dismissed";

export type FounderAgentActionType =
  | "QUEUE_OUTREACH"
  | "DRAFT_FOUNDER_BRIEF"
  | "REVIEW_VERIFIED_INTERACTIONS"
  | "OPEN_NETWORK_ENTITY";

export type FounderAgentActionTargetKind = "person" | "partner" | "company";

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
  address?: string | null;
  pointOfContactName?: string | null;
  pointOfContactEmail?: string | null;
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

export interface UserSocialConnectionSummary {
  id: string;
  userId: string;
  provider: SocialProvider;
  status: SocialConnectionStatus;
  accountLabel?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface NetworkPreparationJobSummary {
  id: string;
  userId: string;
  vcCompanyId?: string | null;
  sourceWebsite: string;
  status: NetworkPreparationStatus;
  statusMessage?: string | null;
  outputPath?: string | null;
  result?: Record<string, unknown> | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
}

export interface AgentNotificationSummary {
  id: string;
  userId: string;
  kind: AgentNotificationKind;
  source: AgentNotificationSource;
  status: AgentNotificationStatus;
  title: string;
  body: string;
  targetUserId?: string | null;
  targetCompanyId?: string | null;
  metadata?: Record<string, unknown> | null;
  agentActions: FounderAgentAction[];
  createdAt: string;
  updatedAt: string;
}

export interface VerifiedInteractionSummary {
  id: string;
  interactionType: VerifiedInteractionType;
  actorUserId: string;
  targetUserId?: string | null;
  authorizedByUserId?: string | null;
  companyId?: string | null;
  painPointTag?: string | null;
  matchScore?: number | null;
  verified: boolean;
  actorWorldVerified: boolean;
  actorWorldNullifier?: string | null;
  actorVerificationLevel?: string | null;
  targetWorldVerified?: boolean | null;
  targetWorldNullifier?: string | null;
  targetVerificationLevel?: string | null;
  rewardStatus: RewardStatus;
  transactionHash?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface FounderAgentActionTarget {
  kind: FounderAgentActionTargetKind;
  personId?: string | null;
  personName?: string | null;
  partnerId?: string | null;
  partnerName?: string | null;
  companyId?: string | null;
  companyName?: string | null;
}

export interface FounderAgentAction {
  id: string;
  label: string;
  actionType: FounderAgentActionType;
  description?: string | null;
  targets: FounderAgentActionTarget[];
}
