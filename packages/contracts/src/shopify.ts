import { z } from "zod";
import { IdSchema } from "./core.js";
import { EncodedPhotoSchema } from "./photos.js";
import { ProductSchema } from "./product.js";

export const SHOPIFY_LIMITS = {
  apiVersion: "2026-10",
  lifetimeMs: 7_200_000,
  oauthMs: 600_000,
  sessions: 128,
  installations: 10,
  ledgerBytes: 2 * 1024 * 1024,
  providerRequestBytes: 256 * 1024,
  providerResponseBytes: 1024 * 1024,
  providerMs: 10_000,
  operationMs: 120_000,
  products: 10,
  variants: 64,
  images: 8,
  pageSize: 20,
  pages: 5,
} as const;
export const ShopifyShopSchema = z
  .string()
  .max(100)
  .regex(/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.myshopify\.com$/u);
export const ShopifyProofSchema = z.string().regex(/^[a-f0-9]{64}$/u);
export const ShopifyReturnSchema = z.enum(["onboarding", "connections"]);
export const ShopifyProductIdSchema = z
  .string()
  .max(100)
  .regex(/^gid:\/\/shopify\/Product\/\d+$/u);
export const ShopifyExportStateSchema = z.enum([
  "preparing",
  "creating",
  "checking_outcome",
  "configuring",
  "media_processing",
  "ready",
  "updating",
  "removal_pending",
  "removed",
  "failed",
  "needs_attention",
]);
export const ShopifyExportSummarySchema = z.strictObject({
  id: ShopifyProofSchema,
  sourceProductId: IdSchema,
  revision: z.number().int().nonnegative().max(1_000_000),
  state: ShopifyExportStateSchema,
  remoteId: ShopifyProductIdSchema.nullable(),
  handle: z.string().max(100),
});
export const ShopifyStateSchema = z.enum([
  "unavailable",
  "disconnected",
  "authorizing",
  "connected",
  "writing",
  "checking_outcome",
  "cleanup_pending",
  "cleaning",
  "cleaned",
  "disconnecting",
  "needs_attention",
]);
export const ShopifySessionInputSchema = z.strictObject({
  schemaVersion: z.literal(1),
  workspaceId: IdSchema,
  createdAt: z.number().int().nonnegative(),
});
export const ShopifySessionResultSchema = z.strictObject({
  schemaVersion: z.literal(1),
  tabProof: ShopifyProofSchema,
  expiresAt: z.number().int().nonnegative(),
});
export const ShopifyControlSchema = z.strictObject({
  schemaVersion: z.literal(1),
  workspaceId: IdSchema,
});
export const ShopifyConnectSchema = ShopifyControlSchema.extend({
  shop: ShopifyShopSchema,
  returnTo: ShopifyReturnSchema,
});
export const ShopifySimulationSchema = ShopifyControlSchema.extend({
  approved: z.boolean(),
});
export const ShopifyStatusSchema = z.strictObject({
  schemaVersion: z.literal(1),
  available: z.boolean(),
  simulated: z.boolean(),
  state: ShopifyStateSchema,
  shop: ShopifyShopSchema.nullable(),
  name: z.string().max(200).nullable(),
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/u)
    .nullable(),
  expiresAt: z.number().int().nonnegative().nullable(),
  productCount: z.number().int().min(0).max(SHOPIFY_LIMITS.products),
  createIntents: z
    .number()
    .int()
    .min(0)
    .max(SHOPIFY_LIMITS.products)
    .default(0),
  exports: z
    .array(ShopifyExportSummarySchema)
    .max(SHOPIFY_LIMITS.products)
    .default([]),
});
export const ShopifyAuthorizeSchema = z.strictObject({
  schemaVersion: z.literal(1),
  authorizationUrl: z
    .string()
    .max(4096)
    .url()
    .regex(
      /^https:\/\/[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.myshopify\.com\/admin\/oauth\/authorize\?[^#]+$/u,
    ),
});
export const ShopifyCallbackSchema = z.strictObject({
  schemaVersion: z.literal(1),
  outcome: z.enum(["connected", "cancelled", "needs_attention"]),
  returnTo: ShopifyReturnSchema,
});
export type ShopifyStatus = z.infer<typeof ShopifyStatusSchema>;
export type ShopifySessionInput = z.infer<typeof ShopifySessionInputSchema>;
export type ShopifyConnect = z.infer<typeof ShopifyConnectSchema>;

const ShopMediaUrlSchema = z
  .string()
  .max(2048)
  .regex(/^https:\/\/cdn\.shopify\.com\/[^\s\\]*$/u);
const VariantSummarySchema = z.strictObject({
  id: z
    .string()
    .max(100)
    .regex(/^gid:\/\/shopify\/ProductVariant\/\d+$/u),
  title: z.string().max(255),
  sku: z.string().max(255).nullable(),
  price: z
    .string()
    .max(32)
    .regex(/^\d{1,16}(?:\.\d{1,4})?$/u),
  options: z
    .array(
      z.strictObject({ name: z.string().max(255), value: z.string().max(255) }),
    )
    .max(3),
});
export const ShopifyProductSummarySchema = z.strictObject({
  id: ShopifyProductIdSchema,
  title: z.string().max(255),
  description: z.string().max(1200),
  status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED", "UNLISTED"]),
  variants: z.array(VariantSummarySchema).max(SHOPIFY_LIMITS.variants),
  variantsTruncated: z.boolean(),
  images: z
    .array(
      z.strictObject({
        url: ShopMediaUrlSchema,
        alt: z.string().max(512).nullable(),
      }),
    )
    .max(SHOPIFY_LIMITS.images),
  mediaTruncated: z.boolean(),
  owned: z.boolean(),
});
export const ShopifyBrowseSchema = ShopifyControlSchema.extend({
  cursor: z
    .string()
    .max(2048)
    .regex(/^[A-Za-z0-9+/=_-]+$/u)
    .nullable(),
});
export const ShopifyProductsResultSchema = z.strictObject({
  schemaVersion: z.literal(1),
  products: z.array(ShopifyProductSummarySchema).max(SHOPIFY_LIMITS.pageSize),
  nextCursor: z.string().max(2048).nullable(),
  page: z.number().int().min(1).max(SHOPIFY_LIMITS.pages),
  limited: z.boolean(),
  currency: z.string().regex(/^[A-Z]{3}$/u),
});
export const ShopifyExportInputSchema = ShopifyControlSchema.extend({
  revision: z.number().int().nonnegative().max(1_000_000),
  product: ProductSchema,
  photos: z.array(EncodedPhotoSchema).min(1).max(SHOPIFY_LIMITS.images),
});
export const ShopifyExportControlSchema = ShopifyControlSchema.extend({
  exportId: ShopifyProofSchema,
});
export const ShopifyExportResultSchema = z.strictObject({
  schemaVersion: z.literal(1),
  export: ShopifyExportSummarySchema,
});
export type ShopifyExportInput = z.infer<typeof ShopifyExportInputSchema>;
export type ShopifyProductSummary = z.infer<typeof ShopifyProductSummarySchema>;
export type ShopifyExportSummary = z.infer<typeof ShopifyExportSummarySchema>;
export const ShopifyWebhookResultSchema = z.strictObject({
  schemaVersion: z.literal(1),
  accepted: z.literal(true),
});
