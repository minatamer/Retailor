import { createHash } from "node:crypto";
import sharp from "sharp";
import {
  PHOTO_LIMITS,
  RecognitionManifestSchema,
} from "@retailor/contracts/photos";
import type { RecognitionManifest } from "@retailor/contracts/photos";
import { inspectRaster } from "@retailor/contracts/raster";

/** No provider, disk, URL fetch or public route. RTL-006 supplies bounded transport. */
export async function validateDerivatives(
  manifestInput: unknown,
  files: ReadonlyMap<string, Uint8Array>,
  signal?: AbortSignal,
): Promise<RecognitionManifest> {
  const manifest = RecognitionManifestSchema.parse(manifestInput);
  if (files.size !== manifest.length)
    throw new Error("Image coverage mismatch");
  for (const image of manifest) {
    signal?.throwIfAborted();
    const bytes = files.get(image.id);
    if (
      !bytes ||
      bytes.length !== image.bytes ||
      bytes.length > PHOTO_LIMITS.derivative
    )
      throw new Error("Image byte mismatch");
    const header = inspectRaster(bytes);
    if (
      header.mime !== image.mime ||
      header.width !== image.width ||
      header.height !== image.height ||
      header.privateMetadata ||
      createHash("sha256").update(bytes).digest("hex") !== image.hash
    )
      throw new Error("Image manifest mismatch");
    const decoder = sharp(bytes, {
      limitInputPixels: PHOTO_LIMITS.derivativeSide ** 2,
      failOn: "warning",
      sequentialRead: true,
    });
    const abort = () => decoder.destroy();
    signal?.addEventListener("abort", abort, { once: true });
    try {
      const metadata = await decoder.metadata();
      if (
        metadata.width !== image.width ||
        metadata.height !== image.height ||
        (metadata.pages ?? 1) !== 1 ||
        metadata.exif ||
        metadata.xmp ||
        metadata.iptc
      )
        throw new Error("Image decode mismatch");
      // Header metadata alone does not prove intact compressed pixels.
      await decoder.stats();
      signal?.throwIfAborted();
    } finally {
      signal?.removeEventListener("abort", abort);
      decoder.destroy();
    }
  }
  return manifest;
}
