import { it, expect } from "vitest";
import {
  IdSchema,
  RevisionSchema,
  MinorAmountSchema,
  ImageSchema,
} from "./core.js";
import { ProductSchema } from "./product.js";
it("rejects invalid public identity, numbers and pixels", () => {
  expect(IdSchema.safeParse("../other").success).toBe(false);
  expect(RevisionSchema.safeParse(-1).success).toBe(false);
  expect(MinorAmountSchema.safeParse(Number.NaN).success).toBe(false);
  expect(
    ImageSchema.safeParse({
      id: "photo",
      hash: "a".repeat(64),
      mime: "image/png",
      width: 10000,
      height: 10000,
      bytes: 100,
    }).success,
  ).toBe(false);
});
it("requires a photo and clothing category for every product", () => {
  const value = {
    id: "shirt",
    title: "Shirt",
    description: "",
    category: "shirts",
    imageIds: ["photo"],
    variants: [
      {
        id: "small",
        size: "S",
        colour: "Cream",
        sku: "SHIRT-S",
        openingStock: 3,
        openedAt: "2026-10-11T00:00:00.000Z",
        price: 5400,
        unitCost: 2700,
        archived: false,
      },
    ],
    sizingSystemId: "alpha-demo",
    attributes: [],
    archived: false,
  };
  expect(ProductSchema.safeParse(value).success).toBe(true);
  expect(ProductSchema.safeParse({ ...value, imageIds: [] }).success).toBe(
    false,
  );
  expect(ProductSchema.safeParse({ ...value, category: "shoes" }).success).toBe(
    false,
  );
  expect(ProductSchema.safeParse({ ...value, secret: "extra" }).success).toBe(
    false,
  );
});
