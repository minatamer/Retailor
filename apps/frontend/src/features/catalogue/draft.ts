import { z } from "zod";
import { IdSchema } from "@retailor/contracts/core";
import { PhotoSchema } from "@retailor/contracts/photos";
import { ProductInputSchema } from "@retailor/contracts/product";
import type { ProductInput } from "@retailor/contracts/product";
export const DraftItemSchema = z.strictObject({
  product: ProductInputSchema,
  included: z.boolean(),
  reviewReason: z.string().max(200),
  confirmedClothing: z.boolean(),
  copyOrigin: z.enum(["generated", "user_supplied"]),
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
export function reconcileCoverage(draft: CatalogueDraft): CatalogueDraft {
  draft.dispositions = draft.photos.map((photo) => {
    const productIds = draft.items
      .filter(
        (item) => item.included && item.product.imageIds.includes(photo.id),
      )
      .map((item) => item.product.id);
    if (productIds.length)
      return { photoId: photo.id, kind: "linked", productIds };
    const previous = draft.dispositions.find((row) => row.photoId === photo.id);
    if (previous?.kind === "review" || previous?.kind === "rejected")
      return previous;
    const uncertain = draft.items.find(
      (item) =>
        !item.confirmedClothing && item.product.imageIds.includes(photo.id),
    );
    if (uncertain)
      return {
        photoId: photo.id,
        kind: "review",
        reason:
          uncertain.reviewReason ||
          "Confirm this garment or explicitly exclude it.",
      };
    return previous?.kind === "duplicate"
      ? previous
      : {
          photoId: photo.id,
          kind: "rejected",
          reason: "Excluded during catalogue review; not published.",
        };
  });
  return parseDraft(draft);
}
export function reviseDraft(
  input: CatalogueDraft,
  productId: string,
  product: ProductInput,
  reason = "Visitor correction",
) {
  const draft = parseDraft(input),
    item = draft.items.find((item) => item.product.id === productId);
  if (!item || product.id !== productId)
    throw new Error("Choose a known draft product.");
  draft.corrections.push({ productId, before: item.product, reason });
  item.product = ProductInputSchema.parse(product);
  item.copyOrigin = "user_supplied";
  return reconcileCoverage(draft);
}
export function includeDraft(
  input: CatalogueDraft,
  productId: string,
  included: boolean,
  confirmedClothing = true,
) {
  const draft = parseDraft(input),
    item = draft.items.find((item) => item.product.id === productId);
  if (!item) throw new Error("Choose a known draft product.");
  item.included = included;
  item.confirmedClothing = confirmedClothing;
  if (!included)
    for (const photoId of item.product.imageIds) {
      const index = draft.dispositions.findIndex(
        (row) => row.photoId === photoId,
      );
      if (index >= 0)
        draft.dispositions[index] = {
          photoId,
          kind: "rejected",
          reason: "Explicitly excluded during catalogue review.",
        };
    }
  return reconcileCoverage(draft);
}
export function excludeSource(input: CatalogueDraft, photoId: string) {
  const draft = parseDraft(input),
    index = draft.dispositions.findIndex((row) => row.photoId === photoId);
  if (
    index < 0 ||
    draft.items.some(
      (item) => item.included && item.product.imageIds.includes(photoId),
    )
  )
    throw new Error("Exclude its linked garment before excluding this source.");
  draft.dispositions[index] = {
    photoId,
    kind: "rejected",
    reason: "Explicitly excluded by you; not published.",
  };
  return parseDraft(draft);
}
export function mergeDraft(input: CatalogueDraft, ids: readonly string[]) {
  const draft = parseDraft(input),
    selected = draft.items.filter((item) => ids.includes(item.product.id));
  if (
    new Set(ids).size !== ids.length ||
    selected.length !== ids.length ||
    selected.length < 2
  )
    throw new Error("Choose two or more known garments to merge.");
  const first = selected[0]!,
    imageIds = [...new Set(selected.flatMap((item) => item.product.imageIds))];
  draft.corrections.push(
    ...selected.map((item) => ({
      productId: item.product.id,
      before: ProductInputSchema.parse(item.product),
      reason: "Visitor confirmed these photos show one garment",
    })),
  );
  first.product.imageIds = imageIds;
  first.included = true;
  first.confirmedClothing = true;
  first.reviewReason =
    "You grouped these views; primary garment options are retained.";
  draft.items = draft.items.filter(
    (item) => item === first || !ids.includes(item.product.id),
  );
  return reconcileCoverage(draft);
}
export function splitDraft(
  input: CatalogueDraft,
  productId: string,
  photoId: string,
  nextId: string,
) {
  const draft = parseDraft(input),
    item = draft.items.find((item) => item.product.id === productId);
  if (
    !item ||
    item.product.imageIds.length < 2 ||
    !item.product.imageIds.includes(photoId)
  )
    throw new Error("Split an alternate view from a known group.");
  draft.corrections.push({
    productId,
    before: ProductInputSchema.parse(item.product),
    reason: "Visitor split an alternate into a separate clothing draft",
  });
  const split = ProductInputSchema.parse({
    ...item.product,
    id: nextId,
    imageIds: [photoId],
    variants: item.product.variants.map((variant, index) => ({
      ...variant,
      id: `${nextId}_v${index}`,
    })),
  });
  item.product.imageIds = item.product.imageIds.filter((id) => id !== photoId);
  const preserve = (product: ProductInput) => {
    product.attributes = product.attributes.map((attr) => {
      const sourceIds = attr.sourceIds.filter((id) =>
        product.imageIds.includes(id),
      );
      return attr.provenance === "image_observed" && !sourceIds.length
        ? {
            ...attr,
            value: null,
            provenance: "unknown",
            review: "unknown",
            sourceIds,
          }
        : { ...attr, sourceIds };
    });
  };
  preserve(item.product);
  preserve(split);
  draft.items.push({
    ...item,
    product: split,
    reviewReason: "Split by you; review the garment and its demo options.",
    confirmedClothing: false,
    included: false,
  });
  return reconcileCoverage(draft);
}
