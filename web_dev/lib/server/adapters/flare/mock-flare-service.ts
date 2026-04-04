import type {
  CrossChainVerificationService,
  DataTriggerService,
  ExternalMilestoneVerificationService,
  PaymentVerificationService,
  VerificationPayload,
  VerificationResult,
} from "@/lib/server/adapters/flare/types";

function buildResult(prefix: string, payload: VerificationPayload, extra?: Record<string, unknown>): VerificationResult {
  return {
    verified: true,
    status: "verified",
    providerRef: `${prefix}:${payload.milestoneId}`,
    metadata: extra,
  };
}

export class MockPaymentVerificationService implements PaymentVerificationService {
  async verifyPayment(payload: VerificationPayload): Promise<VerificationResult> {
    return buildResult("flare:mock:payment", payload, { txHash: payload.txHash ?? null });
  }
}

export class MockExternalVerificationService implements ExternalMilestoneVerificationService {
  async verifyExternalEvent(payload: VerificationPayload): Promise<VerificationResult> {
    return buildResult("flare:mock:external", payload, {
      evidenceReference: payload.evidenceReference ?? null,
    });
  }
}

export class MockCrossChainVerificationService implements CrossChainVerificationService {
  async verifyCrossChainEvent(payload: VerificationPayload): Promise<VerificationResult> {
    return buildResult("flare:mock:cross-chain", payload, { txHash: payload.txHash ?? null });
  }
}

export class MockDataTriggerService implements DataTriggerService {
  async evaluateTrigger(
    payload: VerificationPayload & { eligible: boolean },
  ): Promise<VerificationResult> {
    return {
      verified: payload.eligible,
      status: payload.eligible ? "verified" : "rejected",
      providerRef: `flare:mock:data-trigger:${payload.milestoneId}`,
      metadata: {
        eligible: payload.eligible,
      },
    };
  }
}
