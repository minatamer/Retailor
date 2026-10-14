import {
  CategorySchema,
  relabelColourPhotos,
} from "@retailor/contracts/product";
import type { ProductInput } from "@retailor/contracts/product";
import { parseUsd } from "@retailor/commerce/money";

const messages = {
  missing: "Complete the product details before saving.",
  money: "Use a valid USD amount with up to two decimal places.",
  stock: "Demo stock must be a whole number from 0 to 10,000.",
  colour: "Keep one distinct colour name across its size options.",
};
class CatalogueEditError extends Error {
  constructor(code: keyof typeof messages) {
    super(messages[code]);
  }
}
export function catalogueEditNotice(error: unknown) {
  return error instanceof CatalogueEditError
    ? error.message
    : "Review the garment name, category and demo options.";
}
/** Form decoding only; the canonical draft controller still validates/applies it. */
export function readCatalogueEdit(
  product: ProductInput,
  form: FormData,
): ProductInput {
  const text = (key: string) => {
    const value = form.get(key);
    if (typeof value !== "string") throw new CatalogueEditError("missing");
    return value;
  };
  const money = (key: string) => {
    const result = parseUsd(text(key));
    if (!result.ok) throw new CatalogueEditError("money");
    return result.value;
  };
  const primary = text("primary");
  const variants = product.variants.map((variant, index) => {
    const stock = text(`stock_${index}`);
    if (!/^(0|[1-9]\d{0,4})$/u.test(stock) || Number(stock) > 10000)
      throw new CatalogueEditError("stock");
    return {
      ...variant,
      size: text(`size_${index}`),
      colour: text(`colour_${index}`),
      price: money(`price_${index}`),
      unitCost: money(`cost_${index}`),
      openingStock: Number(stock),
    };
  });
  let colourPhotos: ProductInput["colourPhotos"];
  try {
    colourPhotos = relabelColourPhotos(product, variants, product.imageIds);
  } catch {
    throw new CatalogueEditError("colour");
  }
  return {
    ...product,
    title: text("title"),
    description: text("description"),
    category: CategorySchema.parse(text("category")),
    imageIds: [primary, ...product.imageIds.filter((id) => id !== primary)],
    colourPhotos,
    variants,
  };
}
