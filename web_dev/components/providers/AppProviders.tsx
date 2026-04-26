"use client";

import type { ReactNode } from "react";

// Keep client-only providers isolated from the server-rendered app shell.
type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return <>{children}</>;
}
