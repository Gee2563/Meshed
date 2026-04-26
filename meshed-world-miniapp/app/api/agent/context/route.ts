import { loadDashboardData } from "@/lib/server/meshed-network/a16z-crypto-dashboard";
import {
  resolveDashboardScopeForEmail,
  resolveDashboardScopeForOrganization,
} from "@/lib/server/meshed-network/dashboard-scope";
import { requireCurrentUser } from "@/lib/server/current-user";
import { fail, ok } from "@/lib/server/http";
import { onboardingService } from "@/lib/server/services/onboarding-service";

export async function GET() {
  try {
    const currentUser = await requireCurrentUser();
    const state = await onboardingService.getState(currentUser.id);
    const scope =
      resolveDashboardScopeForOrganization({
        website: state.vcCompany?.website,
        name: state.vcCompany?.name,
      }) ?? resolveDashboardScopeForEmail(currentUser.email);
    const dashboard = await loadDashboardData(scope);
    const painPointCompany = state.memberCompany ?? state.vcCompany;

    return ok({
      currentStep: state.currentStep,
      networkReady: state.networkReady,
      companyNodes: dashboard?.companyGraph.nodes ?? [],
      vcCompanyName: state.vcCompany?.name ?? null,
      memberCompanyName: state.memberCompany?.name ?? null,
      currentPainTags: painPointCompany?.currentPainTags ?? [],
    });
  } catch (error) {
    return fail(error);
  }
}
