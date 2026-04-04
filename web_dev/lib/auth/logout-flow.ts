// Centralize logout ordering so Meshed session cleanup always happens before best-effort SDK cleanup.
type LogoutFlowDependencies = {
  clearServerSession: () => Promise<Response>;
  clearDynamicSession?: () => Promise<void>;
  onDynamicLogoutError?: (error: unknown) => void;
  redirect: (href: string) => void;
};

export async function runLogoutFlow({
  clearServerSession,
  clearDynamicSession,
  onDynamicLogoutError,
  redirect,
}: LogoutFlowDependencies) {
  const response = await clearServerSession();
  if (!response.ok) {
    throw new Error(`Logout request failed with status ${response.status}.`);
  }

  if (clearDynamicSession) {
    try {
      await clearDynamicSession();
    } catch (error) {
      // Dynamic logout errors are useful to log, but they should not block sign-out completion.
      onDynamicLogoutError?.(error);
    }
  }

  redirect("/");
}
