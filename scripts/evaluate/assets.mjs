import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { SampleManifestSchema } from "@retailor/contracts/photos";
import { inspectRaster } from "@retailor/contracts/raster";
const backendRequire = createRequire(
  new URL("../../apps/backend/package.json", import.meta.url),
);
const sharp = backendRequire("sharp");
const root = new URL("../../", import.meta.url);
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const fontNames = [
  "inter-latin-wght-normal.woff2",
  "dm-sans-latin-wght-normal.woff2",
  "dm-serif-display-latin-400-normal.woff2",
  "dm-serif-display-latin-400-italic.woff2",
  "manrope-latin-wght-normal.woff2",
];

/** Fixed shipped assets only. No visitor path, secret file or provider interpretation. */
export async function inspectAssets() {
  const manifestBytes = await readFile(
    new URL("apps/frontend/public/sample/forme/manifest.json", root),
  );
  const manifest = SampleManifestSchema.parse(
    JSON.parse(manifestBytes.toString("utf8")),
  );
  const inputs = [];
  for (const [index, asset] of manifest.assets.entries()) {
    if (asset.id !== `F${String(index + 1).padStart(2, "0")}`)
      throw new Error("Invalid fixed asset order");
    const bytes = await readFile(
      new URL(`apps/frontend/public/sample/forme/${asset.id}.webp`, root),
    );
    const raster = inspectRaster(bytes);
    if (
      hash(bytes) !== asset.image.hash ||
      bytes.length !== asset.image.bytes ||
      raster.width !== asset.image.width ||
      raster.height !== asset.image.height ||
      raster.mime !== asset.image.mime
    )
      throw new Error("Public asset integrity mismatch");
    await sharp(bytes, { limitInputPixels: 24_000_000 }).raw().toBuffer();
    inputs.push({
      bytes,
      photo: { id: asset.id, source: asset.image, derivative: asset.image },
    });
  }
  const fonts = [];
  for (const name of fontNames) {
    const bytes = await readFile(
      new URL(`apps/frontend/public/fonts/${name}`, root),
    );
    if (bytes.subarray(0, 4).toString("ascii") !== "wOF2")
      throw new Error("Invalid fixed font");
    fonts.push({ name, bytes: bytes.length, sha256: hash(bytes) });
  }
  return {
    inputs,
    publicRecord: {
      manifestSha256: hash(manifestBytes),
      lockSha256: hash(await readFile(new URL("pnpm-lock.yaml", root))),
      // Exact-byte aggregate covers the original collection and its alternate views.
      provenanceSha256: hash(
        Buffer.concat(
          await Promise.all(
            [
              "docs/research/FORME-GENERATION.json",
              "docs/research/RTL-042-SAMPLE-VIEWS.json",
            ].map(async (path) =>
              Buffer.concat([
                Buffer.from(`${path}\0`),
                await readFile(new URL(path, root)),
                Buffer.from("\0"),
              ]),
            ),
          ),
        ),
      ),
      photos: manifest.assets.map(({ id, image, origin }) => ({
        id,
        ...image,
        origin,
      })),
      photoBytes: inputs.reduce((sum, input) => sum + input.bytes.length, 0),
      fonts,
    },
  };
}
