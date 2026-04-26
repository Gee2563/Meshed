"use client";

import { MiniKitProvider } from "@worldcoin/minikit-js/minikit-provider";
import type { ReactNode } from "react";

import { clientEnv } from "@/lib/config/env";

type MiniKitClientProviderProps = {
  children: ReactNode;
};

export function MiniKitClientProvider({ children }: MiniKitClientProviderProps) {
  return <MiniKitProvider props={{ appId: clientEnv.worldAppId }}>{children}</MiniKitProvider>;
}
