import { z } from "zod";
import { IdSchema, ImageSchema } from "./core.js";

export const PHOTO_LIMITS = Object.freeze({
  selection: 24,
  sources: 32,
  original: 4 * 1024 * 1024,
  originals: 40 * 1024 * 1024,
  pixels: 24_000_000,
  side: 10_000,
  derivativeSide: 1600,
  derivative: 768 * 1024,
  derivatives: 18 * 1024 * 1024,
  cachedDerivatives: 24 * 1024 * 1024,
  originCache: 80 * 1024 * 1024,
  decodeMs: 10_000,
});
export const HashSchema = z.string().regex(/^[a-f0-9]{64}$/u);
export const DerivativeSchema = ImageSchema.refine(
  (image) =>
    Math.max(image.width, image.height) <= PHOTO_LIMITS.derivativeSide &&
    image.bytes <= PHOTO_LIMITS.derivative,
  "Preview exceeds the derivative envelope",
);
export const PhotoSchema = z
  .strictObject({
    id: IdSchema,
    source: ImageSchema,
    derivative: DerivativeSchema,
  })
  .refine(
    (photo) => photo.id === photo.source.id && photo.id === photo.derivative.id,
    "Photo identity mismatch",
  );
export type Photo = z.infer<typeof PhotoSchema>;
export const RecognitionManifestSchema = z
  .array(DerivativeSchema)
  .min(1)
  .max(PHOTO_LIMITS.selection)
  .refine(
    (images) => new Set(images.map((image) => image.id)).size === images.length,
    "Repeated image identity",
  )
  .refine(
    (images) =>
      new Set(images.map((image) => image.hash)).size === images.length,
    "Repeated image bytes",
  )
  .refine(
    (images) =>
      images.reduce((sum, image) => sum + image.bytes, 0) <=
      PHOTO_LIMITS.derivatives,
    "Selection exceeds the transfer envelope",
  );
export type RecognitionManifest = z.infer<typeof RecognitionManifestSchema>;
// Public asset metadata describes inspected bytes, never an authored catalogue.
export const SampleAssetSchema = z.strictObject({
  id: z.string().regex(/^F(?:0[1-9]|1[0-5])$/u),
  path: z.string().regex(/^\/sample\/forme\/F(?:0[1-9]|1[0-5])\.webp$/u),
  image: DerivativeSchema,
  role: z.literal("primary"),
  origin: z.literal("generated_demo"),
});
export const SampleManifestSchema = z
  .strictObject({
    version: z.literal(1),
    assets: z.array(SampleAssetSchema).length(15),
  })
  .refine(
    ({ assets }) =>
      new Set(assets.map((asset) => asset.id)).size === 15 &&
      assets.every(
        (asset) =>
          asset.image.id === asset.id &&
          asset.path === `/sample/forme/${asset.id}.webp`,
      ),
    "Invalid sample identity",
  );
export type SampleManifest = z.infer<typeof SampleManifestSchema>;

/** The caller supplies the actual available-byte set, never just persisted IDs. */
export function requireAvailablePhotos(
  ids: readonly string[],
  available: ReadonlySet<string>,
): void {
  if (
    ids.length < 1 ||
    ids.length > 8 ||
    new Set(ids).size !== ids.length ||
    ids.some((id) => !available.has(id))
  )
    throw new Error("A product needs at least one available, validated photo.");
}
