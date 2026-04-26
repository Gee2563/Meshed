// Centralize logout ordering so Meshed session cleanup always happens before redirecting home.
type LogoutFlowDependencies = {
  clearServerSession: () => Promise<Response>;
  redirect: (href: string) => void;
};

export async function runLogoutFlow({
  clearServerSession,
  redirect,
}: LogoutFlowDependencies) {
  const response = await clearServerSession();
  if (!response.ok) {
    throw new Error(`Logout request failed with status ${response.status}.`);
  }

  redirect("/");
}
