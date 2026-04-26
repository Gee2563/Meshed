export const userRoles = ["investor", "founder", "employee"] as const;

export type CanonicalUserRole = (typeof userRoles)[number];
export type PersistedUserRole =
  | "INVESTOR"
  | "FOUNDER"
  | "EMPLOYEE"
  | "COMPANY"
  | "CONSULTANT"
  | "MENTOR"
  | "OPERATOR"
  | "ADMIN";

export function normalizeUserRole(value: string): CanonicalUserRole {
  const role = value.trim().toLowerCase();

  if (role === "investor") {
    return "investor";
  }

  if (role === "founder" || role === "operator" || role === "company") {
    return "founder";
  }

  return "employee";
}

export function roleForPersistence(role: CanonicalUserRole): "INVESTOR" | "FOUNDER" | "EMPLOYEE" {
  switch (role) {
    case "investor":
      return "INVESTOR";
    case "founder":
      return "FOUNDER";
    default:
      return "EMPLOYEE";
  }
}

export function roleLabel(role: CanonicalUserRole) {
  switch (role) {
    case "investor":
      return "Investor";
    case "founder":
      return "Founder";
    default:
      return "Employee";
  }
}
