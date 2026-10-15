import { z } from "zod";
import { IdSchema, MinorAmountSchema } from "./core.js";
export const CategorySchema = z.enum([
  "jeans",
  "hoodies",
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
  "jackets",
  "knitwear",
  "activewear",
  "loungewear",
  "underwear-socks",
  "other-clothing",
]);
/** Retail labels only; stable category IDs still own filtering and historical records. */
export const CATEGORY_LABELS: Readonly<
  Record<z.infer<typeof CategorySchema>, string>
> = {
  jeans: "Denim",
  hoodies: "Hoodies",
  tees: "T-Shirts",
  shirts: "Shirts",
  overshirts: "Overshirts",
  trousers: "Trousers",
  blazers: "Blazers",
  cardigans: "Cardigans",
  dresses: "Dresses",
  skirts: "Skirts",
  shorts: "Shorts",
  swimwear: "Swimwear",
  jackets: "Jackets",
  knitwear: "Knitwear",
  activewear: "Activewear",
  loungewear: "Loungewear",
  "underwear-socks": "Underwear & Socks",
  "other-clothing": "Other Clothing",
};
/** Generated defaults only: formatting supplies no new garment facts or owner edits. */
export function formatGarmentTitle(value: string) {
  return value
    .trim()
    .replace(/\s+/gu, " ")
    .replace(/\S+/gu, (word) => {
      const lower = word.toLocaleLowerCase("en");
      if (/^t-shirts?$/u.test(lower))
        return lower === "t-shirt" ? "T-Shirt" : "T-Shirts";
      return lower.replace(/\p{L}/u, (letter) =>
        letter.toLocaleUpperCase("en"),
      );
    });
}
export const VariantSchema = z.strictObject({
  id: IdSchema,
  size: z.string().trim().min(1).max(16),
  colour: z.string().trim().min(1).max(32),
  sku: z.string().trim().min(1).max(40),
  openingStock: z.number().int().nonnegative().max(10_000),
  openedAt: z.iso.datetime({ precision: 3 }),
  price: MinorAmountSchema,
  unitCost: MinorAmountSchema,
  archived: z.boolean(),
});
export const AttributeSchema = z.strictObject({
  name: z.enum([
    "colour",
    "pattern",
    "closure",
    "sleeve",
    "neckline",
    "material",
    "care",
    "fit",
  ]),
  value: z.string().max(100).nullable(),
  provenance: z.enum([
    "image_observed",
    "user_supplied",
    "demo_default",
    "unknown",
  ]),
  sourceIds: z.array(IdSchema).max(8),
  review: z.enum(["draft", "confirmed", "unknown"]),
});
export const ColourPhotosSchema = z
  .array(
    z.strictObject({
      colour: z.string().trim().min(1).max(32),
      photoIds: z.array(IdSchema).min(1).max(8),
    }),
  )
  .max(8);
const ProductShapeSchema = z.strictObject({
  id: IdSchema,
  title: z.string().trim().min(1).max(100),
  description: z.string().max(1000),
  category: CategorySchema,
  imageIds: z.array(IdSchema).min(1).max(8),
  colourPhotos: ColourPhotosSchema.optional(),
  variants: z.array(VariantSchema).min(1).max(24),
  sizingSystemId: z.enum([
    "alpha-demo",
    "waist-inseam-demo",
    "regional-demo",
    "chest-length-demo",
    "one-size-demo",
    "pending-demo",
  ]),
  attributes: z.array(AttributeSchema).max(8),
  archived: z.boolean(),
});
function validateColourPhotos(
  product: {
    imageIds: string[];
    colourPhotos?: z.infer<typeof ColourPhotosSchema> | undefined;
    variants: { colour: string }[];
  },
  context: z.RefinementCtx,
) {
  const mapping = product.colourPhotos ?? [];
  const names = mapping.map((row) => row.colour.toLowerCase());
  const photos = mapping.flatMap((row) => row.photoIds);
  if (
    new Set(names).size !== names.length ||
    new Set(photos).size !== photos.length ||
    photos.some((id) => !product.imageIds.includes(id)) ||
    mapping.some(
      (row) =>
        !product.variants.some(
          (variant) =>
            variant.colour.toLowerCase() === row.colour.toLowerCase(),
        ),
    )
  )
    context.addIssue({
      code: "custom",
      path: ["colourPhotos"],
      message:
        "Colour photos need distinct colours, owned views and matching options.",
    });
}
export const ProductSchema =
  ProductShapeSchema.superRefine(validateColourPhotos);
export const ProductInputSchema = ProductShapeSchema.extend({
  variants: z
    .array(VariantSchema.omit({ openedAt: true }))
    .min(1)
    .max(24),
}).superRefine(validateColourPhotos);
export function colourImageIds(
  product: Pick<ProductInput, "imageIds" | "colourPhotos">,
  colour?: string,
) {
  return (
    product.colourPhotos?.find(
      (row) => row.colour.toLowerCase() === colour?.toLowerCase(),
    )?.photoIds ?? product.imageIds
  );
}
/** Explicit colour renaming keeps actual view associations; inconsistent per-size renames reject. */
export function relabelColourPhotos(
  product: Pick<ProductInput, "colourPhotos" | "variants">,
  variants: readonly { id: string; colour: string }[],
  imageIds: readonly string[],
) {
  return product.colourPhotos?.flatMap((row) => {
    const memberIds = new Set(
      product.variants
        .filter(
          (variant) =>
            variant.colour.toLowerCase() === row.colour.toLowerCase(),
        )
        .map((variant) => variant.id),
    );
    const names = [
      ...new Set(
        variants
          .filter((variant) => memberIds.has(variant.id))
          .map((variant) => variant.colour.trim()),
      ),
    ];
    const photoIds = row.photoIds.filter((id) => imageIds.includes(id));
    if (names.length > 1)
      throw new Error(
        "Rename this colour consistently across its size options.",
      );
    return names.length && photoIds.length
      ? [{ colour: names[0]!, photoIds }]
      : [];
  });
}
export type ProductInput = z.infer<typeof ProductInputSchema>;
export type Product = z.infer<typeof ProductSchema>;
export type Variant = z.infer<typeof VariantSchema>;
export type Category = z.infer<typeof CategorySchema>;
/** Unknown placeholders are not colour choices or facets. */
export function namedColour(value: string) {
  return (
    !!value.trim() &&
    !/^(demo colou?r|unconfirmed( colou?r)?|unknown|not supplied|as pictured)$/iu.test(
      value.trim(),
    )
  );
}
