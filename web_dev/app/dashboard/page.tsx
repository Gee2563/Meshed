import { CompanyNetworkGraph } from "@/components/dashboard/CompanyNetworkGraph";
import { ConnectionsPanel } from "@/components/dashboard/ConnectionsPanel";
import { CollapsibleCard } from "@/components/dashboard/CollapsibleCard";
import { LogoutButton } from "@/components/LogoutButton";
import { Button } from "@/components/ui/Button";
import { loadA16zCryptoDashboardData } from "@/lib/server/meshed-network/a16z-crypto-dashboard";
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
  const [currentUser, dashboard] = await Promise.all([getCurrentUser(), loadA16zCryptoDashboardData()]);

  if (!currentUser) {
    return (
      <main className="px-4 py-10 sm:px-6 lg:px-10">
        <section className="mx-auto max-w-3xl rounded-[2rem] border border-white/75 bg-white/75 p-6 shadow-halo backdrop-blur sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate">Dashboard access</p>
          <h1 className="mt-4 font-display text-4xl tracking-tight text-ink">Session required</h1>
          <p className="mt-4 text-sm leading-7 text-slate">
            The dashboard is part of the Meshed trust flow. Start from Dynamic registration first, then return once the
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

  if (!dashboard) {
    return (
      <main className="px-4 py-10 sm:px-6 lg:px-10">
        <section className="mx-auto max-w-3xl rounded-[2rem] border border-white/75 bg-white/75 p-6 shadow-halo backdrop-blur sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate">Dashboard data</p>
          <h1 className="mt-4 font-display text-4xl tracking-tight text-ink">A16z crypto bundle unavailable</h1>
          <p className="mt-4 text-sm leading-7 text-slate">
            The dashboard page is ready, but the generated `network_pipeline/public/a16z-crypto` bundle is missing or
            unreadable. Re-run the pipeline slice, then refresh this page.
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

  const { snapshot, strongestBridges, topVerticals, companyGraph } = dashboard;
  const statusItems = [
    { label: "Role", value: titleCase(currentUser.role) },
    { label: "Wallet", value: currentUser.walletAddress ? "Connected" : "Pending" },
    { label: "Human IDV", value: currentUser.worldVerified ? "Verified" : "Pending" },
    { label: "Trust badges", value: formatRelativeCount(currentUser.verificationBadges.length, "badge") },
    { label: "Company", value: membershipLookup.get(currentUser.id) ?? "No company linked yet" },
  ];

  return (
    <main className="px-4 py-8 sm:px-6 lg:px-10">
      <section className="mx-auto max-w-7xl space-y-6">
        <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <CollapsibleCard
            eyebrow="A16z crypto"
            title="A16z crypto network dashboard"
            description="This dashboard now reads the generated a16z pipeline bundle directly and puts the live company graph inside the page, not behind a separate export."
            className="bg-white/65 backdrop-blur"
          >
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-sky-200 bg-sky-50 px-4 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
                  A16z crypto
                </span>
                <span className="rounded-full border border-white/80 bg-white/80 px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate">
                  Demo dashboard
                </span>
              </div>

              <div>
                <p className="text-sm font-medium text-slate">Signed in as {currentUser.name}</p>
                <p className="mt-4 max-w-3xl text-lg leading-8 text-slate">
                  Meshed UpCycle is easiest to explain with a live network in front of us. This page shows the shape of
                  the a16z crypto ecosystem, the strongest company bridges, and the people layer we can surface for
                  redeployment when teams become available.
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
          </CollapsibleCard>

          <CollapsibleCard
            eyebrow="Session context"
            title="Current trust posture"
            description="The dashboard stays tied to the same registration and verification state the user established through Dynamic and World ID."
            className="bg-[linear-gradient(180deg,rgba(238,242,247,0.84),rgba(255,255,255,0.92))]"
          >
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
          </CollapsibleCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <CollapsibleCard
            eyebrow="Top companies"
            title="Most connected companies"
            description="These are the most central companies in the current a16z graph, ranked by company bridge degree with people density as the tie-breaker."
          >
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
          </CollapsibleCard>

          <CollapsibleCard
            eyebrow="Network bridges"
            title="Strongest company bridges"
            description="These explanations come straight from the generated company-network payload and give the clearest handoff into redeployment opportunities."
          >
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
          </CollapsibleCard>
        </div>

        <CollapsibleCard
          eyebrow="Network graph"
          title="Interactive company graph"
          description="The old Rho result was a live network first. This slice brings that same end-state into /dashboard with search, focus, and detail inspection built from the generated a16z graph payload."
        >
          <CompanyNetworkGraph nodes={companyGraph.nodes} edges={companyGraph.edges} />
        </CollapsibleCard>

        <CollapsibleCard
          eyebrow="People connections"
          title="Meshed people connections"
          description="This ports the existing LinkedIn simulation and people-connection flow into the current repo: attested LinkedIn handoff, seeded connection requests, and Flare-backed request acceptance without chat."
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

        <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <CollapsibleCard
            eyebrow="Vertical mix"
            title="Top tracked verticals"
            description="The graph colors map back to the same vertical labels generated in the published bundle."
          >
            <div className="space-y-3">
              {topVerticals.map((vertical) => (
                <div key={vertical.vertical} className="rounded-[1.4rem] border border-white/80 bg-white/92 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: vertical.color }} />
                      <span className="text-sm font-medium text-ink">{vertical.vertical}</span>
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">
                      {formatRelativeCount(vertical.count, "company")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleCard>

          <CollapsibleCard
            eyebrow="People layer"
            title="Featured people signals"
            description="This keeps the dashboard grounded in UpCycle: who might be surfaced for redeployment once a company starts to struggle."
            tone="dark"
          >
            <div className="grid gap-3 md:grid-cols-2">
              {snapshot.featured_people.map((person) => (
                <article key={person.id} className="rounded-[1.5rem] border border-white/15 bg-white/10 px-5 py-5 backdrop-blur">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{person.name}</h3>
                      <p className="mt-1 text-sm text-sky-50/80">{person.company ?? "Unassigned company"}</p>
                    </div>
                    <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-sky-50">
                      {titleCase(person.suggested_role ?? "operator")}
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-sky-50/90">
                    Current signal: {person.current_pain_point_label ?? "General network support"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-sky-50/75">
                    Importance score {person.network_importance_score} with{" "}
                    {person.trust_signals.length ? person.trust_signals.map(titleCase).join(", ") : "no trust badges yet"}.
                  </p>
                </article>
              ))}
            </div>
          </CollapsibleCard>
        </div>
      </section>
    </main>
  );
}
