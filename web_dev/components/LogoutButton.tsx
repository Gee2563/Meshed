"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { clearDynamicBrowserSession } from "@/lib/auth/dynamic-browser-logout";
import { runLogoutFlow } from "@/lib/auth/logout-flow";

// Small client wrapper that keeps logout behavior consistent anywhere the button appears.
export function LogoutButton() {
  return <SharedLogoutButton clearDynamicSession={clearDynamicBrowserSession} />;
}

type SharedLogoutButtonProps = {
  clearDynamicSession?: () => Promise<void>;
};

function SharedLogoutButton({ clearDynamicSession }: SharedLogoutButtonProps) {
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogout = async () => {
    setPending(true);
    setErrorMessage(null);

    try {
      // runLogoutFlow clears the Meshed session before attempting best-effort Dynamic cleanup.
      await runLogoutFlow({
        clearDynamicSession,
        clearServerSession: () =>
          fetch("/api/auth/logout", {
            method: "POST",
            cache: "no-store",
            credentials: "same-origin",
          }),
        onDynamicLogoutError: (error) => {
          console.warn("[meshed][logout] Dynamic wallet logout failed after server session cleared.", error);
        },
        redirect: (href) => {
          window.location.replace(href);
        },
      });
    } catch (error) {
      console.error("[meshed][logout] Logout failed.", error);
      setErrorMessage("Logout failed. Please try again.");
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <Button variant="secondary" onClick={handleLogout} disabled={pending}>
        {pending ? "Logging out..." : "Log out"}
      </Button>
      {errorMessage ? <p className="text-xs text-rose-600">{errorMessage}</p> : null}
    </div>
  );
}
