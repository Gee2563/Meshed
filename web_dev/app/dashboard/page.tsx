import { AgentNotificationsPanel } from "@/components/dashboard/AgentNotificationsPanel";
import { CompanyNetworkGraph } from "@/components/dashboard/CompanyNetworkGraph";
import { ConnectionsPanel } from "@/components/dashboard/ConnectionsPanel";
import { CollapsibleCard } from "@/components/dashboard/CollapsibleCard";
import { DashboardTopPanels } from "@/components/dashboard/DashboardTopPanels";
import { LogoutButton } from "@/components/LogoutButton";
import { Button } from "@/components/ui/Button";
import { getDemoRoleLabel } from "@/lib/demo-role-label";
import { loadDashboardData } from "@/lib/server/meshed-network/a16z-crypto-dashboard";
import {
  getDashboardScopeConfig,
  resolveDashboardScopeForEmail,
  resolveDashboardScopeForOrganization,
} from "@/lib/server/meshed-network/dashboard-scope";
import { getCurrentUser } from "@/lib/server/current-user";
import { prisma } from "@/lib/server/prisma";
import { networkPreparationJobRepository } from "@/lib/server/repositories/network-preparation-job-repository";
import { userRepository } from "@/lib/server/repositories/user-repository";
import { connectionRequestService } from "@/lib/server/services/connection-request-service";
import { linkedinActivityService, type LinkedInMeshedNotification } from "@/lib/server/services/linkedin-activity-service";
import { verifiedInteractionService } from "@/lib/server/services/verified-interaction-service";
import { agentNotificationService } from "@/lib/server/services/agent-notification-service";
import type { ConnectionSummary, UserSummary } from "@/lib/types";
import { formatRelativeCount, titleCase } from "@/lib/utils";

export const dynamic = "force-dynamic";

function MetricTile({ label, value, caption }: { label: string; value: number; caption: string }) {
  return (
    <div className="rounded-[1.5rem] border border-white/80 bg-white/90 px-5 py-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-ink">{value}</p>
      <p className="mt-2 text-sm text-slate">{caption}</p>
    </div>
  );
}

function suggestedConnectionType(role: UserSummary["role"]): ConnectionSummary["type"] {
  if (role === "mentor") {
    return "mentorship";
  }
  if (role === "consultant") {
    return "consulting";
  }
  if (role === "investor") {
    return "investment";
  }
  if (role === "admin") {
    return "endorsement";
  }
  return "intro";
}

function buildContactReason(user: UserSummary, notification?: { counterpartName: string; messagePreview: string } | null) {
  if (notification) {
    return `${notification.counterpartName} already has a human-backed interaction signal in Meshed. Latest preview: ${notification.messagePreview}`;
  }

  if (user.skills.length > 0 && user.sectors.length > 0) {
    return `${user.name} is active around ${user.sectors[0]} and brings ${user.skills[0]} into the Meshed network.`;
  }

  if (user.skills.length > 0) {
    return `${user.name} is already active on Meshed with a visible ${user.skills[0]} skill signal.`;
  }

  return `${user.name} is already present in the verified Meshed network and ready for direct connection.`;
}

function getCustomSummaryMetric(
  result: Record<string, unknown> | null | undefined,
  key: "portfolio_company_count" | "lp_contact_count" | "company_scan_count",
) {
  const summary = result?.summary;
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    return 0;
  }

  const value = (summary as Record<string, unknown>)[key];
  return typeof value === "number" ? value : 0;
}

export default async function DashboardPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <main className="px-4 py-10 sm:px-6 lg:px-10">
        <section className="mx-auto max-w-3xl rounded-[2rem] border border-white/75 bg-white/75 p-6 shadow-halo backdrop-blur sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate">Dashboard access</p>
          <h1 className="mt-4 font-display text-4xl tracking-tight text-ink">Session required</h1>
          <p className="mt-4 text-sm leading-7 text-slate">
            The dashboard is part of the Meshed trust flow. Start from the Meshed home page first, then return once the
            session is active.
          </p>
          <div className="mt-6">
            <Button href="/" variant="secondary">
              Return home
            </Button>
          </div>
        </section>
      </main>
    );
  }

  const onboardingProfile = await prisma.onboardingProfile.findUnique({
    where: { userId: currentUser.id },
  });
  const selectedVcCompany = onboardingProfile?.vcCompanyId
    ? await prisma.company.findUnique({
        where: { id: onboardingProfile.vcCompanyId },
      })
    : null;
  const latestNetworkJob = await networkPreparationJobRepository.findLatestByUserId(currentUser.id);
  const websiteScope = resolveDashboardScopeForOrganization({
    website: selectedVcCompany?.website,
    name: selectedVcCompany?.name,
  });
  const dashboardScope = websiteScope ?? resolveDashboardScopeForEmail(currentUser.email);
  const dashboardScopeConfig = getDashboardScopeConfig(dashboardScope);
  const dashboard = websiteScope || !selectedVcCompany ? await loadDashboardData(dashboardScope) : null;

  if (!websiteScope && latestNetworkJob?.status === "ready" && latestNetworkJob.result) {
    const portfolioCompanies = Array.isArray(latestNetworkJob.result.portfolio_companies)
      ? (latestNetworkJob.result.portfolio_companies as Array<Record<string, unknown>>)
      : [];
    const lpContacts = Array.isArray(latestNetworkJob.result.lp_contacts)
      ? (latestNetworkJob.result.lp_contacts as Array<Record<string, unknown>>)
      : [];

    return (
      <main className="px-4 py-8 sm:px-6 lg:px-10">
        <section className="mx-auto max-w-7xl space-y-6">
          <div className="rounded-[2rem] border border-white/75 bg-white/80 p-6 shadow-halo backdrop-blur sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate">Custom Network Ready</p>
                <h1 className="font-display text-4xl tracking-tight text-ink">
                  {selectedVcCompany?.name ?? "Your VC"} network is ready in Meshed
                </h1>
                <p className="max-w-3xl text-sm leading-7 text-slate">
                  Meshed completed the first background preparation pass for {selectedVcCompany?.website ?? "your VC website"}.
                  This custom dashboard summarizes the discovered portfolio companies, LP or advisor contacts, and public
                  signals your verified AI Doppelganger can start routing through.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button href="/agent?mode=setup" variant="secondary">
                  Open Agent setup
                </Button>
                <LogoutButton />
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <MetricTile
                label="Portfolio Companies"
                value={getCustomSummaryMetric(latestNetworkJob.result, "portfolio_company_count")}
                caption="Discovered from the VC website"
              />
              <MetricTile
                label="LP / Advisor Contacts"
                value={getCustomSummaryMetric(latestNetworkJob.result, "lp_contact_count")}
                caption="Public network-side contacts found"
              />
              <MetricTile
                label="Scanned Company Sites"
                value={getCustomSummaryMetric(latestNetworkJob.result, "company_scan_count")}
                caption="Portfolio websites checked for news and teams"
              />
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[2rem] border border-white/75 bg-white/80 p-6 shadow-halo backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate">Portfolio Discovery</p>
              <h2 className="mt-3 font-display text-3xl tracking-tight text-ink">Companies Meshed found</h2>
              <div className="mt-5 space-y-4">
                {portfolioCompanies.slice(0, 12).map((company, index) => {
                  const latestNews = Array.isArray(company.latest_news) ? company.latest_news : [];
                  const teamMembers = Array.isArray(company.team_members) ? company.team_members : [];
                  return (
                    <article key={`${company.name ?? "company"}-${index}`} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold text-ink">{String(company.name ?? "Unnamed company")}</h3>
                          <p className="mt-1 text-sm text-slate">{String(company.website ?? "Website unavailable")}</p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                          {latestNews.length} news / {teamMembers.length} team
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-[2rem] border border-white/75 bg-white/80 p-6 shadow-halo backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate">LP / Advisor Discovery</p>
                <h2 className="mt-3 font-display text-3xl tracking-tight text-ink">Network-side contacts</h2>
                <div className="mt-5 space-y-4">
                  {lpContacts.length > 0 ? (
                    lpContacts.slice(0, 10).map((contact, index) => (
                      <article key={`${contact.name ?? "contact"}-${index}`} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                        <h3 className="text-base font-semibold text-ink">{String(contact.name ?? "Unnamed contact")}</h3>
                        <p className="mt-1 text-sm text-slate">{String(contact.title ?? "Role unavailable")}</p>
                      </article>
                    ))
                  ) : (
                    <p className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate">
                      Meshed didn&apos;t find public LP or advisor contacts on the first pass, but the network summary is ready.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-sky-50/80 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">Background agent</p>
                <p className="mt-3 text-sm leading-6 text-slate-700">
                  Meshed&apos;s onboarding agent scraped the VC website, looked for portfolio pages and LP-side contacts,
                  then iterated through portfolio company sites for public team and news signals.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (!websiteScope && selectedVcCompany) {
    return (
      <main className="px-4 py-10 sm:px-6 lg:px-10">
        <section className="mx-auto max-w-3xl rounded-[2rem] border border-white/75 bg-white/75 p-6 shadow-halo backdrop-blur sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate">Custom Network Prep</p>
          <h1 className="mt-4 font-display text-4xl tracking-tight text-ink">Your VC network is still preparing</h1>
          <p className="mt-4 text-sm leading-7 text-slate">
            Meshed is still building the first pass for {selectedVcCompany.name}. Once the background agent finishes
            scraping the VC website and portfolio company sites, this dashboard will switch to the custom network view.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button href="/agent?mode=setup" variant="secondary">
              Return to Agent setup
            </Button>
            <LogoutButton />
          </div>
        </section>
      </main>
    );
  }

  if (!dashboard) {
    return (
      <main className="px-4 py-10 sm:px-6 lg:px-10">
        <section className="mx-auto max-w-3xl rounded-[2rem] border border-white/75 bg-white/75 p-6 shadow-halo backdrop-blur sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate">Dashboard data</p>
          <h1 className="mt-4 font-display text-4xl tracking-tight text-ink">{dashboardScopeConfig.scopeLabel} bundle unavailable</h1>
          <p className="mt-4 text-sm leading-7 text-slate">
            The dashboard page is ready, but the generated `{dashboardScopeConfig.bundleRelativePath}` bundle is missing
            or unreadable. Re-run the pipeline slice, then refresh this page.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button href="/" variant="secondary">
              Return home
            </Button>
            <LogoutButton />
          </div>
        </section>
      </main>
    );
  }

  const connectionState = await connectionRequestService.ensureDemoState(currentUser.id);
  const demoUsers: UserSummary[] = await userRepository.listDemoUsers();
  const notifications: LinkedInMeshedNotification[] = await linkedinActivityService.listNotificationsForUser(currentUser.id);
  const agentNotifications = await agentNotificationService.syncForUser(currentUser.id);
  const recentInteractions = await verifiedInteractionService.listRecentForUser(currentUser.id, 12);
  const memberships = await prisma.companyMembership.findMany({
    where: {
      userId: {
        in: [currentUser.id],
      },
    },
    include: {
      company: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  const extraMemberships = await prisma.companyMembership.findMany({
    where: {
      userId: {
        in: demoUsers.map((user) => user.id),
      },
    },
    include: {
      company: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  const membershipLookup = new Map<string, { companyId: string; name: string }>();
  for (const membership of [...memberships, ...extraMemberships]) {
    if (!membershipLookup.has(membership.userId)) {
      membershipLookup.set(membership.userId, {
        companyId: membership.company.id,
        name: membership.company.name,
      });
    }
  }

  const notificationsByCounterpart = new Map<string, LinkedInMeshedNotification>(
    notifications.map((notification: LinkedInMeshedNotification) => [notification.counterpartUserId, notification]),
  );
  const contacts = demoUsers
    .filter((user: UserSummary) => user.id !== currentUser.id)
    .filter((user: UserSummary) => user.role !== "company" && user.role !== "admin")
    .sort((left: UserSummary, right: UserSummary) => {
      const leftSignal = notificationsByCounterpart.has(left.id) ? 1 : 0;
      const rightSignal = notificationsByCounterpart.has(right.id) ? 1 : 0;
      if (leftSignal !== rightSignal) {
        return rightSignal - leftSignal;
      }
      return right.engagementScore - left.engagementScore;
    })
    .slice(0, 8)
    .map((user: UserSummary) => ({
      id: user.id,
      name: user.name,
      company: membershipLookup.get(user.id)?.name ?? titleCase(user.role),
      role: user.role,
      why: buildContactReason(user, notificationsByCounterpart.get(user.id)),
      contact: user.email,
      linkedinUrl: user.linkedinUrl ?? null,
      suggestedConnectionType: suggestedConnectionType(user.role),
      worldVerified: user.worldVerified,
      companyId: membershipLookup.get(user.id)?.companyId ?? null,
      painPointTag: null,
      matchScore: null,
    }));

  const { snapshot, companyGraph } = dashboard;
  const scopeLabel = snapshot.scope_label || dashboardScopeConfig.scopeLabel;
  const dashboardBrandDomain = dashboardScope === "flexpoint-ford" ? "flexpointford.com" : "a16z.com";
  const logoDevToken = process.env.LOGO_DEV_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_LOGO_DEV_PUBLISHABLE_KEY ?? "";
  const dashboardBrandLogoUrl = `https://img.logo.dev/${dashboardBrandDomain}?size=160&format=png${
    logoDevToken ? `&token=${logoDevToken}` : ""
  }`;
  const heroDescription = `Here's your daily AI-powered update on the ${dashboardScopeConfig.organizationName} Meshed network`;
  const statusItems = [
    { label: "Role", value: titleCase(currentUser.role) },
    { label: "Meshed sign-in", value: currentUser.worldVerified ? "World-backed" : "Session active" },
    { label: "World ID", value: currentUser.worldVerified ? "Verified Human" : "Not verified" },
    { label: "Trust badges", value: formatRelativeCount(currentUser.verificationBadges.length, "badge") },
    { label: "Company", value: membershipLookup.get(currentUser.id)?.name ?? "No company linked yet" },
  ];

  return (
    <main className="px-4 py-8 sm:px-6 lg:px-10">
      <section className="mx-auto max-w-7xl space-y-6">
        <DashboardTopPanels
          leftHeaderVisual={
            <div className="inline-flex h-16 w-16 items-center justify-center overflow-hidden rounded-[1.3rem] border border-slate-200 bg-white shadow-sm">
              <img
                src={dashboardBrandLogoUrl}
                alt={`${dashboardScopeConfig.organizationName} logo`}
                className="h-full w-full object-contain p-2.5"
              />
            </div>
          }
          leftTitle={dashboardScopeConfig.heroTitle}
          leftDescription={heroDescription}
          leftChildren={
            <div className="space-y-5">
              <div>
                <p className="max-w-3xl text-lg leading-8 text-slate">
                  An AI Driven Network Intelligence for your Investments

                  <br />
                  From static portfolio lists to living AI graphs that amplify your investment portfolio communities
                </p>
                <p className="mt-3 max-w-3xl text-lg leading-8 text-slate">
                  We&apos;re building an AI network intelligence layer for VC portfolios that discovers collaboration opportunities
                  between startups using AI to identify enterprise-level pain points for post-investment value creation.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricTile
                  label="Companies"
                  value={snapshot.company_count}
                  caption={`${snapshot.vertical_count} tracked verticals`}
                />
                <MetricTile
                  label="Company bridges"
                  value={snapshot.company_edge_count}
                  caption="Similarity-driven redeployment signals"
                />
                <MetricTile
                  label="People"
                  value={snapshot.people_count}
                  caption={`${snapshot.people_company_count} companies represented`}
                />
                <MetricTile
                  label="People bridges"
                  value={snapshot.people_edge_count}
                  caption="Synthetic peer-support routes"
                />
              </div>
            </div>
          }
          rightEyebrow=""
          rightTitle="Verified Humans and Managed Access"
          rightDescription="World ID now handles Meshed registration and human verification, so every trusted intro and rewardable action starts from a privacy-preserving verified human session."
          rightChildren={
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                {statusItems.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/80 bg-white/90 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate">{item.label}</p>
                    <p className="mt-2 text-sm font-medium text-ink">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-2xl border border-white/80 bg-white/90 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate">Generated via</p>
                <p className="mt-2 text-sm text-ink">{snapshot.generated_via ?? "network pipeline"}</p>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button href="/" variant="secondary">
                  Return home
                </Button>
                <LogoutButton />
              </div>
            </>
          }
        />

        <CollapsibleCard
          eyebrow="Network graph"
          title={dashboardScopeConfig.graphTitle}
          description="Neural Portfolio Graphs for Modern Investors. Transform your portfolio data into actionable insights and strategic connections."
          defaultOpen={false}
        >
          <CompanyNetworkGraph nodes={companyGraph.nodes} edges={companyGraph.edges} graphLabel={scopeLabel} />
        </CollapsibleCard>

        <CollapsibleCard
          eyebrow="Opportunity feed"
          title="Proactive Meshed notifications"
          description="Your personal agent is now surfacing Meshed-native opportunities and can immediately hand them off into verified human coordination."
          defaultOpen={true}
        >
          <AgentNotificationsPanel notifications={agentNotifications} />
        </CollapsibleCard>

        <CollapsibleCard
          eyebrow="People connections"
          title="Meshed people connections"
          description="Move from recommended match to intro request, intro acceptance, and rewardable human-backed interactions without depending on external attestations."
          defaultOpen={false}
        >
          <ConnectionsPanel
            contacts={contacts}
            notifications={notifications.map((notification: LinkedInMeshedNotification) => ({
              id: notification.id,
              counterpartUserId: notification.counterpartUserId,
              counterpartName: notification.counterpartName,
              action: notification.action,
              direction: notification.direction,
              messagePreview: notification.messagePreview,
              receivedAt: notification.receivedAt,
              title: notification.title,
              body: notification.body,
            }))}
            pendingIncomingRequests={connectionState.pendingIncomingRequests}
            connectedContactIds={connectionState.connectedContactIds}
            outgoingPendingContactIds={connectionState.outgoingPendingContactIds}
            recentInteractions={recentInteractions}
          />
        </CollapsibleCard>

      </section>
    </main>
  );
}
