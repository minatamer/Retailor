import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { inspectRaster } from "@retailor/contracts/raster";
import { validateDerivatives } from "./validate-images.js";
async function fixture() {
  const bytes = await sharp({
    create: { width: 24, height: 32, channels: 3, background: "#d0d0d0" },
  })
    .jpeg()
    .toBuffer();
  return {
    bytes,
    image: {
      id: "photo",
      hash: createHash("sha256").update(bytes).digest("hex"),
      mime: "image/jpeg",
      width: 24,
      height: 32,
      bytes: bytes.length,
    },
  };
}
describe("independent backend derivative acceptance", () => {
  it("decodes actual JPEG pixels and verifies exact hash/coverage", async () => {
    const { bytes, image } = await fixture();
    expect(
      await validateDerivatives([image], new Map([[image.id, bytes]])),
    ).toEqual([image]);
    await expect(
      validateDerivatives(
        [{ ...image, hash: "a".repeat(64) }],
        new Map([[image.id, bytes]]),
      ),
    ).rejects.toThrow("manifest");
    await expect(validateDerivatives([image], new Map())).rejects.toThrow(
      "coverage",
    );
  });
  it("rejects metadata and intact headers with corrupt compressed pixels", async () => {
    const { bytes, image } = await fixture();
    const metadata = await sharp(bytes)
      .withExif({ IFD0: { Artist: "PRIVATE" } })
      .jpeg()
      .toBuffer();
    const metaImage = {
      ...image,
      bytes: metadata.length,
      hash: createHash("sha256").update(metadata).digest("hex"),
    };
    await expect(
      validateDerivatives([metaImage], new Map([[image.id, metadata]])),
    ).rejects.toThrow("manifest");
    const corrupt = Buffer.from(bytes);
    const scan = corrupt.indexOf(Buffer.from([255, 218]));
    corrupt.fill(255, scan + 15, corrupt.length - 2);
    const damaged = {
      ...image,
      hash: createHash("sha256").update(corrupt).digest("hex"),
    };
    expect(inspectRaster(corrupt).width).toBe(24);
    await expect(
      validateDerivatives([damaged], new Map([[image.id, corrupt]])),
    ).rejects.toThrow();
  });
  it("rejects already cancelled input without starting decode", async () => {
    const { bytes, image } = await fixture();
    await expect(
      validateDerivatives(
        [image],
        new Map([[image.id, bytes]]),
        AbortSignal.abort(),
      ),
    ).rejects.toThrow();
  });
  it("decodes every exact shipped sample asset and verifies its manifest", async () => {
    const root = new URL(
      "../../../../apps/frontend/public/sample/forme/",
      import.meta.url,
    );
    const manifest: unknown = JSON.parse(
      await readFile(new URL("manifest.json", root), "utf8"),
    );
    const { SampleManifestSchema } = await import("@retailor/contracts/photos");
    const sample = SampleManifestSchema.parse(manifest);
    const files = new Map<string, Uint8Array>();
    for (const asset of sample.assets)
      files.set(asset.id, await readFile(new URL(`${asset.id}.webp`, root)));
    expect(
      (
        await validateDerivatives(
          sample.assets.map((asset) => asset.image),
          files,
        )
      ).length,
    ).toBe(20);
  });
});
