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
  "other-clothing",
]);
export const VariantSchema = z.strictObject({
  id: IdSchema,
  size: z.string().min(1).max(16),
  colour: z.string().min(1).max(32),
  stock: z.number().int().nonnegative().max(10_000),
});
export const ProductSchema = z.strictObject({
  id: IdSchema,
  title: z.string().min(1).max(100),
  description: z.string().max(1000),
  category: CategorySchema,
  price: MinorAmountSchema,
  unitCost: MinorAmountSchema,
  imageIds: z.array(IdSchema).min(1).max(8),
  variants: z.array(VariantSchema).min(1).max(24),
  archived: z.boolean(),
});
export type Product = z.infer<typeof ProductSchema>;
export type Variant = z.infer<typeof VariantSchema>;
export type Category = z.infer<typeof CategorySchema>;
