"use client";

import type { ReactNode } from "react";

import { MiniKitClientProvider } from "@/components/providers/MiniKitClientProvider";

// Keep client-only providers isolated from the server-rendered app shell.
type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return <MiniKitClientProvider>{children}</MiniKitClientProvider>;
}
