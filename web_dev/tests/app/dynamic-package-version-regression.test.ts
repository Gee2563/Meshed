import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const webDevRoot = path.resolve(__dirname, "..", "..");

// Dynamic packages need one exact shared version to avoid duplicate SDK internals at runtime.
describe("dynamic package version regression", () => {
  it("pins direct Dynamic dependencies to one exact shared version", () => {
    const packageJsonPath = path.join(webDevRoot, "package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      dependencies?: Record<string, string>;
    };

    const versions = [
      packageJson.dependencies?.["@dynamic-labs/sdk-react-core"],
      packageJson.dependencies?.["@dynamic-labs/embedded-wallet-evm"],
      packageJson.dependencies?.["@dynamic-labs/waas-evm"],
    ];

    expect(versions).toHaveLength(3);
    expect(new Set(versions).size).toBe(1);

    for (const version of versions) {
      expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    }
  });
});
