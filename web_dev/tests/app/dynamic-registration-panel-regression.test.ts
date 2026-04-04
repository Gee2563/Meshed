import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const webDevRoot = path.resolve(__dirname, "..", "..");

describe("dynamic registration panel regression", () => {
  it("does not manually invoke embedded wallet creation from the Meshed panel", () => {
    const panelPath = path.join(webDevRoot, "components", "DynamicRegistrationPanel.tsx");
    const source = readFileSync(panelPath, "utf8");

    expect(source).not.toContain("createEmbeddedWallet()");
  });
});
