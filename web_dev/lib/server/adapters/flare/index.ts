import { env } from "@/lib/config/env";
import {
  MockCrossChainVerificationService,
  MockDataTriggerService,
  MockExternalVerificationService,
  MockPaymentVerificationService,
} from "@/lib/server/adapters/flare/mock-flare-service";
import {
  RealCrossChainVerificationService,
  RealDataTriggerService,
  RealExternalVerificationService,
  RealPaymentVerificationService,
} from "@/lib/server/adapters/flare/real-flare-service";

export function getFlareAdapters() {
  if (env.USE_MOCK_FLARE) {
    return {
      payment: new MockPaymentVerificationService(),
      external: new MockExternalVerificationService(),
      crossChain: new MockCrossChainVerificationService(),
      dataTrigger: new MockDataTriggerService(),
    };
  }

  return {
    payment: new RealPaymentVerificationService(),
    external: new RealExternalVerificationService(),
    crossChain: new RealCrossChainVerificationService(),
    dataTrigger: new RealDataTriggerService(),
  };
}
