type DynamicInviteKind = "portfolio_member" | "vc_member";

export type DynamicInviteRecord = {
  email: string;
  kind: DynamicInviteKind;
  nextRoute: DynamicNextRoute;
  role: "operator" | "investor";
  outsideNetworkAccessEnabled: boolean;
  onboardingMode: "individual" | "company";
  onboardingStep: "complete" | "vc_company";
  title: string;
  vcCompanyId?: string;
  vcCompanyName?: string;
  portfolioCompanyId?: string;
  portfolioCompanyName?: string;
};

export type DynamicNextRoute = "/agent";

function parseDynamicInviteEmailsFromEnv(): DynamicInviteRecord[] {
  const configured = process.env.DYNAMIC_INVITATION_EMAILS;

  if (!configured) {
    return [];
  }

  return configured
    .split(/[,;\n]/)
    .map((value) => normalizeEmail(value))
    .filter(Boolean)
    .map((email) => ({
      email,
      kind: "vc_member" as const,
      nextRoute: "/agent" as const,
      role: "investor" as const,
      outsideNetworkAccessEnabled: true,
      onboardingMode: "individual" as const,
      onboardingStep: "complete" as const,
      title: "Investor",
    }));
}

const inviteRegistry: DynamicInviteRecord[] = [
  ...parseDynamicInviteEmailsFromEnv(),
  {
    email: "georgegds92@gmail.com",
    kind: "vc_member",
    nextRoute: "/agent",
    role: "investor",
    outsideNetworkAccessEnabled: true,
    onboardingMode: "individual",
    onboardingStep: "complete",
    title: "Investor",
    vcCompanyId: "co_invite_flexpoint_ford",
    vcCompanyName: "Flexpoint Ford",
  },
  {
    email: "georgegds92+1@gmail.com",
    kind: "portfolio_member",
    nextRoute: "/agent",
    role: "operator",
    outsideNetworkAccessEnabled: false,
    onboardingMode: "individual",
    onboardingStep: "complete",
    title: "Portfolio Manager",
    vcCompanyId: "co_invite_rho_capital",
    vcCompanyName: "Rho Capital",
    portfolioCompanyId: "co_invite_company_a",
    portfolioCompanyName: "companyA",
  },
  {
    email: "georgegds92+3@gmail.com",
    kind: "vc_member",
    nextRoute: "/agent",
    role: "investor",
    outsideNetworkAccessEnabled: true,
    onboardingMode: "company",
    onboardingStep: "vc_company",
    title: "Investor",
  },
];

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function getDynamicInvitationAccess(email: string): DynamicInviteRecord {
  const normalized = normalizeEmail(email);
  const invite = inviteRegistry.find((record) => record.email === normalized);
  if (invite) {
    return invite;
  }

  return {
    email: normalized,
    kind: "vc_member",
    nextRoute: "/agent",
    role: "investor",
    outsideNetworkAccessEnabled: true,
    onboardingMode: "individual",
    onboardingStep: "complete",
    title: "Investor",
  };
}
