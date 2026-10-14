import type { Photo } from "@retailor/contracts/photos";
import type { ProductInput } from "@retailor/contracts/product";
import { parseDraft, mergeDraft } from "./draft";
import { SAMPLE } from "../photos/sample";
import type { CatalogueDraft } from "./draft";
const CATEGORIES: ProductInput["category"][] = [
  "jeans",
  "jeans",
  "hoodies",
  "hoodies",
  "tees",
  "tees",
  "shirts",
  "overshirts",
  "trousers",
  "blazers",
  "cardigans",
  "dresses",
  "skirts",
  "shorts",
  "swimwear",
];
const TITLES = [
  "Straight-leg jeans",
  "Wide-leg jeans",
  "Pullover hoodie",
  "Zip hoodie",
  "Everyday tee",
  "Boxy tee",
  "Button-front shirt",
  "Overshirt",
  "Tailored trousers",
  "Single-breasted blazer",
  "Knit cardigan",
  "Midi dress",
  "A-line skirt",
  "Resort shorts",
  "Swim shorts",
];
const PRICES = [
  6800, 7400, 6400, 7200, 3800, 4200, 5400, 7800, 8200, 12800, 8600, 9600, 5800,
  4800, 4400,
];
/** Explicit local development injection; no recognition claim and no public fallback. */
export function developmentDraft(
  photos: Photo[],
  operationId: string,
  inputRevision: number,
  id: () => string,
): CatalogueDraft {
  const items = photos.slice(0, 20).map((photo, index) => {
    const asset = SAMPLE.assets.find(
      (row) => row.image.hash === photo.source.hash,
    );
    const originalIndex = asset
      ? Number((asset.relatedTo ?? asset.id).slice(1)) - 1
      : index;
    const colour =
      asset && originalIndex === 0
        ? asset.id === "F19"
          ? "Black"
          : "Blue"
        : asset && originalIndex === 2
          ? "Charcoal"
          : asset && originalIndex === 6
            ? "Ivory"
            : "Demo colour";
    const productId = id(),
      price = PRICES[originalIndex] ?? 5400,
      category = CATEGORIES[originalIndex] ?? "other-clothing";
    const waist = category === "jeans" || category === "trousers";
    return {
      product: {
        id: productId,
        title: TITLES[originalIndex] ?? "Clothing draft",
        description: "",
        category,
        imageIds: [photo.id],
        ...(colour !== "Demo colour"
          ? { colourPhotos: [{ colour, photoIds: [photo.id] }] }
          : {}),
        sizingSystemId: waist
          ? ("waist-inseam-demo" as const)
          : ("alpha-demo" as const),
        variants: (waist ? ["28/30", "30/30", "32/32"] : ["S", "M", "L"]).map(
          (size, option) => ({
            id: `${productId}_v${option}`,
            size,
            colour,
            sku: `DEMO-${index + 1}-${option + 1}`,
            openingStock: 10,
            price,
            unitCost: Math.floor((price * 45) / 100),
            archived: false,
          }),
        ),
        attributes: [],
        archived: false,
      },
      included: true,
      confirmedClothing: true,
      reviewReason:
        "Authored development fixture; garment interpretation is not live AI evidence.",
      copyOrigin: "generated" as const,
    };
  });
  let draft = parseDraft({
    schemaVersion: 1,
    operationId,
    inputRevision,
    mode: "development-fixture",
    photos,
    items,
    dispositions: photos.map((photo) => {
      const productIds = items
        .filter((item) => item.product.imageIds.includes(photo.id))
        .map((item) => item.product.id);
      return productIds.length
        ? { photoId: photo.id, kind: "linked", productIds }
        : {
            photoId: photo.id,
            kind: "review",
            reason:
              "Over the twenty-product development limit; review or exclude.",
          };
    }),
    corrections: [],
  });
  for (const primary of ["F01", "F03", "F07"]) {
    const hashes = new Set(
      SAMPLE.assets
        .filter((asset) => asset.id === primary || asset.relatedTo === primary)
        .map((asset) => asset.image.hash),
    );
    const sourceIds = new Set(
      photos
        .filter((photo) => hashes.has(photo.source.hash))
        .map((photo) => photo.id),
    );
    const members = draft.items.filter((item) =>
      item.product.imageIds.some((id) => sourceIds.has(id)),
    );
    if (members.length > 1)
      draft = mergeDraft(
        draft,
        members.map((item) => item.product.id),
        "development-fixture",
      );
  }
  return draft;
}
