import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "..");

function readJson(filePath: string) {
  return JSON.parse(readFileSync(path.join(root, filePath), "utf-8")) as Record<string, unknown>;
}

function walkFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = path.join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      return walkFiles(fullPath);
    }

    return [fullPath];
  });
}

describe("World-enabled Meshed structure", () => {
  it("keeps MiniKit and World ID dependencies in the new app", () => {
    const packageJson = readJson("package.json");
    const dependencies = packageJson.dependencies as Record<string, string>;

    expect(dependencies["@worldcoin/minikit-js"]).toBeTruthy();
    expect(dependencies["@worldcoin/idkit"]).toBeTruthy();
    expect(dependencies["@worldcoin/idkit-core"]).toBeTruthy();
  });

  it("keeps implementation inside the new Meshed target", () => {
    expect(statSync(path.join(root, "app/page.tsx")).isFile()).toBe(true);
    expect(statSync(path.join(root, "components/providers/MiniKitClientProvider.tsx")).isFile()).toBe(true);
    expect(statSync(path.join(root, "app/api/auth/world/wallet-auth/verify/route.ts")).isFile()).toBe(true);
  });

  it("does not reframe visible app copy around World Mini App discovery", () => {
    const scannedRoots = ["app", "components", "README.md"];
    const files = scannedRoots.flatMap((entry) => {
      const fullPath = path.join(root, entry);
      return statSync(fullPath).isDirectory() ? walkFiles(fullPath) : [fullPath];
    });
    const visibleCopy = files
      .filter((file) => /\.(tsx|ts|md)$/.test(file))
      .map((file) => readFileSync(file, "utf-8"))
      .join("\n");

    expect(visibleCopy).not.toMatch(/World Mini App ecosystem/i);
    expect(visibleCopy).not.toMatch(/\bMini Apps\b/);
    expect(visibleCopy).not.toMatch(/family offices/i);
    expect(visibleCopy).not.toMatch(/private equity/i);
  });
});
