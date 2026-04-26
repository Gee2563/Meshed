import { AgentExperience } from "@/components/agent/AgentExperience";
import { Button } from "@/components/ui/Button";
import { loadDashboardData } from "@/lib/server/meshed-network/a16z-crypto-dashboard";
import {
  resolveDashboardScopeForEmail,
  resolveDashboardScopeForOrganization,
} from "@/lib/server/meshed-network/dashboard-scope";
import { getCurrentUser } from "@/lib/server/current-user";
import { onboardingService } from "@/lib/server/services/onboarding-service";

export const dynamic = "force-dynamic";

type AgentPageProps = {
  searchParams?: Promise<{
    mode?: string;
  }>;
};

export default async function AgentPage({ searchParams }: AgentPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <main className="px-6 py-16">
        <section className="mx-auto max-w-3xl rounded-[2rem] border border-amber-200 bg-amber-50/80 px-8 py-10 shadow-[0_30px_120px_rgba(15,23,42,0.08)]">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-700">Session required</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900">Meshed Agent starts after sign-in.</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-700">
            Return to the home page, register with World ID, and Meshed will bring you straight into your Agent.
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

  const params = (await searchParams) ?? {};
  const state = await onboardingService.getState(currentUser.id);
  const scope =
    resolveDashboardScopeForOrganization({
      website: state.vcCompany?.website,
      name: state.vcCompany?.name,
    }) ?? resolveDashboardScopeForEmail(currentUser.email);
  const dashboard = await loadDashboardData(scope);

  return (
    <AgentExperience
      currentUserName={currentUser.name}
      currentUserVerified={currentUser.worldVerified}
      currentUserRole={state.user.role}
      currentStep={state.currentStep}
      setupMode={params.mode === "setup"}
      vcCompany={state.vcCompany}
      memberCompany={state.memberCompany}
      vcOptions={state.vcOptions}
      socialConnections={state.socialConnections}
      latestNetworkJob={state.latestNetworkJob}
      initialCompanyNodes={dashboard?.companyGraph.nodes ?? []}
    />
  );
}
