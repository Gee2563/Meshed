import type { UserSummary } from "@/lib/types";
import { titleCase } from "@/lib/utils";

export function getDemoRoleLabel(user: Pick<UserSummary, "email" | "role">) {
  if (user.email.trim().toLowerCase() === "georgegds92@gmail.com") {
    return "Founder";
  }

  return titleCase(user.role);
}
