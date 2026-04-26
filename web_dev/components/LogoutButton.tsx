"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { runLogoutFlow } from "@/lib/auth/logout-flow";

// Small client wrapper that keeps Meshed session logout behavior consistent anywhere the button appears.
export function LogoutButton() {
  return <SharedLogoutButton />;
}

function SharedLogoutButton() {
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogout = async () => {
    setPending(true);
    setErrorMessage(null);

    try {
      // runLogoutFlow clears the server-side Meshed session before redirecting home.
      await runLogoutFlow({
        clearServerSession: () =>
          fetch("/api/auth/logout", {
            method: "POST",
            cache: "no-store",
            credentials: "same-origin",
          }),
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
