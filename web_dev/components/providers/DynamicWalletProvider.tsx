"use client";

import { Component, type ComponentProps, type ErrorInfo, type ReactNode, useEffect, useState } from "react";
import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";

import {
  getDynamicProviderDiagnostics,
  getDynamicProviderRenderMode,
  getDynamicProviderSettings,
} from "@/lib/config/dynamic-provider";
import { clientEnv } from "@/lib/config/env";

// Wrap Dynamic's SDK with validation and fallbacks so local misconfiguration does not blank the whole app.
type DynamicWalletProviderProps = {
  children: ReactNode;
};

type DynamicContextSettings = ComponentProps<typeof DynamicContextProvider>["settings"];

type DynamicProviderBoundaryProps = {
  children: ReactNode;
  fallback: ReactNode;
};

type DynamicProviderBoundaryState = {
  hasError: boolean;
};

// Dynamic can throw during bootstrap when the browser state or env config is inconsistent.
class DynamicProviderBoundary extends Component<
  DynamicProviderBoundaryProps,
  DynamicProviderBoundaryState
> {
  state: DynamicProviderBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[meshed][dynamic-provider] DynamicContextProvider crashed, falling back.", {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

export function DynamicWalletProvider({ children }: DynamicWalletProviderProps) {
  const [mounted, setMounted] = useState(false);
  const diagnostics = getDynamicProviderDiagnostics(clientEnv);
  const settings = getDynamicProviderSettings(clientEnv);
  // Wait until after mount before enabling the live provider to avoid SSR/client mismatch issues.
  const renderMode = getDynamicProviderRenderMode({ mounted, settings });

  useEffect(() => {
    console.info("[meshed][dynamic-provider] client env diagnostics", diagnostics);
    setMounted(true);
  }, [diagnostics]);

  useEffect(() => {
    if (renderMode === "loading") {
      console.info("[meshed][dynamic-provider] waiting for client mount before enabling Dynamic.");
      return;
    }

    if (renderMode === "fallback") {
      console.warn("[meshed][dynamic-provider] Dynamic provider disabled, rendering fallback.", diagnostics);
      return;
    }

    console.info("[meshed][dynamic-provider] mounting DynamicContextProvider.", {
      maskedEnvironmentId: diagnostics.maskedEnvironmentId,
      hasAppLogoUrl: Boolean(settings?.appLogoUrl),
    });
  }, [diagnostics, renderMode, settings]);

  if (renderMode === "fallback") {
    return <>{children}</>;
  }

  if (renderMode === "loading") {
    return (
      <div className="rounded-[2rem] border border-slate-200 bg-white/80 p-6 text-sm text-slate-500">
        Preparing secure Dynamic signup...
      </div>
    );
  }

  const liveSettings = settings as DynamicContextSettings;

  return (
    <DynamicProviderBoundary
      fallback={
        <div className="rounded-[2rem] border border-rose-200 bg-rose-50/80 p-6 text-sm text-rose-700">
          Dynamic signup could not be initialized in this session.
        </div>
      }
    >
      <DynamicContextProvider settings={liveSettings}>{children}</DynamicContextProvider>
    </DynamicProviderBoundary>
  );
}
