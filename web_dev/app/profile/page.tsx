import { AppShell } from "@/app/layout/AppShell";
import { EditableProfileOverview } from "@/components/profile/EditableProfileOverview";
import { Button } from "@/components/ui/Button";
import { getCurrentUser } from "@/lib/server/current-user";
import { prisma } from "@/lib/server/prisma";
import { userSocialConnectionRepository } from "@/lib/server/repositories/user-social-connection-repository";
import { verifiedInteractionService } from "@/lib/server/services/verified-interaction-service";
import type { VerifiedInteractionSummary } from "@/lib/types";

export const dynamic = "force-dynamic";
const genericWorldBio = "New Meshed member authenticated and registered with World ID.";

function formatMembershipRelation(relation: string) {
  switch (relation) {
    case "vc_member":
      return "VC team";
    case "portfolio_network_member":
      return "Portfolio network";
    case "portfolio_member":
      return "Portfolio company";
    case "network_member":
      return "Network member";
    case "member":
      return "Company member";
    default:
      return relation.replace(/_/g, " ");
  }
}

function isDirectCompanyMembership(relation: string) {
  return relation === "vc_member" || relation === "portfolio_member" || relation === "member";
}

function uniqueLabels(values: string[]) {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const value of values) {
    const normalized = value.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    merged.push(normalized);
  }

  return merged;
}

function formatInteractionLabel(interaction: VerifiedInteractionSummary) {
  if (interaction.interactionType === "WORLD_ID_REGISTERED") {
    return "World ID registered";
  }

  return interaction.interactionType.replaceAll("_", " ");
}

function formatInteractionStatus(interaction: VerifiedInteractionSummary) {
  if (interaction.interactionType === "WORLD_ID_REGISTERED") {
    return "Verified Human session anchored through World ID.";
  }

  return interaction.verified ? "World-backed trust layer confirmed." : "Waiting for full verification.";
}

export default async function ProfilePage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <AppShell>
        <section className="mx-auto max-w-3xl rounded-[2rem] border border-white/75 bg-white/80 p-6 shadow-halo backdrop-blur sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate">Profile access</p>
          <h1 className="mt-4 font-display text-4xl tracking-tight text-ink">Session required</h1>
          <p className="mt-4 text-sm leading-7 text-slate">
            Sign in through the Meshed trust flow first, then come back to review your profile, verification, image,
            and current connection state.
          </p>
          <div className="mt-6">
            <Button href="/" variant="secondary">
              Return home
            </Button>
          </div>
        </section>
      </AppShell>
    );
  }

  const memberships = await prisma.companyMembership.findMany({
    where: {
      userId: currentUser.id,
    },
    include: {
      company: {
        select: {
          name: true,
          sector: true,
          stage: true,
          currentPainTags: true,
          resolvedPainTags: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });
  const recentInteractions = await verifiedInteractionService.listRecentForUser(currentUser.id, 6);
  const registrationInteraction =
    currentUser.worldVerified && recentInteractions.length === 0
      ? await verifiedInteractionService.ensureWorldRegistrationInteraction(currentUser.id)
      : null;
  const displayRecentInteractions =
    registrationInteraction && recentInteractions.length === 0 ? [registrationInteraction] : recentInteractions;
  const socialConnections = await userSocialConnectionRepository.listByUserId(currentUser.id);
  const directMemberships = memberships.filter((membership) => isDirectCompanyMembership(membership.relation));
  const membershipSource = directMemberships.length > 0 ? directMemberships : memberships;
  const displaySkills = currentUser.skills.length
    ? currentUser.skills
    : uniqueLabels(membershipSource.flatMap((membership) => membership.company.resolvedPainTags)).slice(0, 5);
  const displaySectors = currentUser.sectors.length
    ? currentUser.sectors
    : uniqueLabels(membershipSource.map((membership) => membership.company.sector));
  const showBio = Boolean(currentUser.bio?.trim()) && currentUser.bio !== genericWorldBio;

  function worldChainExplorerUrl(interaction: VerifiedInteractionSummary) {
    const metadata = interaction.metadata as { worldChain?: { explorerUrl?: unknown } } | null | undefined;
    return typeof metadata?.worldChain?.explorerUrl === "string" ? metadata.worldChain.explorerUrl : null;
  }

  return (
    <AppShell>
      <section className="space-y-6">
        <EditableProfileOverview
          currentUser={currentUser}
          initialSkills={displaySkills}
          initialSectors={displaySectors}
          socialConnections={socialConnections}
          showBio={showBio}
        />

        <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <article className="rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-sm sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate">Company memberships</p>
            <div className="mt-4 space-y-3">
              {directMemberships.length === 0 ? (
                <div className="rounded-[1.4rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate">
                  No company membership is linked yet.
                </div>
              ) : (
                directMemberships.map((membership: (typeof memberships)[number]) => (
                  <div key={membership.id} className="rounded-[1.4rem] border border-slate-200 bg-mist/60 px-4 py-4">
                    <p className="text-sm font-semibold text-ink">{membership.company.name}</p>
                    <p className="mt-1 text-sm text-slate">
                      {membership.title} | {formatMembershipRelation(membership.relation)}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.12em] text-slate">
                      {membership.company.sector} | {membership.company.stage}
                    </p>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-sm sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate">Recent verified interactions</p>
            <div className="mt-4 space-y-3">
              {displayRecentInteractions.length === 0 ? (
                <div className="rounded-[1.4rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate">
                  No verified interactions recorded yet.
                </div>
              ) : (
                displayRecentInteractions.map((interaction: VerifiedInteractionSummary) => (
                  <div key={interaction.id} className="rounded-[1.4rem] border border-slate-200 bg-mist/60 px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-ink">{formatInteractionLabel(interaction)}</p>
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate">
                        {interaction.rewardStatus.replaceAll("_", " ")}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate">{formatInteractionStatus(interaction)}</p>
                    {interaction.transactionHash ? (
                      worldChainExplorerUrl(interaction) ? (
                        <a
                          href={worldChainExplorerUrl(interaction) ?? undefined}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 block break-all text-xs text-sky-700 underline-offset-4 hover:underline"
                        >
                          {interaction.transactionHash}
                        </a>
                      ) : (
                        <p className="mt-2 break-all text-xs text-slate">{interaction.transactionHash}</p>
                      )
                    ) : null}
                    <p className="mt-1 text-xs text-slate">{interaction.createdAt}</p>
                  </div>
                ))
              )}
            </div>
          </article>
        </div>
      </section>
    </AppShell>
  );
}
