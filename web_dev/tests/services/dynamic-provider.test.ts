import { describe, expect, it } from "vitest";

import {
  MeshedWalletConnectors,
  getDynamicProviderRenderMode,
  getDynamicProviderSettings,
} from "@/lib/config/dynamic-provider";

describe("dynamic provider settings", () => {
  it("returns null when Dynamic is in mock mode", () => {
    expect(
      getDynamicProviderSettings({
        dynamicEnvironmentId: "217bebe9-3f23-46ff-9806-7925c1d898f2",
        useMockDynamic: true,
        appUrl: "http://localhost:3000",
      }),
    ).toBeNull();
  });

  it("returns null for an invalid environment id", () => {
    expect(
      getDynamicProviderSettings({
        dynamicEnvironmentId: "not-a-real-env",
        useMockDynamic: false,
        appUrl: "http://localhost:3000",
      }),
    ).toBeNull();
  });

  it("builds safe provider settings from a valid environment id and absolute app url", () => {
    expect(
      getDynamicProviderSettings({
        dynamicEnvironmentId: "217bebe9-3f23-46ff-9806-7925c1d898f2",
        useMockDynamic: false,
        appUrl: "http://localhost:3000/",
      }),
    ).toEqual(
      expect.objectContaining({
        environmentId: "217bebe9-3f23-46ff-9806-7925c1d898f2",
        appName: "Meshed",
        appLogoUrl: "http://localhost:3000/meshed-mark.svg",
        debugError: true,
        logLevel: "DEBUG",
        walletConnectors: [MeshedWalletConnectors],
      }),
    );
  });

  it("omits the logo url when the public app url is not a valid absolute origin", () => {
    expect(
      getDynamicProviderSettings({
        dynamicEnvironmentId: "217bebe9-3f23-46ff-9806-7925c1d898f2",
        useMockDynamic: false,
        appUrl: "/relative-only",
      }),
    ).toEqual(
      expect.objectContaining({
        environmentId: "217bebe9-3f23-46ff-9806-7925c1d898f2",
        appName: "Meshed",
        debugError: true,
        logLevel: "DEBUG",
        walletConnectors: [MeshedWalletConnectors],
      }),
    );
  });

  it("renders a loading state before mount when live Dynamic settings exist", () => {
    const settings = getDynamicProviderSettings({
      dynamicEnvironmentId: "217bebe9-3f23-46ff-9806-7925c1d898f2",
      useMockDynamic: false,
      appUrl: "http://localhost:3000/",
    });

    expect(
      getDynamicProviderRenderMode({
        mounted: false,
        settings,
      }),
    ).toBe("loading");
  });

  it("renders fallback immediately when live Dynamic settings do not exist", () => {
    expect(
      getDynamicProviderRenderMode({
        mounted: false,
        settings: null,
      }),
    ).toBe("fallback");
  });
});
