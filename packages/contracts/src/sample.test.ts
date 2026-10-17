import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SampleManifestSchema } from "./photos.js";

function manifest() {
  return JSON.parse(
    readFileSync(
      new URL(
        "../../../apps/frontend/public/sample/forme/manifest.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
}
describe("fixed shipped sample identity", () => {
  it("accepts exactly twenty known sources including the F05/F20 colourway", () => {
    const value = SampleManifestSchema.parse(manifest());
    expect(value.assets).toHaveLength(20);
    expect(value.assets.at(-1)).toMatchObject({
      id: "F20",
      path: "/sample/forme/F20.webp",
      role: "colourway",
      relatedTo: "F05",
    });
  });
  it("rejects missing/duplicate/foreign sources, mismatched paths and invalid colourway parents", () => {
    const variants = [
      (value: ReturnType<typeof manifest>) => {
        value.assets.pop();
      },
      (value: ReturnType<typeof manifest>) => {
        value.assets[19] = value.assets[0];
      },
      (value: ReturnType<typeof manifest>) => {
        value.assets[19].id = "F21";
        value.assets[19].image.id = "F21";
        value.assets[19].path = "/sample/forme/F21.webp";
      },
      (value: ReturnType<typeof manifest>) => {
        value.assets[19].path = "/sample/forme/F05.webp";
      },
      (value: ReturnType<typeof manifest>) => {
        value.assets[19].relatedTo = "F20";
      },
      (value: ReturnType<typeof manifest>) => {
        value.assets[19].relatedTo = "F16";
      },
    ];
    for (const change of variants) {
      const value = manifest();
      change(value);
      expect(SampleManifestSchema.safeParse(value).success).toBe(false);
    }
  });
});
