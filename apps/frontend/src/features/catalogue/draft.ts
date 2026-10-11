import { ProductInputSchema } from "@retailor/contracts/product";
import type { ProductInput } from "@retailor/contracts/product";
import { parseDraft } from "@retailor/contracts/catalogue";
import type { CatalogueDraft } from "@retailor/contracts/catalogue";
export { DraftSchema, parseDraft } from "@retailor/contracts/catalogue";
export type { CatalogueDraft, DraftItem } from "@retailor/contracts/catalogue";
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
