import { NextResponse } from "next/server";

import { env } from "@/lib/config/env";
import { ApiError, fail, parseJson } from "@/lib/server/http";
import { worldVerificationService } from "@/lib/server/services/world-verification-service";
import { worldRpSignatureSchema } from "@/lib/server/validation/auth-schemas";

export async function POST(request: Request) {
  try {
    const payload = await parseJson(request, worldRpSignatureSchema);
    const action = payload.action ?? env.WORLD_ACTION;
    const signature = worldVerificationService.createRpSignature(action);

    return NextResponse.json(signature);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        {
          error: error.message,
          detail: error.detail ?? null,
        },
        { status: error.status },
      );
    }

    return fail(error);
  }
}
