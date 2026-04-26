"use client";

import type { DynamicClient } from "@dynamic-labs-sdk/client";
import {
  createDynamicClient,
  initializeClient,
  logout,
  waitForClientInitialized,
} from "@dynamic-labs-sdk/client";

import { clientEnv } from "@/lib/config/env";

const DYNAMIC_AUTH_COOKIE_NAME = "DYNAMIC_JWT_TOKEN";

// Lazily cache a fallback client for cases where the SDK has no default browser instance yet.
let fallbackLogoutClient: DynamicClient | null = null;

function clearDynamicAuthCookie() {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${DYNAMIC_AUTH_COOKIE_NAME}=; Max-Age=-99999999; path=/; SameSite=Lax`;
}

async function getFallbackLogoutClient() {
  if (!clientEnv.dynamicEnvironmentId) {
    throw new Error("Dynamic environment id is not configured.");
  }

  if (!fallbackLogoutClient) {
    // Mirror the app metadata Dynamic expects so fallback logout uses the same environment context.
    fallbackLogoutClient = createDynamicClient({
      autoInitialize: false,
      environmentId: clientEnv.dynamicEnvironmentId,
      metadata: {
        name: "Meshed",
        universalLink: clientEnv.appUrl,
      },
    });
  }

  if (fallbackLogoutClient.initStatus === "uninitialized" || fallbackLogoutClient.initStatus === "failed") {
    await initializeClient(fallbackLogoutClient);
  } else if (fallbackLogoutClient.initStatus === "in-progress") {
    await waitForClientInitialized(fallbackLogoutClient);
  }

  return fallbackLogoutClient;
}

export async function clearDynamicBrowserSession() {
  try {
    if (clientEnv.useMockDynamic || !clientEnv.dynamicEnvironmentId) {
      return;
    }

    try {
      await logout();
    } catch {
      // Some browser states do not have a ready default client, so retry with a lazily initialized one.
      const client = await getFallbackLogoutClient();
      await logout(client);
    }
  } finally {
    // Always clear the cookie locally so stale browser auth does not survive a partial logout.
    clearDynamicAuthCookie();
  }
}
