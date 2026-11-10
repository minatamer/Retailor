import { describe, expect, it } from "vitest";
import { ProductSchema } from "@retailor/contracts/product";
import { exportSelection } from "./selection";

const products = Array.from({ length: 15 }, (_, n) =>
  ProductSchema.parse({
    id: `garment_${n}`,
    title: "Tee",
    description: "Cotton tee",
    category: "tees",
    imageIds: [`photo_${n}`],
    archived: false,
    sizingSystemId: "alpha-demo",
    attributes: [],
    variants: [
      {
        id: `variant_${n}`,
        colour: "Ivory",
        size: "S",
        sku: `TEE-${n}`,
        price: 2900,
        unitCost: 1000,
        openingStock: 5,
        openedAt: "2026-11-10T00:00:00.000Z",
        archived: false,
      },
    ],
  }),
);
const photos = new Set(products.flatMap((product) => product.imageIds));
describe("Shopify garment selection", () => {
  it("selects all up to the remaining lifetime allowance without changing products", () => {
    const before = structuredClone(products);
    expect(exportSelection(products, new Set(), photos, 10)).toEqual(
      products.slice(0, 10).map((product) => product.id),
    );
    expect(exportSelection(products, new Set(), photos, 2)).toHaveLength(2);
    expect(exportSelection(products, new Set(), photos, 0)).toEqual([]);
    expect(products).toEqual(before);
  });
  it("excludes tracked, archived, photo-unavailable and variantless garments", () => {
    const rows = structuredClone(products);
    rows[0]!.archived = true;
    rows[1]!.variants[0]!.archived = true;
    const available = new Set(photos);
    available.delete("photo_2");
    expect(
      exportSelection(rows, new Set(["garment_3"]), available, 10),
    ).toEqual(rows.slice(4, 14).map((product) => product.id));
  });
  it("refilters a previous selection after a photo/export/cap change and rejects unknown or duplicate IDs", () => {
    expect(
      exportSelection(products, new Set(["garment_0"]), photos, 1, [
        "missing",
        "garment_0",
        "garment_1",
        "garment_1",
        "garment_2",
      ]),
    ).toEqual(["garment_1"]);
    expect(
      exportSelection(products, new Set(), new Set(), 10, ["garment_1"]),
    ).toEqual([]);
  });
});
