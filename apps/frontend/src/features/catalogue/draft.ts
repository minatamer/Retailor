import { ProductInputSchema } from "@retailor/contracts/product";
import type { ProductInput } from "@retailor/contracts/product";
import { parseDraft } from "@retailor/contracts/catalogue";
import type { CatalogueDraft } from "@retailor/contracts/catalogue";
import { PhotoLinksSchema } from "@retailor/contracts/photos";
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
export function mergeDraft(
  input: CatalogueDraft,
  ids: readonly string[],
  origin: "manual" | "development-fixture" = "manual",
) {
  const draft = parseDraft(input),
    selected = ids.flatMap(
      (id) => draft.items.find((item) => item.product.id === id) ?? [],
    );
  if (
    new Set(ids).size !== ids.length ||
    selected.length !== ids.length ||
    selected.length < 2
  )
    throw new Error("Choose two or more known garments to merge.");
  const first = selected[0]!,
    imageIds = [...new Set(selected.flatMap((item) => item.product.imageIds))];
  if (origin === "manual")
    draft.corrections.push(
      ...selected.map((item) => ({
        productId: item.product.id,
        before: ProductInputSchema.parse(item.product),
        reason: "Visitor confirmed these photos show one garment",
      })),
    );
  first.product.imageIds = imageIds;
  const optionKeys = new Set<string>();
  first.product.variants = selected
    .flatMap((item) => item.product.variants)
    .filter((variant) => {
      const key = `${variant.size.toLowerCase()}:${variant.colour.toLowerCase()}`;
      if (optionKeys.has(key)) return false;
      optionKeys.add(key);
      return true;
    });
  const colourPhotos = new Map<
    string,
    { colour: string; photoIds: string[] }
  >();
  for (const item of selected)
    for (const row of item.product.colourPhotos ?? []) {
      const key = row.colour.toLowerCase(),
        previous = colourPhotos.get(key);
      colourPhotos.set(key, {
        colour: previous?.colour ?? row.colour,
        photoIds: [
          ...new Set([...(previous?.photoIds ?? []), ...row.photoIds]),
        ],
      });
    }
  if (colourPhotos.size)
    first.product.colourPhotos = [...colourPhotos.values()];
  first.included = true;
  first.confirmedClothing = true;
  first.linkOrigin = origin;
  first.reviewReason =
    origin === "manual"
      ? "You linked these photos. Distinct size and colour options are retained."
      : "Automatic linking simulation; review the matching views and colour options.";
  draft.items = draft.items.filter(
    (item) => item === first || !ids.includes(item.product.id),
  );
  return reconcileCoverage(draft);
}
/** User-supplied links organize freshly interpreted clothing; never approve uncertain sources. */
export function applyPhotoLinks(
  input: CatalogueDraft,
  links: readonly (readonly string[])[],
) {
  let draft = parseDraft(input);
  for (const group of PhotoLinksSchema.parse(links)) {
    const rows = group.map((photoId) =>
      draft.items.filter((item) => item.product.imageIds.includes(photoId)),
    );
    if (
      rows.some(
        (matches) =>
          matches.length !== 1 ||
          !matches[0]!.included ||
          !matches[0]!.confirmedClothing,
      )
    )
      continue;
    // A cover change is presentation only; keep the first interpreted product's options.
    const memberIds = new Set(rows.map((matches) => matches[0]!.product.id));
    const ids = draft.items
      .filter((item) => memberIds.has(item.product.id))
      .map((item) => item.product.id);
    const images = [
      ...new Set(rows.flatMap((matches) => matches[0]!.product.imageIds)),
    ];
    if (images.length > 8) continue;
    if (ids.length > 1) draft = mergeDraft(draft, ids);
    const item = draft.items.find((row) => row.product.id === ids[0])!;
    const ordered = [
      ...group,
      ...item.product.imageIds.filter((id) => !group.includes(id)),
    ];
    if (JSON.stringify(item.product.imageIds) !== JSON.stringify(ordered)) {
      draft.corrections.push({
        productId: item.product.id,
        before: ProductInputSchema.parse(item.product),
        reason: "Visitor chose a cover photo",
      });
      item.product.imageIds = ordered;
      draft = reconcileCoverage(draft);
    }
  }
  return draft;
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
    ...forPhotos(item.product, [photoId]),
    id: nextId,
    imageIds: [photoId],
    variants: forPhotos(item.product, [photoId]).variants.map(
      (variant, index) => ({
        ...variant,
        id: `${nextId}_v${index}`,
      }),
    ),
  });
  item.product = forPhotos(
    item.product,
    item.product.imageIds.filter((id) => id !== photoId),
  );
  item.linkOrigin = "manual";
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

/** A photo-specific colour association never survives removal of its last view. */
function forPhotos(product: ProductInput, imageIds: string[]): ProductInput {
  const colourPhotos = product.colourPhotos
    ?.map((row) => ({
      ...row,
      photoIds: row.photoIds.filter((id) => imageIds.includes(id)),
    }))
    .filter((row) => row.photoIds.length);
  return {
    ...product,
    imageIds,
    colourPhotos,
    variants: colourPhotos?.length
      ? product.variants.filter((variant) =>
          colourPhotos.some(
            (row) => row.colour.toLowerCase() === variant.colour.toLowerCase(),
          ),
        )
      : product.variants,
    attributes: product.attributes.map((attribute) => {
      const sourceIds = attribute.sourceIds.filter((id) =>
        imageIds.includes(id),
      );
      return attribute.provenance === "image_observed" && !sourceIds.length
        ? {
            ...attribute,
            value: null,
            provenance: "unknown",
            review: "unknown",
            sourceIds,
          }
        : { ...attribute, sourceIds };
    }),
  };
}

/** Local opt-out cannot promote held/non-clothing results or exceed the product envelope. */
export function automaticLinkPolicy(
  input: CatalogueDraft,
  enabled: boolean,
  id: () => string,
): CatalogueDraft {
  const draft = parseDraft(input);
  if (enabled) return draft;
  const count = draft.items.reduce(
    (total, item) =>
      total +
      (item.included && item.confirmedClothing
        ? item.product.imageIds.length
        : 1),
    0,
  );
  if (count > 20) {
    for (const item of draft.items.filter(
      (row) => row.included && row.product.imageIds.length > 1,
    )) {
      item.included = false;
      item.reviewReason =
        "Automatic linking is off. Review these views within the twenty-product limit.";
      for (const photoId of item.product.imageIds) {
        const disposition = draft.dispositions.findIndex(
          (row) => row.photoId === photoId,
        );
        draft.dispositions[disposition] = {
          photoId,
          kind: "review",
          reason: item.reviewReason,
        };
      }
    }
    return reconcileCoverage(draft);
  }
  draft.items = draft.items.flatMap((item) => {
    if (
      !item.included ||
      !item.confirmedClothing ||
      item.product.imageIds.length < 2
    )
      return [item];
    return item.product.imageIds.map((photoId, index) => {
      const product = forPhotos(item.product, [photoId]);
      if (index) {
        product.id = id();
        product.variants = product.variants.map((variant) => ({
          ...variant,
          id: id(),
        }));
      }
      return {
        ...item,
        product,
        linkOrigin: undefined,
        reviewReason:
          "Automatic linking is off; review this separate photo draft.",
      };
    });
  });
  return reconcileCoverage(draft);
}
