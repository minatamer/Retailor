import { z } from "zod";
import { IdSchema } from "./core.js";
import { PhotoSchema } from "./photos.js";
import { ProductInputSchema } from "./product.js";
export const DraftItemSchema = z.strictObject({
  product: ProductInputSchema,
  included: z.boolean(),
  reviewReason: z.string().max(200),
  confirmedClothing: z.boolean(),
  copyOrigin: z.enum(["generated", "user_supplied"]),
  linkOrigin: z
    .enum(["recognition", "development-fixture", "manual"])
    .optional(),
});
const DispositionSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    photoId: IdSchema,
    kind: z.literal("linked"),
    productIds: z.array(IdSchema).min(1).max(20),
  }),
  z.strictObject({
    photoId: IdSchema,
    kind: z.literal("review"),
    reason: z.string().min(1).max(200),
  }),
  z.strictObject({
    photoId: IdSchema,
    kind: z.literal("rejected"),
    reason: z.string().min(1).max(200),
  }),
  z.strictObject({
    photoId: IdSchema,
    kind: z.literal("duplicate"),
    originalId: IdSchema,
  }),
]);
export const DraftSchema = z.strictObject({
  schemaVersion: z.literal(1),
  operationId: IdSchema,
  inputRevision: z.number().int().nonnegative(),
  mode: z.enum(["development-fixture", "live"]),
  photos: z.array(PhotoSchema).min(1).max(24),
  items: z.array(DraftItemSchema).max(20),
  dispositions: z.array(DispositionSchema).min(1).max(24),
  corrections: z
    .array(
      z.strictObject({
        productId: IdSchema,
        before: ProductInputSchema,
        reason: z.string().min(1).max(100),
      }),
    )
    .max(40),
});
export type CatalogueDraft = z.infer<typeof DraftSchema>;
export type DraftItem = z.infer<typeof DraftItemSchema>;
export function parseDraft(input: unknown): CatalogueDraft {
  const draft = DraftSchema.parse(input),
    photos = new Map(draft.photos.map((photo) => [photo.id, photo])),
    products = new Map(draft.items.map((item) => [item.product.id, item]));
  if (
    photos.size !== draft.photos.length ||
    products.size !== draft.items.length ||
    new Set(draft.dispositions.map((item) => item.photoId)).size !==
      draft.photos.length
  )
    throw new Error("Every photo and product needs a unique valid identity.");
  const variants = draft.items.flatMap((item) =>
    item.product.variants.map((variant) => variant.id),
  );
  if (new Set(variants).size !== variants.length || variants.length > 288)
    throw new Error("Draft option identities exceed their valid envelope.");
  for (const item of draft.items) {
    const options = item.product.variants.map(
      (variant) =>
        `${variant.size.toLowerCase()}:${variant.colour.toLowerCase()}`,
    );
    if (new Set(options).size !== options.length)
      throw new Error("Each garment needs distinct size and colour options.");
    if (
      new Set(item.product.imageIds).size !== item.product.imageIds.length ||
      item.product.imageIds.some((id) => !photos.has(id))
    )
      throw new Error("A draft has an unavailable source reference.");
    if (item.included && !item.confirmedClothing)
      throw new Error("Confirm ambiguous clothing before including it.");
    for (const attr of item.product.attributes)
      if (
        attr.sourceIds.some((id) => !item.product.imageIds.includes(id)) ||
        (attr.provenance === "unknown" && attr.value !== null) ||
        (attr.provenance === "image_observed" && !attr.sourceIds.length)
      )
        throw new Error("A fact must preserve its supported photo provenance.");
  }
  for (const disposition of draft.dispositions) {
    if (!photos.has(disposition.photoId))
      throw new Error("Input coverage contains an unknown photo.");
    if (disposition.kind === "duplicate") {
      const original = photos.get(disposition.originalId),
        duplicate = photos.get(disposition.photoId)!;
      if (
        !original ||
        original.id === duplicate.id ||
        original.derivative.hash !== duplicate.derivative.hash
      )
        throw new Error("An exact duplicate needs matching validated bytes.");
    }
    if (
      disposition.kind === "linked" &&
      (new Set(disposition.productIds).size !== disposition.productIds.length ||
        disposition.productIds.some(
          (id) =>
            !products.get(id)?.product.imageIds.includes(disposition.photoId),
        ))
    )
      throw new Error("Photo grouping has a dangling product reference.");
  }
  for (const item of draft.items.filter((item) => item.included))
    for (const id of item.product.imageIds) {
      const disposition = draft.dispositions.find((row) => row.photoId === id);
      if (
        disposition?.kind !== "linked" ||
        !disposition.productIds.includes(item.product.id)
      )
        throw new Error("Included products require complete source coverage.");
    }
  return draft;
}
