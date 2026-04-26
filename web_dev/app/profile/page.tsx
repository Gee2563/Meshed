import { AppShell } from "@/app/layout/AppShell";
import { LogoutButton } from "@/components/LogoutButton";
import { Button } from "@/components/ui/Button";
import { getCurrentUser } from "@/lib/server/current-user";
import { prisma } from "@/lib/server/prisma";
import { userRepository } from "@/lib/server/repositories/user-repository";
import { connectionRequestService } from "@/lib/server/services/connection-request-service";
import { verifiedInteractionService } from "@/lib/server/services/verified-interaction-service";
import type { UserSummary, VerifiedInteractionSummary } from "@/lib/types";
import { formatRelativeCount, titleCase } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <AppShell>
        <section className="mx-auto max-w-3xl rounded-[2rem] border border-white/75 bg-white/80 p-6 shadow-halo backdrop-blur sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate">Profile access</p>
          <h1 className="mt-4 font-display text-4xl tracking-tight text-ink">Session required</h1>
          <p className="mt-4 text-sm leading-7 text-slate">
            Sign in through the Meshed trust flow first, then come back to review your wallet, verification, and
            current connection state.
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

  const connectionState = await connectionRequestService.ensureDemoState(currentUser.id);
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
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });
  const demoUsers: UserSummary[] = await userRepository.listDemoUsers();
  const recentInteractions = await verifiedInteractionService.listRecentForUser(currentUser.id, 6);

  const connectedContacts = demoUsers.filter((user: UserSummary) => connectionState.connectedContactIds.includes(user.id));
  const outgoingContacts = demoUsers.filter((user: UserSummary) =>
    connectionState.outgoingPendingContactIds.includes(user.id),
  );

  function interactionLabel(interaction: VerifiedInteractionSummary) {
    return interaction.interactionType.replaceAll("_", " ");
  }

  function worldChainExplorerUrl(interaction: VerifiedInteractionSummary) {
    const metadata = interaction.metadata as { worldChain?: { explorerUrl?: unknown } } | null | undefined;
    return typeof metadata?.worldChain?.explorerUrl === "string" ? metadata.worldChain.explorerUrl : null;
  }

  return (
    <AppShell>
      <section className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <article className="rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-sm backdrop-blur sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate">Profile</p>
            <h1 className="mt-4 font-display text-4xl tracking-tight text-ink">{currentUser.name}</h1>
            <p className="mt-3 text-sm leading-7 text-slate">{currentUser.bio || "Meshed member profile ready for demo flows."}</p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.4rem] border border-slate-200 bg-mist/70 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Role</p>
                <p className="mt-2 text-sm font-medium text-ink">{titleCase(currentUser.role)}</p>
              </div>
              <div className="rounded-[1.4rem] border border-slate-200 bg-mist/70 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Wallet</p>
                <p className="mt-2 text-sm font-medium text-ink">
                  {currentUser.walletAddress ? "Connected" : "Pending"}
                </p>
              </div>
              <div className="rounded-[1.4rem] border border-slate-200 bg-mist/70 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">World verification</p>
                <p className="mt-2 text-sm font-medium text-ink">
                  {currentUser.worldVerified ? "Verified Human" : "Pending"}
                </p>
              </div>
              <div className="rounded-[1.4rem] border border-slate-200 bg-mist/70 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Badges</p>
                <p className="mt-2 text-sm font-medium text-ink">
                  {currentUser.verificationBadges.length
                    ? currentUser.verificationBadges.map(titleCase).join(", ")
                    : "No trust badges yet"}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.4rem] border border-slate-200 bg-white px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Skills</p>
                <p className="mt-2 text-sm text-ink">
                  {currentUser.skills.length ? currentUser.skills.join(", ") : "No skills saved yet"}
                </p>
              </div>
              <div className="rounded-[1.4rem] border border-slate-200 bg-white px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Sectors</p>
                <p className="mt-2 text-sm text-ink">
                  {currentUser.sectors.length ? currentUser.sectors.join(", ") : "No sectors saved yet"}
                </p>
              </div>
              <div className="rounded-[1.4rem] border border-slate-200 bg-white px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">LinkedIn</p>
                <p className="mt-2 break-all text-sm text-ink">
                  {currentUser.linkedinUrl ?? "Not linked yet"}
                </p>
              </div>
              <div className="rounded-[1.4rem] border border-slate-200 bg-white px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Outside-network access</p>
                <p className="mt-2 text-sm text-ink">
                  {currentUser.outsideNetworkAccessEnabled ? "Enabled for trusted intros" : "Limited to current network"}
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-[2rem] border border-white/80 bg-[linear-gradient(180deg,rgba(238,242,247,0.9),rgba(255,255,255,0.95))] p-6 shadow-sm sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate">Connection state</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-[1.4rem] border border-white/85 bg-white/90 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Connected</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">{connectedContacts.length}</p>
              </div>
              <div className="rounded-[1.4rem] border border-white/85 bg-white/90 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Pending incoming</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">
                  {connectionState.pendingIncomingRequests.length}
                </p>
              </div>
              <div className="rounded-[1.4rem] border border-white/85 bg-white/90 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Pending outgoing</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">{outgoingContacts.length}</p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Button href="/agent" variant="secondary">
                Open Agent
              </Button>
              <Button href="/agent?mode=setup" variant="secondary">
                Update setup with Agent
              </Button>
              <Button href="/dashboard" variant="secondary">
                Open dashboard
              </Button>
              <LogoutButton />
            </div>
          </article>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.96fr_1.04fr]">
          <article className="rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-sm sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate">Company memberships</p>
            <div className="mt-4 space-y-3">
              {memberships.length === 0 ? (
                <div className="rounded-[1.4rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate">
                  No company membership is linked yet.
                </div>
              ) : (
                memberships.map((membership: (typeof memberships)[number]) => (
                  <div key={membership.id} className="rounded-[1.4rem] border border-slate-200 bg-mist/60 px-4 py-4">
                    <p className="text-sm font-semibold text-ink">{membership.company.name}</p>
                    <p className="mt-1 text-sm text-slate">
                      {membership.title} | {membership.relation}
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
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate">Current people layer</p>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Connected contacts</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {connectedContacts.length === 0 ? (
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate">
                      None yet
                    </span>
                  ) : (
                    connectedContacts.map((contact: UserSummary) => (
                      <span
                        key={contact.id}
                        className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-ink"
                      >
                        {contact.name}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Incoming requests</p>
                <div className="mt-3 space-y-2">
                  {connectionState.pendingIncomingRequests.length === 0 ? (
                    <div className="rounded-[1.4rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate">
                      No pending requests right now.
                    </div>
                  ) : (
                    connectionState.pendingIncomingRequests.map((request) => (
                      <div key={request.id} className="rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-4">
                        <p className="text-sm font-semibold text-ink">{request.requesterName}</p>
                        <p className="mt-1 text-sm text-slate">{request.message ?? "Sent you a Meshed request."}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Outgoing requests</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {outgoingContacts.length === 0 ? (
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate">
                      None yet
                    </span>
                  ) : (
                    outgoingContacts.map((contact: UserSummary) => (
                      <span
                        key={contact.id}
                        className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-ink"
                      >
                        {contact.name}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>

            <p className="mt-6 text-sm text-slate">
              Current profile view shows {formatRelativeCount(connectedContacts.length, "connected contact")},{" "}
              {formatRelativeCount(connectionState.pendingIncomingRequests.length, "incoming request")}, and{" "}
              {formatRelativeCount(outgoingContacts.length, "outgoing request")}.
            </p>
          </article>
        </div>

        <article className="rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate">Recent verified interactions</p>
          <div className="mt-4 space-y-3">
            {recentInteractions.length === 0 ? (
              <div className="rounded-[1.4rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate">
                No verified interactions recorded yet.
              </div>
            ) : (
              recentInteractions.map((interaction: VerifiedInteractionSummary) => (
                <div key={interaction.id} className="rounded-[1.4rem] border border-slate-200 bg-mist/60 px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-ink">{interactionLabel(interaction)}</p>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate">
                      {interaction.rewardStatus.replaceAll("_", " ")}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate">
                    {interaction.verified ? "World-backed trust layer confirmed." : "Waiting for full verification."}
                  </p>
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
      </section>
    </AppShell>
  );
}
