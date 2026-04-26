// Collapse Dynamic's separate auth and wallet milestones into one small UI-friendly state machine.
export type DynamicRegistrationGate =
  | "awaiting_auth"
  | "awaiting_wallet"
  | "ready_to_register";

export function getDynamicRegistrationGate(input: {
  hasUser: boolean;
  hasPrimaryWallet: boolean;
}): DynamicRegistrationGate {
  if (!input.hasUser) {
    return "awaiting_auth";
  }

  if (!input.hasPrimaryWallet) {
    return "awaiting_wallet";
  }

  return "ready_to_register";
}
