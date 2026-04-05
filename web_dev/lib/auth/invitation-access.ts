type DynamicInviteKind = "portfolio_member" | "vc_member";

type DynamicInviteRecord = {
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

export type DynamicNextRoute = "/human-idv";

function parseDynamicInviteEmailsFromEnv() {
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
      nextRoute: "/human-idv" as const,
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
    email: "georgegds92+1@gmail.com",
    kind: "portfolio_member",
    nextRoute: "/human-idv",
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
    nextRoute: "/human-idv",
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

export function getDynamicInvitationAccess(email: string) {
  const normalized = normalizeEmail(email);
  return inviteRegistry.find((invite) => invite.email === normalized) ?? null;
}
