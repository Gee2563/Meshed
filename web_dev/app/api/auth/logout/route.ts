import { buildSessionClearedResponse } from "@/lib/server/session-response";

export async function POST() {
  return buildSessionClearedResponse();
}
