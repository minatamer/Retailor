import { describe, expect, it } from "vitest";
import { isBuildInput, sourceSnapshot } from "../scripts/release/snapshot.mjs";

describe("release input privacy", () => {
  it("selects shipped sources/assets and refuses secrets, traversal and local outputs", () => {
    for (const path of [
      "apps/backend/src/server.ts",
      "packages/commerce/src/ledger.ts",
      "apps/frontend/public/sample/forme/F15.webp",
      "apps/frontend/public/fonts/inter-OFL.txt",
    ])
      expect(isBuildInput(path)).toBe(true);
    for (const path of [
      "apps/backend/.env.local",
      "apps/frontend/src/.env",
      "apps/frontend/src/../../.env.local",
      "apps/backend/src/server.test.ts",
      "apps/backend/dist/server.js",
      "apps/frontend/public/sample/forme/visitor.webp",
      "apps/frontend/public/design/reference-shirt.png",
      "artifacts/local/guest.json",
      ".git/config",
    ])
      expect(isBuildInput(path)).toBe(false);
  });
  it("fingerprints only regular build inputs without reading ignored files", async () => {
    const result = await sourceSnapshot();
    expect(result.fingerprint).toMatch(/^[a-f0-9]{64}$/u);
    expect(result.files.every(({ path }) => isBuildInput(path))).toBe(true);
    expect(
      result.files.filter(({ path }) => /F\d\d\.webp$/u.test(path)),
    ).toHaveLength(15);
    expect(
      result.files.filter(({ path }) => path.endsWith(".woff2")),
    ).toHaveLength(5);
    expect(
      result.files.filter(({ path }) => path.endsWith("-OFL.txt")),
    ).toHaveLength(4);
  });
});
