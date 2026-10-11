import type { Photo } from "@retailor/contracts/photos";
import type { ProductInput } from "@retailor/contracts/product";
import { parseDraft } from "./draft";
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
    const productId = id(),
      price = PRICES[index] ?? 5400,
      category = CATEGORIES[index] ?? "other-clothing";
    const waist = category === "jeans" || category === "trousers";
    return {
      product: {
        id: productId,
        title: TITLES[index] ?? "Clothing draft",
        description:
          "Development copy for testing the catalogue journey. Replace with confirmed garment details.",
        category,
        imageIds: [photo.id],
        sizingSystemId: waist
          ? ("waist-inseam-demo" as const)
          : ("alpha-demo" as const),
        variants: (waist ? ["28/30", "30/30", "32/32"] : ["S", "M", "L"]).map(
          (size, option) => ({
            id: `${productId}_v${option}`,
            size,
            colour: "Demo colour",
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
  return parseDraft({
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
}
