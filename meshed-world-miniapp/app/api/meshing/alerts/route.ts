import { requireCurrentUser } from "@/lib/server/current-user";
import { ApiError, fail, ok } from "@/lib/server/http";
import { getMeshingContractsService } from "@/lib/server/services/meshing-contract-service";

export async function GET(request: Request) {
  try {
    const currentUser = await requireCurrentUser();
    const { searchParams } = new URL(request.url);
    const investorAddress = searchParams.get("investor") ?? currentUser.walletAddress;
    if (!investorAddress) {
      throw new ApiError(400, "Investor address is required.");
    }

    const result = await getMeshingContractsService().getInvestorAlerts(investorAddress);
    return ok(result);
  } catch (error) {
    return fail(error);
  }
}
