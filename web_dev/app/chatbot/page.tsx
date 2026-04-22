import ChatbotClient from "@/app/chatbot/ChatbotClient";
import { loadDashboardData } from "@/lib/server/meshed-network/a16z-crypto-dashboard";
import { resolveDashboardScopeForEmail } from "@/lib/server/meshed-network/dashboard-scope";
import { getCurrentUser } from "@/lib/server/current-user";

export const dynamic = "force-dynamic";

export default async function ChatbotPage() {
  const currentUser = await getCurrentUser();
  const scope = resolveDashboardScopeForEmail(currentUser?.email);
  const dashboard = await loadDashboardData(scope);

  return <ChatbotClient companyNodes={dashboard?.companyGraph.nodes ?? []} />;
}
