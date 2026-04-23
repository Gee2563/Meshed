import { PrismaClient, UserRole, ConnectionType } from "@prisma/client";

const prisma = new PrismaClient();
const now = new Date("2026-04-22T09:00:00.000Z");

type SeedUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  bio: string;
  skills: string[];
  sectors: string[];
  linkedinUrl: string;
  walletAddress: string;
  worldVerified: boolean;
  dynamicUserId: string;
  outsideNetworkAccessEnabled: boolean;
  lastActiveAt: Date;
};

function buildUserMetrics(user: SeedUser) {
  let engagementScore = 40;
  engagementScore += Math.min(user.skills.length, 4) * 8;
  engagementScore += Math.min(user.sectors.length, 3) * 5;
  if (user.worldVerified) engagementScore += 10;
  if (user.walletAddress) engagementScore += 10;
  if (user.outsideNetworkAccessEnabled) engagementScore += 6;
  if (user.role === UserRole.MENTOR || user.role === UserRole.CONSULTANT || user.role === UserRole.INVESTOR) {
    engagementScore += 8;
  }

  const reliabilityScore = Math.min(
    100,
    55 + (user.worldVerified ? 15 : 0) + (user.walletAddress ? 10 : 0) + (user.outsideNetworkAccessEnabled ? 8 : 0),
  );

  const verificationBadges = [
    ...(user.worldVerified ? ["world_verified"] : []),
    ...(user.walletAddress ? ["wallet_connected"] : []),
    ...(user.outsideNetworkAccessEnabled ? ["outside_network"] : []),
  ];

  return {
    engagementScore: Math.min(engagementScore, 100),
    reliabilityScore,
    verificationBadges,
  };
}

const users: SeedUser[] = [
  {
    id: "usr_george_demo",
    name: "George Daniels",
    email: "georgegds92@gmail.com",
    role: UserRole.INVESTOR,
    bio: "Flexpoint Ford operator focused on portfolio support, founder intros, and verified relationship workflows.",
    skills: ["portfolio-ops", "partnerships", "introductions"],
    sectors: ["fintech", "enterprise", "ai"],
    linkedinUrl: "https://www.linkedin.com/in/george-daniels-meshed",
    walletAddress: "0x1000000000000000000000000000000000000001",
    worldVerified: true,
    dynamicUserId: "dyn_george_demo",
    outsideNetworkAccessEnabled: true,
    lastActiveAt: now,
  },
  {
    id: "usr_consultant_nina",
    name: "Nina Volkov",
    email: "nina@northmesh.io",
    role: UserRole.CONSULTANT,
    bio: "Pricing and monetization consultant for Series A and B fintech teams.",
    skills: ["pricing", "ops", "revenue"],
    sectors: ["fintech", "payments"],
    linkedinUrl: "https://www.linkedin.com/in/nina-volkov-meshed",
    walletAddress: "0x2000000000000000000000000000000000000002",
    worldVerified: true,
    dynamicUserId: "dyn_nina",
    outsideNetworkAccessEnabled: true,
    lastActiveAt: new Date("2026-04-21T18:00:00.000Z"),
  },
  {
    id: "usr_mentor_theo",
    name: "Theo Mercer",
    email: "theo@orbitpartners.io",
    role: UserRole.MENTOR,
    bio: "Operator-mentor for go-to-market and portfolio growth systems.",
    skills: ["go-to-market", "pricing", "ops"],
    sectors: ["fintech", "saas"],
    linkedinUrl: "https://www.linkedin.com/in/theo-mercer-meshed",
    walletAddress: "0x3000000000000000000000000000000000000003",
    worldVerified: true,
    dynamicUserId: "dyn_theo",
    outsideNetworkAccessEnabled: true,
    lastActiveAt: new Date("2026-04-21T16:30:00.000Z"),
  },
  {
    id: "usr_operator_iris",
    name: "Iris Shaw",
    email: "iris@opsmesh.io",
    role: UserRole.OPERATOR,
    bio: "Fractional operator for onboarding, retention, and milestone delivery.",
    skills: ["ops", "onboarding", "retention"],
    sectors: ["saas", "healthtech"],
    linkedinUrl: "https://www.linkedin.com/in/iris-shaw-meshed",
    walletAddress: "0x4000000000000000000000000000000000000004",
    worldVerified: true,
    dynamicUserId: "dyn_iris",
    outsideNetworkAccessEnabled: false,
    lastActiveAt: new Date("2026-04-20T15:15:00.000Z"),
  },
  {
    id: "usr_investor_omar",
    name: "Omar Kelley",
    email: "omar@northstar.vc",
    role: UserRole.INVESTOR,
    bio: "Investor coordinating intros, specialist operators, and follow-on support.",
    skills: ["fundraising", "partnerships", "board-advisory"],
    sectors: ["fintech", "developer-tools"],
    linkedinUrl: "https://www.linkedin.com/in/omar-kelley-meshed",
    walletAddress: "0x5000000000000000000000000000000000000005",
    worldVerified: true,
    dynamicUserId: "dyn_omar",
    outsideNetworkAccessEnabled: true,
    lastActiveAt: new Date("2026-04-19T10:00:00.000Z"),
  },
  {
    id: "usr_consultant_lena",
    name: "Lena Brooks",
    email: "lena@signaladvisory.io",
    role: UserRole.CONSULTANT,
    bio: "Growth consultant helping portfolio companies tighten onboarding and pricing systems.",
    skills: ["growth", "pricing", "onboarding"],
    sectors: ["saas", "fintech"],
    linkedinUrl: "https://www.linkedin.com/in/lena-brooks-meshed",
    walletAddress: "0x6000000000000000000000000000000000000006",
    worldVerified: true,
    dynamicUserId: "dyn_lena",
    outsideNetworkAccessEnabled: true,
    lastActiveAt: new Date("2026-04-20T12:45:00.000Z"),
  },
  {
    id: "usr_mentor_priya",
    name: "Priya Desai",
    email: "priya@founderloops.io",
    role: UserRole.MENTOR,
    bio: "Founder coach and network mentor for enterprise pilots and commercial strategy.",
    skills: ["enterprise-sales", "mentoring", "strategy"],
    sectors: ["enterprise", "ai"],
    linkedinUrl: "https://www.linkedin.com/in/priya-desai-meshed",
    walletAddress: "0x7000000000000000000000000000000000000007",
    worldVerified: true,
    dynamicUserId: "dyn_priya",
    outsideNetworkAccessEnabled: true,
    lastActiveAt: new Date("2026-04-18T11:30:00.000Z"),
  },
  {
    id: "usr_operator_marcus",
    name: "Marcus Hale",
    email: "marcus@stackoperators.io",
    role: UserRole.OPERATOR,
    bio: "Embedded operator for portfolio onboarding, lifecycle reporting, and execution rhythms.",
    skills: ["operations", "analytics", "reporting"],
    sectors: ["enterprise", "fintech"],
    linkedinUrl: "https://www.linkedin.com/in/marcus-hale-meshed",
    walletAddress: "0x8000000000000000000000000000000000000008",
    worldVerified: true,
    dynamicUserId: "dyn_marcus",
    outsideNetworkAccessEnabled: false,
    lastActiveAt: new Date("2026-04-17T13:00:00.000Z"),
  },
  {
    id: "usr_investor_julian",
    name: "Julian Park",
    email: "julian@ridgecapital.io",
    role: UserRole.INVESTOR,
    bio: "Investor focused on co-investor coordination and strategic partner introductions.",
    skills: ["investing", "introductions", "partnerships"],
    sectors: ["ai", "developer-tools"],
    linkedinUrl: "https://www.linkedin.com/in/julian-park-meshed",
    walletAddress: "0x9000000000000000000000000000000000000009",
    worldVerified: true,
    dynamicUserId: "dyn_julian",
    outsideNetworkAccessEnabled: true,
    lastActiveAt: new Date("2026-04-16T09:30:00.000Z"),
  },
  {
    id: "usr_company_maya",
    name: "Maya Sterling",
    email: "maya@northstar.vc",
    role: UserRole.COMPANY,
    bio: "Portfolio ops lead helping founders source operators and trusted advisors.",
    skills: ["fundraising", "go-to-market", "ops"],
    sectors: ["fintech", "saas"],
    linkedinUrl: "https://www.linkedin.com/in/maya-sterling-meshed",
    walletAddress: "0xa00000000000000000000000000000000000000a",
    worldVerified: true,
    dynamicUserId: "dyn_maya",
    outsideNetworkAccessEnabled: true,
    lastActiveAt: new Date("2026-04-21T09:00:00.000Z"),
  },
  {
    id: "usr_admin_sam",
    name: "Sam Ortega",
    email: "sam@meshed.app",
    role: UserRole.ADMIN,
    bio: "Admin for demo workflows, verifications, and relationship orchestration.",
    skills: ["operations", "compliance", "partnerships"],
    sectors: ["platform"],
    linkedinUrl: "https://www.linkedin.com/in/sam-ortega-meshed",
    walletAddress: "0xb00000000000000000000000000000000000000b",
    worldVerified: true,
    dynamicUserId: "dyn_sam",
    outsideNetworkAccessEnabled: true,
    lastActiveAt: new Date("2026-04-21T08:15:00.000Z"),
  },
];

const companies = [
  {
    id: "co_flexpoint_ford",
    name: "Flexpoint Ford",
    description: "Growth equity and portfolio support network seeded for the Meshed dashboard demo.",
    sector: "private-equity",
    stage: "Fund",
    website: "https://flexpointford.com",
    ownerUserId: "usr_george_demo",
    currentPainTags: ["portfolio-support", "cross-portfolio-intros"],
    resolvedPainTags: ["verification", "workflow-visibility"],
    companyKind: "VC" as const,
    outsideNetworkAccessEnabled: true,
  },
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
    companyKind: "PORTFOLIO" as const,
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
    companyKind: "PORTFOLIO" as const,
    outsideNetworkAccessEnabled: false,
  },
  {
    id: "co_signalstack",
    name: "SignalStack",
    description: "Developer tooling startup with strong cross-company intro demand.",
    sector: "developer-tools",
    stage: "Growth",
    website: "https://signalstack.example",
    ownerUserId: "usr_company_maya",
    currentPainTags: ["security", "partnerships"],
    resolvedPainTags: ["go-to-market"],
    companyKind: "PORTFOLIO" as const,
    outsideNetworkAccessEnabled: true,
  },
];

const memberships = [
  {
    id: "mem_george_flexpoint",
    companyId: "co_flexpoint_ford",
    userId: "usr_george_demo",
    relation: "partner",
    title: "Principal",
  },
  {
    id: "mem_nina_meshpay",
    companyId: "co_meshpay",
    userId: "usr_consultant_nina",
    relation: "advisor",
    title: "Pricing Advisor",
  },
  {
    id: "mem_theo_orbitflow",
    companyId: "co_orbitflow",
    userId: "usr_mentor_theo",
    relation: "mentor",
    title: "Growth Mentor",
  },
  {
    id: "mem_iris_orbitflow",
    companyId: "co_orbitflow",
    userId: "usr_operator_iris",
    relation: "operator",
    title: "Fractional Operator",
  },
  {
    id: "mem_omar_signalstack",
    companyId: "co_signalstack",
    userId: "usr_investor_omar",
    relation: "investor",
    title: "Board Observer",
  },
  {
    id: "mem_lena_meshpay",
    companyId: "co_meshpay",
    userId: "usr_consultant_lena",
    relation: "advisor",
    title: "Growth Consultant",
  },
  {
    id: "mem_priya_signalstack",
    companyId: "co_signalstack",
    userId: "usr_mentor_priya",
    relation: "mentor",
    title: "Commercial Mentor",
  },
  {
    id: "mem_marcus_orbitflow",
    companyId: "co_orbitflow",
    userId: "usr_operator_marcus",
    relation: "operator",
    title: "Embedded Operator",
  },
  {
    id: "mem_julian_flexpoint",
    companyId: "co_flexpoint_ford",
    userId: "usr_investor_julian",
    relation: "coinvestor",
    title: "Co-Investor",
  },
];

async function main() {
  await prisma.connectionRequest.deleteMany();
  await prisma.connection.deleteMany();
  await prisma.companyMembership.deleteMany();
  await prisma.onboardingContractArtifact.deleteMany();
  await prisma.onboardingProfile.deleteMany();
  await prisma.worldVerificationNullifier.deleteMany();
  await prisma.company.deleteMany();
  await prisma.user.deleteMany();

  for (const user of users) {
    const metrics = buildUserMetrics(user);
    await prisma.user.create({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        bio: user.bio,
        skills: user.skills,
        sectors: user.sectors,
        linkedinUrl: user.linkedinUrl,
        walletAddress: user.walletAddress,
        worldVerified: user.worldVerified,
        dynamicUserId: user.dynamicUserId,
        engagementScore: metrics.engagementScore,
        reliabilityScore: metrics.reliabilityScore,
        verificationBadges: metrics.verificationBadges,
        outsideNetworkAccessEnabled: user.outsideNetworkAccessEnabled,
        lastActiveAt: user.lastActiveAt,
      },
    });
  }

  for (const company of companies) {
    await prisma.company.create({
      data: company,
    });
  }

  for (const membership of memberships) {
    await prisma.companyMembership.create({
      data: membership,
    });
  }

  await prisma.connection.createMany({
    data: [
      {
        id: "conn_george_nina",
        sourceUserId: "usr_consultant_nina",
        targetUserId: "usr_george_demo",
        type: ConnectionType.CONSULTING,
        verified: true,
        note: "Seeded verified Meshed connection",
        createdAt: new Date("2026-04-18T15:00:00.000Z"),
      },
      {
        id: "conn_george_theo",
        sourceUserId: "usr_mentor_theo",
        targetUserId: "usr_george_demo",
        type: ConnectionType.MENTORSHIP,
        verified: true,
        note: "Seeded verified Meshed connection",
        createdAt: new Date("2026-04-17T14:00:00.000Z"),
      },
      {
        id: "conn_george_omar",
        sourceUserId: "usr_investor_omar",
        targetUserId: "usr_george_demo",
        type: ConnectionType.INVESTMENT,
        verified: true,
        note: "Seeded verified Meshed connection",
        createdAt: new Date("2026-04-16T13:00:00.000Z"),
      },
    ],
  });

  await prisma.connectionRequest.createMany({
    data: [
      {
        id: "req_iris_george",
        requesterUserId: "usr_operator_iris",
        recipientUserId: "usr_george_demo",
        type: ConnectionType.INTRO,
        message: "I can help the Flexpoint Ford team on onboarding diagnostics and milestone tracking for portfolio ops.",
        createdAt: new Date("2026-04-21T09:00:00.000Z"),
      },
      {
        id: "req_lena_george",
        requesterUserId: "usr_consultant_lena",
        recipientUserId: "usr_george_demo",
        type: ConnectionType.CONSULTING,
        message: "Would love to connect around pricing redesign work across the Flexpoint Ford portfolio.",
        createdAt: new Date("2026-04-21T10:30:00.000Z"),
      },
      {
        id: "req_priya_george",
        requesterUserId: "usr_mentor_priya",
        recipientUserId: "usr_george_demo",
        type: ConnectionType.MENTORSHIP,
        message: "I can support founder coaching and enterprise pilot strategy for companies in the network.",
        createdAt: new Date("2026-04-21T12:15:00.000Z"),
      },
      {
        id: "req_george_marcus",
        requesterUserId: "usr_george_demo",
        recipientUserId: "usr_operator_marcus",
        type: ConnectionType.INTRO,
        message: "Would love to open a Meshed connection around execution reporting support.",
        createdAt: new Date("2026-04-20T14:20:00.000Z"),
      },
      {
        id: "req_george_julian",
        requesterUserId: "usr_george_demo",
        recipientUserId: "usr_investor_julian",
        type: ConnectionType.INVESTMENT,
        message: "Let’s connect around co-investor coordination and warm intros across the portfolio.",
        createdAt: new Date("2026-04-20T15:10:00.000Z"),
      },
    ],
  });

  await prisma.onboardingProfile.create({
    data: {
      id: "onb_george_demo",
      userId: "usr_george_demo",
      companyId: "co_flexpoint_ford",
      vcCompanyId: "co_flexpoint_ford",
      mode: "INDIVIDUAL",
      title: "Principal",
      isExecutive: true,
      executiveSignoffEmail: "georgegds92@gmail.com",
      currentStep: "COMPLETE",
      teamCsvUploadedAt: now,
    },
  });

  console.log("Seed complete: created users, memberships, connections, and pending requests for the dashboard demo.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
