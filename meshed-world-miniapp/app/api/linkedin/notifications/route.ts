import { requireCurrentUser } from "@/lib/server/current-user";
import { fail, ok } from "@/lib/server/http";
import { linkedinActivityService } from "@/lib/server/services/linkedin-activity-service";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    const result = await linkedinActivityService.listNotificationsForUser(user.id);
    return ok(result);
  } catch (error) {
    return fail(error);
  }
}
