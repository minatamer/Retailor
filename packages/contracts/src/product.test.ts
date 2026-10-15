import { describe, expect, it } from "vitest";
import {
  CATEGORY_LABELS,
  CategorySchema,
  formatGarmentTitle,
} from "./product.js";

describe("garment naming defaults and stable retail category vocabulary", () => {
  it("capitalizes words without inventing descriptors or removing hyphen compounds", () => {
    for (const [input, expected] of [
      ["  straight-leg   jeans  ", "Straight-leg Jeans"],
      ["BOOTCUT JEANS", "Bootcut Jeans"],
      ["straight dark denim jeans", "Straight Dark Denim Jeans"],
      ["button-front shirt", "Button-front Shirt"],
      ["a-line skirt", "A-line Skirt"],
      ["écru t-shirt", "Écru T-Shirt"],
      ["mid-rise\nwide-leg jeans", "Mid-rise Wide-leg Jeans"],
    ]) {
      expect(formatGarmentTitle(input!)).toBe(expected);
      expect(formatGarmentTitle(expected!)).toBe(expected);
    }
  });
  it("labels each distinct bounded type while retaining accepted IDs", () => {
    expect(Object.keys(CATEGORY_LABELS)).toEqual(CategorySchema.options);
    expect(new Set(Object.values(CATEGORY_LABELS)).size).toBe(
      CategorySchema.options.length,
    );
    expect(CATEGORY_LABELS.jeans).toBe("Denim");
    expect(CATEGORY_LABELS.tees).toBe("T-Shirts");
    expect(CATEGORY_LABELS["underwear-socks"]).toBe("Underwear & Socks");
    expect(CategorySchema.parse("jeans")).toBe("jeans");
    expect(CategorySchema.safeParse("Denim").success).toBe(false);
  });
});
