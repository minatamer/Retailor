import { describe, expect, it } from "vitest";
import {
  ProductInputSchema,
  colourImageIds,
  relabelColourPhotos,
} from "./product.js";
const product = {
  id: "jeans",
  title: "Jeans",
  description: "",
  category: "jeans",
  imageIds: ["front", "back", "black"],
  sizingSystemId: "waist-inseam-demo",
  attributes: [],
  archived: false,
  colourPhotos: [
    { colour: "Blue", photoIds: ["front", "back"] },
    { colour: "Black", photoIds: ["black"] },
  ],
  variants: ["Blue", "Black"].flatMap((colour) =>
    ["28/30", "30/30", "32/32"].map((size, index) => ({
      id: colour + index,
      size,
      colour,
      sku: colour + index,
      price: 6800,
      unitCost: 3060,
      openingStock: 10,
      archived: false,
    })),
  ),
};
describe("bounded source-backed colour choices", () => {
  it("keeps legacy gallery meaning and resolves only the selected colour's actual views", () => {
    const parsed = ProductInputSchema.parse(product);
    expect(colourImageIds(parsed, "blue")).toEqual(["front", "back"]);
    expect(colourImageIds(parsed, "Black")).toEqual(["black"]);
    expect(colourImageIds(parsed)).toEqual(product.imageIds);
    const legacy = ProductInputSchema.parse({
      ...product,
      colourPhotos: undefined,
    });
    expect(colourImageIds(legacy, "Black")).toEqual(product.imageIds);
  });
  it("rejects invented, overlapping, duplicate, unrepresented and oversized mappings", () => {
    for (const colourPhotos of [
      [{ colour: "Blue", photoIds: ["missing"] }],
      [{ colour: "Blue", photoIds: ["front", "front"] }],
      [
        { colour: "Blue", photoIds: ["front"] },
        { colour: "Black", photoIds: ["front"] },
      ],
      [
        { colour: "Blue", photoIds: ["front"] },
        { colour: "BLUE", photoIds: ["back"] },
      ],
      [{ colour: "Red", photoIds: ["front"] }],
      [{ colour: "x".repeat(33), photoIds: ["front"] }],
      [{ colour: "Blue", photoIds: [] }],
    ])
      expect(
        ProductInputSchema.safeParse({ ...product, colourPhotos }).success,
      ).toBe(false);
  });
  it("renames associations by stable variant identity and refuses conflicting per-size names", () => {
    const parsed = ProductInputSchema.parse(product);
    const renamed = parsed.variants.map((variant) => ({
      ...variant,
      colour: variant.colour === "Blue" ? "Indigo" : variant.colour,
    }));
    expect(relabelColourPhotos(parsed, renamed, parsed.imageIds)).toEqual([
      { colour: "Indigo", photoIds: ["front", "back"] },
      { colour: "Black", photoIds: ["black"] },
    ]);
    expect(parsed.colourPhotos?.[0]?.colour).toBe("Blue");
    renamed[0]!.colour = "Navy";
    expect(() => relabelColourPhotos(parsed, renamed, parsed.imageIds)).toThrow(
      "consistently",
    );
  });
});
