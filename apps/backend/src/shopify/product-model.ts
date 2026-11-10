import { z } from "zod";
import { IdSchema } from "@retailor/contracts/core";
import {
  SHOPIFY_LIMITS,
  ShopifyExportStateSchema,
  ShopifyProductIdSchema,
  ShopifyProofSchema,
} from "@retailor/contracts/shopify";

export const ProductIntentSchema = z.strictObject({
  id: ShopifyProofSchema,
  sourceProductId: IdSchema,
  revision: z.number().int().nonnegative().max(1_000_000),
  marker: ShopifyProofSchema,
  handle: z.string().max(100),
  digest: ShopifyProofSchema,
  expected: ShopifyProofSchema,
  photoDigest: ShopifyProofSchema,
  state: ShopifyExportStateSchema,
  remoteId: ShopifyProductIdSchema.nullable(),
  createdAt: z.number().int().nonnegative(),
  changedAt: z.number().int().nonnegative(),
  createDispatched: z.boolean(),
  createRejected: z.boolean(),
  configured: z.boolean().default(false),
  media: z
    .array(
      z.strictObject({
        id: z.string().max(100),
        alt: z.string().max(512),
        status: z.string().max(32),
      }),
    )
    .max(SHOPIFY_LIMITS.images),
  variants: z
    .array(
      z.strictObject({
        sourceId: IdSchema,
        signature: ShopifyProofSchema,
        remoteId: z.string().max(100).nullable(),
      }),
    )
    .max(SHOPIFY_LIMITS.variants),
  cleanupAttempts: z.number().int().min(0).max(8).default(0),
  cleanupDue: z.number().int().nonnegative().default(0),
  removalRequested: z.boolean().default(false),
});
export type ProductIntent = z.infer<typeof ProductIntentSchema>;
