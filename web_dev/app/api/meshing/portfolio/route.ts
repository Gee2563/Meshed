import { requireCurrentUser } from "@/lib/server/current-user";
import { ApiError, fail, ok, parseJson } from "@/lib/server/http";
import { getMeshingContractsService } from "@/lib/server/services/meshing-contract-service";
import { registerMeshingPortfolioSchema } from "@/lib/server/validation/meshing-schemas";

export async function POST(request: Request) {
  try {
    const currentUser = await requireCurrentUser();
    const body = await parseJson(request, registerMeshingPortfolioSchema);
    const investorAddress = body.investorAddress ?? currentUser.walletAddress;
    if (!investorAddress) {
      throw new ApiError(400, "Investor wallet address is required.");
    }

    const result = await getMeshingContractsService().registerPortfolio({
      investorAddress,
      companies: body.companies ?? [],
      founders: body.founders ?? [],
    });

    return ok(result);
  } catch (error) {
    return fail(error);
  }
}
