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
export const ProductSchema = z.strictObject({
  id: IdSchema,
  title: z.string().trim().min(1).max(100),
  description: z.string().max(1000),
  category: CategorySchema,
  imageIds: z.array(IdSchema).min(1).max(8),
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
export const ProductInputSchema = ProductSchema.extend({
  variants: z
    .array(VariantSchema.omit({ openedAt: true }))
    .min(1)
    .max(24),
});
export type ProductInput = z.infer<typeof ProductInputSchema>;
export type Product = z.infer<typeof ProductSchema>;
export type Variant = z.infer<typeof VariantSchema>;
export type Category = z.infer<typeof CategorySchema>;
