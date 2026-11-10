import {
  ProductInputSchema,
  CategorySchema,
  CATEGORY_LABELS,
} from "@retailor/contracts/product";
import type { ProductInput } from "@retailor/contracts/product";
import type { ShopifyProductSummary } from "@retailor/contracts/shopify";
import { parseUsd } from "@retailor/commerce/money";

export function shopifyPrice(value: string, currency: string) {
  const [integer = "0", fraction = "00"] = value.split(".");
  return `${currency} ${new Intl.NumberFormat("en-US").format(BigInt(integer))}.${fraction.padEnd(2, "0")}`;
}
export function priceRange(product: ShopifyProductSummary, currency: string) {
  if (product.priceRange)
    return product.priceRange.min === product.priceRange.max
      ? shopifyPrice(product.priceRange.min, currency)
      : `${shopifyPrice(product.priceRange.min, currency)} – ${shopifyPrice(product.priceRange.max, currency)}`;
  if (!product.variants.length) return "Price unavailable";
  const sorted = product.variants
    .map((variant) => variant.price)
    .sort((a, b) => {
      const scale = (value: string) => {
        const [whole = "0", fraction = ""] = value.split(".");
        return BigInt(whole) * 10000n + BigInt(fraction.padEnd(4, "0"));
      };
      return scale(a) < scale(b) ? -1 : scale(a) > scale(b) ? 1 : 0;
    });
  const low = sorted[0]!,
    high = sorted.at(-1)!;
  return low === high
    ? shopifyPrice(low, currency)
    : `${shopifyPrice(low, currency)} – ${shopifyPrice(high, currency)}${product.variantsTruncated ? "+" : ""}`;
}
export async function importedProductId(shop: string, productId: string) {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${shop}/${productId}`),
  );
  return `shopify_${[...new Uint8Array(hash)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32)}`;
}
export function importCandidate(
  product: ShopifyProductSummary,
  id: string,
  imageIds: string[],
): ProductInput {
  if (
    product.giftCard ||
    product.variantsTruncated ||
    product.mediaTruncated ||
    !product.variants.length ||
    product.variants.length > 24
  )
    throw new Error("Unsupported Shopify product");
  const sourceType = (product.productType ?? "").toLowerCase();
  const category =
    CategorySchema.options.find(
      (key) =>
        key === sourceType || CATEGORY_LABELS[key].toLowerCase() === sourceType,
    ) ?? "other-clothing";
  return ProductInputSchema.parse({
    id,
    title: product.title,
    description: product.description,
    category,
    imageIds,
    sizingSystemId: "pending-demo",
    attributes: [],
    archived: false,
    variants: product.variants.map((variant, index) => {
      const options = variant.options.filter(
        (option) =>
          !(option.name === "Title" && option.value === "Default Title"),
      );
      if (
        options.length > 2 ||
        options.filter((option) =>
          ["color", "colour"].includes(option.name.toLowerCase()),
        ).length > 1 ||
        options.filter((option) => option.name.toLowerCase() === "size")
          .length > 1 ||
        options.some(
          (option) =>
            !["color", "colour", "size"].includes(option.name.toLowerCase()),
        )
      )
        throw new Error("Unsupported options");
      const price = parseUsd(variant.price.replace(/(\.\d{2})0{1,2}$/u, "$1"));
      if (!price.ok) throw new Error("Unsupported USD price");
      return {
        id: `${id}_v${index}`,
        size:
          options.find((option) => option.name.toLowerCase() === "size")
            ?.value ?? "One size",
        colour:
          options.find((option) =>
            ["colour", "color"].includes(option.name.toLowerCase()),
          )?.value ?? "Unspecified",
        sku: variant.sku || `SHOPIFY-${variant.id.split("/").at(-1)}`,
        price: price.value,
        unitCost: 0,
        openingStock: 0,
        archived: false,
      };
    }),
  });
}
