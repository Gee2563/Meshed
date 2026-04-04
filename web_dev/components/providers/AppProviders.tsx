"use client";

import type { ReactNode } from "react";

import { DynamicWalletProvider } from "@/components/providers/DynamicWalletProvider";

// Keep client-only providers isolated from the server-rendered app shell.
type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return <DynamicWalletProvider>{children}</DynamicWalletProvider>;
}
