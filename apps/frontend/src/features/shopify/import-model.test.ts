import { describe, expect, it } from "vitest";
import { ShopifyProductSummarySchema } from "@retailor/contracts/shopify";
import {
  importedProductId,
  importCandidate,
  priceRange,
  shopifyPrice,
} from "./import-model";

const product = ShopifyProductSummarySchema.parse({
  id: "gid://shopify/Product/123",
  title: "Cotton Tee",
  description: "Soft cotton.",
  productType: "tees",
  status: "ACTIVE",
  owned: false,
  variantsTruncated: false,
  mediaTruncated: false,
  images: [{ url: "https://cdn.shopify.com/tee.webp", alt: null }],
  variants: [
    {
      id: "gid://shopify/ProductVariant/456",
      title: "Ivory / S",
      price: "29.9900",
      sku: "TEE-S",
      options: [
        { name: "Color", value: "Ivory" },
        { name: "Size", value: "S" },
      ],
    },
  ],
});
describe("Shopify import mapping", () => {
  it("preserves exact prices, descriptions and options while keeping local stock/cost explicit", async () => {
    const id = await importedProductId("test.myshopify.com", product.id);
    const candidate = importCandidate(product, id, ["local_photo"]);
    expect(candidate).toMatchObject({
      id,
      title: product.title,
      description: product.description,
      category: "tees",
      imageIds: ["local_photo"],
      variants: [
        {
          sku: "TEE-S",
          colour: "Ivory",
          size: "S",
          price: 2999,
          openingStock: 0,
          unitCost: 0,
        },
      ],
    });
    expect(await importedProductId("test.myshopify.com", product.id)).toBe(id);
    expect(await importedProductId("other.myshopify.com", product.id)).not.toBe(
      id,
    );
  });
  it("rejects unsupported variants, truncated data, gift cards and prices without rounding or partial conversion", () => {
    expect(() =>
      importCandidate(
        {
          ...product,
          variants: [
            {
              ...product.variants[0]!,
              options: [
                { name: "Color", value: "Ivory" },
                { name: "Colour", value: "Black" },
              ],
            },
          ],
        },
        "new",
        ["photo"],
      ),
    ).toThrow();
    expect(() =>
      importCandidate({ ...product, giftCard: true }, "new", ["photo"]),
    ).toThrow();
    expect(() =>
      importCandidate({ ...product, variantsTruncated: true }, "new", [
        "photo",
      ]),
    ).toThrow();
    expect(() =>
      importCandidate(
        {
          ...product,
          variants: [{ ...product.variants[0]!, price: "29.999" }],
        },
        "new",
        ["photo"],
      ),
    ).toThrow();
    expect(() =>
      importCandidate(
        {
          ...product,
          variants: [
            {
              ...product.variants[0]!,
              options: [{ name: "Material", value: "Cotton" }],
            },
          ],
        },
        "new",
        ["photo"],
      ),
    ).toThrow();
    expect(() =>
      importCandidate({ ...product, title: "x".repeat(101) }, "new", ["photo"]),
    ).toThrow();
  });
  it("renders complete range data instead of inferring a whole-product price from four preview variants", () => {
    expect(
      priceRange(
        {
          ...product,
          variantsTruncated: true,
          priceRange: { min: "9.00", max: "199.00" },
        },
        "USD",
      ),
    ).toBe("USD 9.00 – USD 199.00");
    expect(shopifyPrice("9999999999999999.9999", "EUR")).toBe(
      "EUR 9,999,999,999,999,999.9999",
    );
  });
});
