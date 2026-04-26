import type { UserSummary } from "@/lib/types";
import { roleLabel } from "@/lib/roles";

export function getDemoRoleLabel(user: Pick<UserSummary, "email" | "role">) {
  if (user.email.trim().toLowerCase() === "georgegds92@gmail.com") {
    return "Founder";
  }

  return roleLabel(user.role);
}
