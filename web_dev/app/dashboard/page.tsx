import { CompanyNetworkGraph } from "@/components/dashboard/CompanyNetworkGraph";
import { ConnectionsPanel } from "@/components/dashboard/ConnectionsPanel";
import { CollapsibleCard } from "@/components/dashboard/CollapsibleCard";
import { DashboardTopPanels } from "@/components/dashboard/DashboardTopPanels";
import { LogoutButton } from "@/components/LogoutButton";
import { Button } from "@/components/ui/Button";
import { loadDashboardData } from "@/lib/server/meshed-network/a16z-crypto-dashboard";
import { getDashboardScopeConfig, resolveDashboardScopeForEmail } from "@/lib/server/meshed-network/dashboard-scope";
import { getCurrentUser } from "@/lib/server/current-user";
import { prisma } from "@/lib/server/prisma";
import { userRepository } from "@/lib/server/repositories/user-repository";
import { connectionRequestService } from "@/lib/server/services/connection-request-service";
import { linkedinActivityService, type LinkedInMeshedNotification } from "@/lib/server/services/linkedin-activity-service";
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
    return `${notification.counterpartName} already has an attested LinkedIn signal in Meshed. Latest preview: ${notification.messagePreview}`;
  }

  if (user.skills.length > 0 && user.sectors.length > 0) {
    return `${user.name} is active around ${user.sectors[0]} and brings ${user.skills[0]} into the Meshed network.`;
  }

  if (user.skills.length > 0) {
    return `${user.name} is already active on Meshed with a visible ${user.skills[0]} skill signal.`;
  }

  return `${user.name} is already present in the verified Meshed network and ready for direct connection.`;
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

  const dashboardScope = resolveDashboardScopeForEmail(currentUser.email);
  const dashboardScopeConfig = getDashboardScopeConfig(dashboardScope);
  const dashboard = await loadDashboardData(dashboardScope);

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
  const memberships = await prisma.companyMembership.findMany({
    where: {
      userId: {
        in: [currentUser.id],
      },
    },
    include: {
      company: {
        select: {
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
          name: true,
        },
      },
    },
  });

  const membershipLookup = new Map<string, string>();
  for (const membership of [...memberships, ...extraMemberships]) {
    if (!membershipLookup.has(membership.userId)) {
      membershipLookup.set(membership.userId, membership.company.name);
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
      company: membershipLookup.get(user.id) ?? titleCase(user.role),
      role: user.role,
      why: buildContactReason(user, notificationsByCounterpart.get(user.id)),
      contact: user.email,
      linkedinUrl: user.linkedinUrl ?? null,
      suggestedConnectionType: suggestedConnectionType(user.role),
    }));

  const { snapshot, strongestBridges, companyGraph } = dashboard;
  const scopeLabel = snapshot.scope_label || dashboardScopeConfig.scopeLabel;
  const dashboardBrandDomain = dashboardScope === "flexpoint-ford" ? "flexpointford.com" : "a16z.com";
  const logoDevToken = process.env.LOGO_DEV_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_LOGO_DEV_PUBLISHABLE_KEY ?? "";
  const dashboardBrandLogoUrl = `https://img.logo.dev/${dashboardBrandDomain}?size=160&format=png${
    logoDevToken ? `&token=${logoDevToken}` : ""
  }`;
  const heroDescription = `Here's your daily AI-powered update on the ${dashboardScopeConfig.organizationName} Meshed network`;
  const statusItems = [
    { label: "Role", value: titleCase(currentUser.role) },
    { label: "Dynamic wallet", value: currentUser.walletAddress ? "Connected" : "Pending" },
    { label: "World ID", value: currentUser.worldVerified ? "Verified" : "Not verified" },
    { label: "Trust badges", value: formatRelativeCount(currentUser.verificationBadges.length, "badge") },
    { label: "Company", value: membershipLookup.get(currentUser.id) ?? "No company linked yet" },
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
          rightTitle="World ID and Dynamic Verified"
          rightDescription="World ID verifies that you are a real, unique human in the Meshed network trust layer, while Dynamic handles wallet and credential access."
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
          eyebrow="People connections"
          title="Meshed people connections"
          description="This ports the existing LinkedIn simulation and people-connection flow into the current repo: attested LinkedIn handoff, seeded connection requests, and Flare-backed request acceptance without chat."
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
          />
        </CollapsibleCard>

        <DashboardTopPanels
          gridClassName="xl:grid-cols-[1.05fr_0.95fr]"
          leftClassName="bg-white/90 backdrop-blur"
          rightClassName="bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.98))]"
          leftEyebrow="Top companies"
          leftTitle="Most connected companies"
          leftDescription={`These are the most central companies in the current ${scopeLabel} graph, ranked by company bridge degree with people density as the tie-breaker.`}
          leftChildren={
            <div className="grid gap-3 md:grid-cols-2">
              {snapshot.top_companies.map((company) => (
                <article key={company.id} className="rounded-[1.5rem] border border-slate-200 bg-mist/70 px-5 py-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-ink">{company.company_name}</h3>
                      <p className="mt-1 text-sm text-slate">
                        {company.vertical ?? "Unassigned vertical"}
                        {company.location_region ? ` | ${company.location_region}` : ""}
                      </p>
                    </div>
                    <span className="rounded-full border border-white/90 bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate">
                      Degree {company.degree}
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate">
                    {formatRelativeCount(company.people_count, "person")} currently synthesized around this company in
                    the talent graph.
                  </p>
                </article>
              ))}
            </div>
          }
          rightEyebrow="Network bridges"
          rightTitle="Strongest company bridges"
          rightDescription="These explanations come straight from the generated company-network payload and give the clearest handoff into redeployment opportunities."
          rightChildren={
            <div className="space-y-3">
              {strongestBridges.map((bridge) => (
                <article key={bridge.id} className="rounded-[1.5rem] border border-slate-200 bg-white px-5 py-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold text-ink">
                      {bridge.sourceName} to {bridge.targetName}
                    </h3>
                    <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">
                      Score {bridge.score.toFixed(2)}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-medium text-ink">{bridge.reason}</p>
                  <p className="mt-2 text-sm leading-6 text-slate">{bridge.explanation}</p>
                </article>
              ))}
            </div>
          }
        />
      </section>
    </main>
  );
}
