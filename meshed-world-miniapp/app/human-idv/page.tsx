import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/server/current-user";

export const dynamic = "force-dynamic";

export default async function HumanIdvPage() {
  const currentUser = await getCurrentUser();
  redirect(currentUser ? "/agent" : "/");
}
