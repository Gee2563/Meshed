import { env } from "@/lib/config/env";
import { MockDynamicService } from "@/lib/server/adapters/dynamic/mock-dynamic-service";
import { RealDynamicService } from "@/lib/server/adapters/dynamic/real-dynamic-service";

export function getWalletLinkService() {
  return env.USE_MOCK_DYNAMIC ? new MockDynamicService() : new RealDynamicService();
}
