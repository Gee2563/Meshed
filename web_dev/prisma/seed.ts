import { PrismaClient, Prisma, UserRole } from "@prisma/client";

import { calculateEngagementScore } from "@/lib/network/engagement";

const prisma = new PrismaClient();
const now = new Date("2026-03-30T09:00:00.000Z");

const userFixtures = [
  {
    id: "usr_company_maya",
    name: "Maya Sterling",
    email: "maya@northstar.vc",
    role: "COMPANY",
    bio: "Portfolio ops lead helping founders source operators and trusted advisors.",
    skills: ["fundraising", "go-to-market", "ops"],
    sectors: ["fintech", "saas"],
    linkedinUrl: "https://www.linkedin.com/in/maya-sterling-meshed",
    walletAddress: "0x1111111111111111111111111111111111111111",
    worldVerified: true,
    dynamicUserId: "dyn_maya",
    outsideNetworkAccessEnabled: true,
    lastActiveAt: now,
  },
  {
    id: "usr_consultant_nina",
    name: "Nina Volkov",
    email: "nina@northmesh.io",
    role: "CONSULTANT",
    bio: "Pricing and monetization consultant for Series A and B fintech teams.",
    skills: ["pricing", "ops", "revenue"],
    sectors: ["fintech", "payments"],
    linkedinUrl: "https://www.linkedin.com/in/nina-volkov-meshed",
    walletAddress: "0x2222222222222222222222222222222222222222",
    worldVerified: true,
    dynamicUserId: "dyn_nina",
    outsideNetworkAccessEnabled: true,
    lastActiveAt: now,
  },
  {
    id: "usr_mentor_theo",
    name: "Theo Mercer",
    email: "theo@orbitpartners.io",
    role: "MENTOR",
    bio: "Operator-mentor for go-to-market and portfolio growth systems.",
    skills: ["go-to-market", "pricing", "ops"],
    sectors: ["fintech", "saas"],
    linkedinUrl: "https://www.linkedin.com/in/theo-mercer-meshed",
    walletAddress: "0x3333333333333333333333333333333333333333",
    worldVerified: true,
    dynamicUserId: "dyn_theo",
    outsideNetworkAccessEnabled: true,
    lastActiveAt: now,
  },
  {
    id: "usr_operator_iris",
    name: "Iris Shaw",
    email: "iris@opsmesh.io",
    role: "OPERATOR",
    bio: "Fractional operator for onboarding, retention, and milestone delivery.",
    skills: ["ops", "onboarding", "retention"],
    sectors: ["saas", "healthtech"],
    linkedinUrl: "https://www.linkedin.com/in/iris-shaw-meshed",
    walletAddress: "0x4444444444444444444444444444444444444444",
    worldVerified: true,
    dynamicUserId: "dyn_iris",
    outsideNetworkAccessEnabled: false,
    lastActiveAt: now,
  },
  {
    id: "usr_investor_omar",
    name: "Omar Kelley",
    email: "omar@northstar.vc",
    role: "INVESTOR",
    bio: "Investor coordinating intros, specialist operators, and follow-on support.",
    skills: ["fundraising", "partnerships", "board-advisory"],
    sectors: ["fintech", "developer-tools"],
    linkedinUrl: "https://www.linkedin.com/in/omar-kelley-meshed",
    walletAddress: "0x6666666666666666666666666666666666666666",
    worldVerified: false,
    dynamicUserId: "dyn_omar",
    outsideNetworkAccessEnabled: true,
    lastActiveAt: new Date("2026-03-28T09:00:00.000Z"),
  },
  {
    id: "usr_admin_sam",
    name: "Sam Ortega",
    email: "sam@meshed.app",
    role: "ADMIN",
    bio: "Admin for demo workflows, verifications, and escrow release.",
    skills: ["operations", "compliance", "partnerships"],
    sectors: ["platform"],
    linkedinUrl: "https://www.linkedin.com/in/sam-ortega-meshed",
    walletAddress: "0x5555555555555555555555555555555555555555",
    worldVerified: true,
    dynamicUserId: "dyn_sam",
    outsideNetworkAccessEnabled: true,
    lastActiveAt: now,
  },
] as const;

const companies = [
  {
    id: "co_meshpay",
    name: "MeshPay",
    description: "Treasury and payments workflows for scaling portfolio companies.",
    sector: "fintech",
    stage: "Series A",
    website: "https://meshpay.example",
    ownerUserId: "usr_company_maya",
    currentPainTags: ["pricing", "ops_scaling"],
    resolvedPainTags: ["onboarding"],
    companyKind: "PORTFOLIO",
    parentCompanyId: null,
    outsideNetworkAccessEnabled: true,
  },
  {
    id: "co_orbitflow",
    name: "OrbitFlow",
    description: "Internal workflow software for portfolio operators and finance teams.",
    sector: "saas",
    stage: "Series B",
    website: "https://orbitflow.example",
    ownerUserId: "usr_company_maya",
    currentPainTags: ["go-to-market"],
    resolvedPainTags: ["pricing", "ops_scaling"],
    companyKind: "PORTFOLIO",
    parentCompanyId: null,
    outsideNetworkAccessEnabled: false,
  },
  {
    id: "co_signalstack",
    name: "SignalStack",
    description: "Developer-tooling startup with strong cross-company intro demand.",
    sector: "developer-tools",
    stage: "Growth",
    website: "https://signalstack.example",
    ownerUserId: "usr_company_maya",
    currentPainTags: ["security", "partnerships"],
    resolvedPainTags: ["go-to-market"],
    companyKind: "PORTFOLIO",
    parentCompanyId: null,
    outsideNetworkAccessEnabled: true,
  },
] as const;

const opportunities = [
  {
    id: "opp_growth_sprint",
    companyId: "co_meshpay",
    title: "Pricing and GTM sprint",
    description: "Need a consultant to redesign package structure and support founder narrative.",
    category: "CONSULTING",
    budgetLabel: "$6k fixed reward",
    status: "OPEN",
    requiredSkills: ["pricing", "go-to-market", "ops"],
    premium: true,
  },
  {
    id: "opp_operator_intro",
    companyId: "co_orbitflow",
    title: "Operator intro for onboarding metrics",
    description: "Looking for an operator to improve onboarding conversion and milestone tracking.",
    category: "MENTORSHIP",
    budgetLabel: "$4k milestone reward",
    status: "OPEN",
    requiredSkills: ["onboarding", "ops", "retention"],
    premium: false,
  },
  {
    id: "opp_partner_loop",
    companyId: "co_signalstack",
    title: "Partnership advisory loop",
    description: "Need advisory help to open portfolio partnerships and investor intros.",
    category: "ADVISORY",
    budgetLabel: "$5k + escrowed bonus",
    status: "IN_REVIEW",
    requiredSkills: ["partnerships", "board-advisory"],
    premium: false,
  },
] as const;

const applications = [
  {
    id: "app_nina_growth",
    opportunityId: "opp_growth_sprint",
    userId: "usr_consultant_nina",
    message: "I have led pricing overhauls for three fintech operators and can structure a 10-day sprint.",
    status: "ACCEPTED",
  },
  {
    id: "app_iris_operator",
    opportunityId: "opp_operator_intro",
    userId: "usr_operator_iris",
    message: "I can lead onboarding diagnostics and build a milestone dashboard for the team.",
    status: "ACCEPTED",
  },
  {
    id: "app_theo_partner",
    opportunityId: "opp_partner_loop",
    userId: "usr_mentor_theo",
    message: "I can mentor the team through a partnership motion and intro strategy.",
    status: "SHORTLISTED",
  },
] as const;

const collaborations = [
  {
    id: "col_meshpay_nina",
    userId: "usr_consultant_nina",
    companyId: "co_meshpay",
    opportunityId: "opp_growth_sprint",
    status: "COMPLETED",
    verified: true,
    milestoneCompletions: 2,
    completedAt: new Date("2026-03-18T10:00:00.000Z"),
  },
  {
    id: "col_orbit_iris",
    userId: "usr_operator_iris",
    companyId: "co_orbitflow",
    opportunityId: "opp_operator_intro",
    status: "ACTIVE",
    verified: true,
    milestoneCompletions: 1,
    completedAt: null,
  },
  {
    id: "col_signal_theo",
    userId: "usr_mentor_theo",
    companyId: "co_signalstack",
    opportunityId: "opp_partner_loop",
    status: "COMPLETED",
    verified: true,
    milestoneCompletions: 1,
    completedAt: new Date("2026-03-22T12:00:00.000Z"),
  },
] as const;

const milestones = [
  {
    id: "ms_meshpay_payment",
    opportunityId: "opp_growth_sprint",
    collaborationId: "col_meshpay_nina",
    title: "Pricing sprint delivery",
    description: "Release after payment completion is attested on Flare-style flow.",
    type: "PAYMENT",
    verificationMethod: "FLARE_PAYMENT_ATTESTATION",
    status: "VERIFIED",
    evidenceReference: "invoice://meshpay/0326",
    rewardAmount: 6000,
    escrowContractReference: "0xEscrowMeshpay",
    paymentVerified: true,
    crossChainVerified: false,
    externalKpiVerified: false,
    txHash: "0xpay123",
    attestationReference: "flare:mock:payment:ms_meshpay_payment",
    verifiedAt: new Date("2026-03-18T10:30:00.000Z"),
    submittedAt: new Date("2026-03-18T10:00:00.000Z"),
  },
  {
    id: "ms_orbit_external",
    opportunityId: "opp_operator_intro",
    collaborationId: "col_orbit_iris",
    title: "Onboarding KPI check",
    description: "Unlock after verified onboarding KPI event.",
    type: "EXTERNAL_EVENT",
    verificationMethod: "FLARE_EXTERNAL_DATA",
    status: "SUBMITTED",
    evidenceReference: "api://orbitflow/kpi/onboarding",
    rewardAmount: 4000,
    escrowContractReference: "0xEscrowOrbit",
    paymentVerified: false,
    crossChainVerified: false,
    externalKpiVerified: false,
    txHash: null,
    attestationReference: null,
    verifiedAt: null,
    submittedAt: new Date("2026-03-26T10:00:00.000Z"),
  },
  {
    id: "ms_signal_cross",
    opportunityId: "opp_partner_loop",
    collaborationId: "col_signal_theo",
    title: "Cross-chain partnership event",
    description: "Requires external chain event confirmation before release.",
    type: "CROSS_CHAIN_EVENT",
    verificationMethod: "FLARE_CROSS_CHAIN",
    status: "VERIFIED",
    evidenceReference: "bridge://signalstack/event/23",
    rewardAmount: 5000,
    escrowContractReference: "0xEscrowSignal",
    paymentVerified: false,
    crossChainVerified: true,
    externalKpiVerified: false,
    txHash: "0xcross123",
    attestationReference: "flare:mock:cross-chain:ms_signal_cross",
    verifiedAt: new Date("2026-03-22T12:05:00.000Z"),
    submittedAt: new Date("2026-03-22T11:50:00.000Z"),
  },
  {
    id: "ms_nina_engagement",
    opportunityId: null,
    collaborationId: "col_meshpay_nina",
    title: "Engagement threshold bonus",
    description: "Becomes releasable once consultant clears engagement threshold and World verification.",
    type: "ENGAGEMENT_THRESHOLD",
    verificationMethod: "ENGAGEMENT_RULE",
    status: "SUBMITTED",
    evidenceReference: "rule://engagement/nina",
    rewardAmount: 2500,
    escrowContractReference: "0xEscrowBonus",
    paymentVerified: false,
    crossChainVerified: false,
    externalKpiVerified: false,
    txHash: null,
    attestationReference: null,
    verifiedAt: null,
    submittedAt: new Date("2026-03-29T10:00:00.000Z"),
  },
] as const;

const rewardEscrows = [
  {
    id: "rew_meshpay_payment",
    milestoneId: "ms_meshpay_payment",
    payerWallet: "0x1111111111111111111111111111111111111111",
    recipientWallet: "0x2222222222222222222222222222222222222222",
    amount: 6000,
    tokenOrCurrency: "USDC",
    releaseStatus: "RELEASED",
    txHash: "0xrelease123",
    attestationReference: "flare:mock:payment:ms_meshpay_payment",
    contractReference: "0xEscrowMeshpay",
  },
  {
    id: "rew_orbit_external",
    milestoneId: "ms_orbit_external",
    payerWallet: "0x1111111111111111111111111111111111111111",
    recipientWallet: "0x4444444444444444444444444444444444444444",
    amount: 4000,
    tokenOrCurrency: "FLR",
    releaseStatus: "LOCKED",
    txHash: null,
    attestationReference: null,
    contractReference: "0xEscrowOrbit",
  },
  {
    id: "rew_signal_cross",
    milestoneId: "ms_signal_cross",
    payerWallet: "0x1111111111111111111111111111111111111111",
    recipientWallet: "0x3333333333333333333333333333333333333333",
    amount: 5000,
    tokenOrCurrency: "FLR",
    releaseStatus: "RELEASABLE",
    txHash: null,
    attestationReference: "flare:mock:cross-chain:ms_signal_cross",
    contractReference: "0xEscrowSignal",
  },
  {
    id: "rew_nina_bonus",
    milestoneId: "ms_nina_engagement",
    payerWallet: "0x1111111111111111111111111111111111111111",
    recipientWallet: "0x2222222222222222222222222222222222222222",
    amount: 2500,
    tokenOrCurrency: "USDC",
    releaseStatus: "LOCKED",
    txHash: null,
    attestationReference: null,
    contractReference: "0xEscrowBonus",
  },
] as const;

const engagements = [
  ["eng_1", "usr_consultant_nina", "usr_company_maya", "PROFILE_VIEW", 1],
  ["eng_2", "usr_consultant_nina", "usr_company_maya", "APPLICATION", 4],
  ["eng_3", "usr_consultant_nina", "usr_company_maya", "MESSAGE_REPLY", 4],
  ["eng_4", "usr_consultant_nina", "usr_company_maya", "MILESTONE_COMPLETION", 8],
  ["eng_5", "usr_consultant_nina", "usr_company_maya", "ENDORSEMENT", 5],
  ["eng_6", "usr_operator_iris", "usr_company_maya", "APPLICATION", 4],
  ["eng_7", "usr_operator_iris", "usr_company_maya", "COMPLETED_CALL", 5],
  ["eng_8", "usr_operator_iris", "usr_company_maya", "MILESTONE_COMPLETION", 7],
  ["eng_9", "usr_mentor_theo", "usr_company_maya", "ACCEPTED_INTRO", 4],
  ["eng_10", "usr_mentor_theo", "usr_company_maya", "COMPLETED_CALL", 4],
  ["eng_11", "usr_mentor_theo", "usr_company_maya", "ENDORSEMENT", 5],
] as const;

const connections = [
  ["conn_1", "usr_company_maya", "usr_mentor_theo", "CONSULTING", true, "MeshPay pricing sprint"],
  ["conn_2", "usr_company_maya", "usr_consultant_nina", "CONSULTING", true, "Verified pricing collaboration"],
  ["conn_3", "usr_company_maya", "usr_operator_iris", "INTRO", true, "OrbitFlow onboarding intro"],
  ["conn_4", "usr_investor_omar", "usr_mentor_theo", "INVESTMENT", true, "Portfolio mentor network"],
  ["conn_5", "usr_investor_omar", "usr_company_maya", "INVESTMENT", true, "Board support"],
  ["conn_6", "usr_consultant_nina", "usr_mentor_theo", "ENDORSEMENT", true, "Mutual portfolio endorsement"],
] as const;

const connectionRequests = [
  [
    "req_1",
    "usr_company_maya",
    "usr_consultant_nina",
    "CONSULTING",
    "Would love to formalize our pricing collaboration on Meshed and move the connection onto Flare.",
    new Date("2026-03-27T09:00:00.000Z"),
  ],
  [
    "req_2",
    "usr_company_maya",
    "usr_mentor_theo",
    "MENTORSHIP",
    "Can we activate a Meshed mentorship agreement so portfolio teams can reference our work together?",
    new Date("2026-03-27T09:15:00.000Z"),
  ],
  [
    "req_3",
    "usr_consultant_nina",
    "usr_mentor_theo",
    "CONSULTING",
    "I'd like to open a shared consulting thread on Meshed for the next fintech operator intro.",
    new Date("2026-03-27T09:30:00.000Z"),
  ],
  [
    "req_4",
    "usr_consultant_nina",
    "usr_operator_iris",
    "INTRO",
    "Want to connect directly on Meshed before we coordinate the onboarding workstream?",
    new Date("2026-03-27T09:45:00.000Z"),
  ],
  [
    "req_5",
    "usr_mentor_theo",
    "usr_operator_iris",
    "MENTORSHIP",
    "I can support the rollout if we turn this into a formal Meshed connection with a Flare contract.",
    new Date("2026-03-27T10:00:00.000Z"),
  ],
  [
    "req_6",
    "usr_mentor_theo",
    "usr_investor_omar",
    "INVESTMENT",
    "Let's formalize the investor-mentor loop on Meshed so the portfolio intros are contract-backed.",
    new Date("2026-03-27T10:15:00.000Z"),
  ],
  [
    "req_7",
    "usr_operator_iris",
    "usr_investor_omar",
    "INTRO",
    "I'm ready to connect directly on Meshed for the next onboarding and retention sprint.",
    new Date("2026-03-27T10:30:00.000Z"),
  ],
  [
    "req_8",
    "usr_operator_iris",
    "usr_admin_sam",
    "ENDORSEMENT",
    "Please connect with me on Meshed so we can track the operations handoff with a smart contract.",
    new Date("2026-03-27T10:45:00.000Z"),
  ],
  [
    "req_9",
    "usr_investor_omar",
    "usr_admin_sam",
    "INVESTMENT",
    "Can we set up a contract-backed Meshed connection for the next portfolio support workflow?",
    new Date("2026-03-27T11:00:00.000Z"),
  ],
  [
    "req_10",
    "usr_investor_omar",
    "usr_company_maya",
    "INVESTMENT",
    "Let's renew our Meshed connection on Flare so the board-support relationship is explicit onchain.",
    new Date("2026-03-27T11:15:00.000Z"),
  ],
  [
    "req_11",
    "usr_admin_sam",
    "usr_company_maya",
    "INTRO",
    "I'd like a direct Meshed connection with you for the next demo onboarding sequence.",
    new Date("2026-03-27T11:30:00.000Z"),
  ],
  [
    "req_12",
    "usr_admin_sam",
    "usr_consultant_nina",
    "ENDORSEMENT",
    "Can we open a Meshed connection so your demo consulting referrals are tied to a Flare agreement?",
    new Date("2026-03-27T11:45:00.000Z"),
  ],
] as const;

const companyMemberships = [
  ["mem_1", "co_meshpay", "usr_company_maya", "owner", "Portfolio lead"],
  ["mem_2", "co_meshpay", "usr_consultant_nina", "consultant", "Pricing advisor"],
  ["mem_3", "co_orbitflow", "usr_operator_iris", "operator", "Fractional operator"],
  ["mem_4", "co_signalstack", "usr_mentor_theo", "mentor", "Partnership mentor"],
  ["mem_5", "co_signalstack", "usr_investor_omar", "investor", "Investor sponsor"],
] as const;

const verificationRecords = [
  ["ver_1", "usr_consultant_nina", null, "WORLD_ID", "VERIFIED", "world:mock:nina"],
  ["ver_2", "usr_consultant_nina", null, "WALLET_LINK", "VERIFIED", "dynamic:mock:0x2222222222222222222222222222222222222222"],
  ["ver_3", null, "ms_meshpay_payment", "PAYMENT", "VERIFIED", "flare:mock:payment:ms_meshpay_payment"],
  ["ver_4", null, "ms_signal_cross", "CROSS_CHAIN", "VERIFIED", "flare:mock:cross-chain:ms_signal_cross"],
  ["ver_5", null, "ms_orbit_external", "EXTERNAL_KPI", "PENDING", "flare:mock:external:ms_orbit_external"],
] as const;

const onboardingProfiles = [
  {
    id: "onb_company_maya",
    userId: "usr_company_maya",
    companyId: "co_meshpay",
    vcCompanyId: null,
    portfolioCompanyId: "co_meshpay",
    mode: "COMPANY",
    title: "Portfolio lead",
    isExecutive: true,
    executiveSignoffEmail: null,
    currentStep: "COMPLETE",
    teamCsvUploadedAt: new Date("2026-03-20T10:00:00.000Z"),
  },
  {
    id: "onb_consultant_nina",
    userId: "usr_consultant_nina",
    companyId: null,
    vcCompanyId: null,
    portfolioCompanyId: null,
    mode: "INDIVIDUAL",
    title: "Pricing advisor",
    isExecutive: false,
    executiveSignoffEmail: null,
    currentStep: "COMPLETE",
    teamCsvUploadedAt: null,
  },
  {
    id: "onb_mentor_theo",
    userId: "usr_mentor_theo",
    companyId: null,
    vcCompanyId: null,
    portfolioCompanyId: null,
    mode: "INDIVIDUAL",
    title: "Mentor",
    isExecutive: false,
    executiveSignoffEmail: null,
    currentStep: "COMPLETE",
    teamCsvUploadedAt: null,
  },
  {
    id: "onb_operator_iris",
    userId: "usr_operator_iris",
    companyId: null,
    vcCompanyId: null,
    portfolioCompanyId: null,
    mode: "INDIVIDUAL",
    title: "Fractional operator",
    isExecutive: false,
    executiveSignoffEmail: null,
    currentStep: "COMPLETE",
    teamCsvUploadedAt: null,
  },
  {
    id: "onb_investor_omar",
    userId: "usr_investor_omar",
    companyId: null,
    vcCompanyId: null,
    portfolioCompanyId: null,
    mode: "INDIVIDUAL",
    title: "Investor",
    isExecutive: false,
    executiveSignoffEmail: null,
    currentStep: "COMPLETE",
    teamCsvUploadedAt: null,
  },
  {
    id: "onb_admin_sam",
    userId: "usr_admin_sam",
    companyId: null,
    vcCompanyId: null,
    portfolioCompanyId: null,
    mode: "INDIVIDUAL",
    title: "Admin",
    isExecutive: false,
    executiveSignoffEmail: null,
    currentStep: "COMPLETE",
    teamCsvUploadedAt: null,
  },
] as const;

const onboardingContracts = [
  {
    id: "con_seed_vc",
    userId: "usr_company_maya",
    companyId: "co_meshpay",
    contractStep: "VC_COMPANY_REGISTERED",
    contractName: "OnboardingStepAgreement",
    contractAddress: "0x6d65736865645f736565645f636f6e7472616374",
    network: "flare-coston2",
    generationMode: "MOCK",
    metadata: { entityName: "MeshPay", accessScope: "outside_network_enabled" },
  },
] as const;

function computeBadges(role: UserRole, scoreInput: Parameters<typeof calculateEngagementScore>[0]) {
  const engagement = calculateEngagementScore({
    ...scoreInput,
    role: role.toLowerCase() as Parameters<typeof calculateEngagementScore>[0]["role"],
  });

  const badges = [...engagement.badges];
  if (scoreInput.worldVerified) badges.push("world_verified");
  if (scoreInput.walletConnected) badges.push("wallet_connected");

  return {
    engagementScore: engagement.score,
    reliabilityScore: engagement.reliabilityScore,
    verificationBadges: [...new Set(badges)],
  };
}

async function main() {
  await prisma.verificationRecord.deleteMany();
  await prisma.onboardingContractArtifact.deleteMany();
  await prisma.onboardingProfile.deleteMany();
  await prisma.connectionRequest.deleteMany();
  await prisma.rewardEscrow.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.collaboration.deleteMany();
  await prisma.application.deleteMany();
  await prisma.opportunity.deleteMany();
  await prisma.companyMembership.deleteMany();
  await prisma.connection.deleteMany();
  await prisma.engagementRecord.deleteMany();
  await prisma.company.deleteMany();
  await prisma.user.deleteMany();

  for (const fixture of userFixtures) {
    const metrics = computeBadges(fixture.role, {
      profileCompleteness: fixture.role === "COMPANY" ? 88 : 94,
      replies: fixture.id === "usr_consultant_nina" ? 12 : fixture.id === "usr_mentor_theo" ? 10 : 6,
      acceptedApplications: fixture.id === "usr_consultant_nina" || fixture.id === "usr_operator_iris" ? 2 : 1,
      milestoneCompletions: fixture.id === "usr_consultant_nina" ? 3 : fixture.id === "usr_operator_iris" ? 1 : 1,
      successfulCollaborations: fixture.id === "usr_consultant_nina" ? 2 : fixture.id === "usr_mentor_theo" ? 1 : 0,
      endorsements: fixture.id === "usr_mentor_theo" ? 3 : fixture.id === "usr_consultant_nina" ? 4 : 1,
      worldVerified: fixture.worldVerified,
      walletConnected: Boolean(fixture.walletAddress),
      role: fixture.role.toLowerCase() as Parameters<typeof calculateEngagementScore>[0]["role"],
    });

    await prisma.user.create({
      data: {
        id: fixture.id,
        name: fixture.name,
        email: fixture.email,
        role: fixture.role,
        bio: fixture.bio,
        skills: [...fixture.skills],
        sectors: [...fixture.sectors],
        linkedinUrl: fixture.linkedinUrl,
        walletAddress: fixture.walletAddress,
        worldVerified: fixture.worldVerified,
        dynamicUserId: fixture.dynamicUserId,
        engagementScore: metrics.engagementScore,
        reliabilityScore: metrics.reliabilityScore,
        verificationBadges: metrics.verificationBadges,
        outsideNetworkAccessEnabled: fixture.outsideNetworkAccessEnabled,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        lastActiveAt: fixture.lastActiveAt,
      },
    });
  }

  await prisma.company.createMany({
    data: companies.map((company) => ({
      ...company,
      currentPainTags: [...company.currentPainTags],
      resolvedPainTags: [...company.resolvedPainTags],
    })),
  });
  await prisma.companyMembership.createMany({
    data: companyMemberships.map(([id, companyId, userId, relation, title]) => ({
      id,
      companyId,
      userId,
      relation,
      title,
    })),
  });
  await prisma.opportunity.createMany({
    data: opportunities.map((opportunity) => ({
      ...opportunity,
      requiredSkills: [...opportunity.requiredSkills],
    })),
  });
  await prisma.application.createMany({ data: applications.map((application) => ({ ...application })) });
  await prisma.collaboration.createMany({ data: collaborations.map((collaboration) => ({ ...collaboration })) });
  await prisma.milestone.createMany({ data: milestones.map((milestone) => ({ ...milestone })) });
  await prisma.rewardEscrow.createMany({ data: rewardEscrows.map((reward) => ({ ...reward })) });
  await prisma.engagementRecord.createMany({
    data: engagements.map(([id, sourceUserId, targetUserId, eventType, weight]) => ({
      id,
      sourceUserId,
      targetUserId,
      eventType,
      weight,
      timestamp: now,
    })),
  });
  await prisma.connection.createMany({
    data: connections.map(([id, sourceUserId, targetUserId, type, verified, note]) => ({
      id,
      sourceUserId,
      targetUserId,
      type,
      verified,
      note,
      createdAt: now,
    })),
  });
  await prisma.connectionRequest.createMany({
    data: connectionRequests.map(([id, requesterUserId, recipientUserId, type, message, createdAt]) => ({
      id,
      requesterUserId,
      recipientUserId,
      type,
      message,
      status: "PENDING",
      metadata: {
        seeded: true,
        source: "demo_connection_requests",
      } as Prisma.InputJsonValue,
      createdAt,
    })),
  });
  await prisma.verificationRecord.createMany({
    data: verificationRecords.map(([id, userId, milestoneId, type, status, providerRef]) => ({
      id,
      userId,
      milestoneId,
      type,
      status,
      providerRef,
      metadata: {},
    })),
  });
  await prisma.onboardingProfile.createMany({
    data: onboardingProfiles.map((profile) => ({ ...profile })),
  });
  await prisma.onboardingContractArtifact.createMany({
    data: onboardingContracts.map((contract) => ({ ...contract })),
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
