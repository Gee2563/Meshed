export interface VerificationPayload {
  milestoneId: string;
  evidenceReference?: string | null;
  txHash?: string | null;
  rewardAmount?: number;
}

export interface VerificationResult {
  verified: boolean;
  status: "verified" | "rejected";
  providerRef: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentVerificationService {
  verifyPayment(payload: VerificationPayload): Promise<VerificationResult>;
}

export interface ExternalMilestoneVerificationService {
  verifyExternalEvent(payload: VerificationPayload): Promise<VerificationResult>;
}

export interface CrossChainVerificationService {
  verifyCrossChainEvent(payload: VerificationPayload): Promise<VerificationResult>;
}

export interface DataTriggerService {
  evaluateTrigger(payload: VerificationPayload & { eligible: boolean }): Promise<VerificationResult>;
}
