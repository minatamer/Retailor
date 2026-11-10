import { z } from "zod";
import { IdSchema } from "@retailor/contracts/core";
import {
  SHOPIFY_LIMITS,
  ShopifyProofSchema,
  ShopifyShopSchema,
  ShopifyReturnSchema,
  ShopifyStateSchema,
} from "@retailor/contracts/shopify";

import { ProductIntentSchema } from "./product-model.js";
const time = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const TokensSchema = z.strictObject({
  access: z.string().min(1).max(4096),
  refresh: z.string().min(1).max(4096),
  expiresAt: time,
  refreshExpiresAt: time,
  scope: z.string().max(4096),
});
const RateSchema = z.strictObject({
  start: time,
  count: z.number().int().min(0).max(10000),
});
export const BindingSchema = z.strictObject({
  id: ShopifyProofSchema,
  cookieHash: ShopifyProofSchema,
  proofHash: ShopifyProofSchema,
  workspaceId: IdSchema,
  createdAt: time,
  expiresAt: time,
  generation: z.number().int().min(1).max(1_000_000),
  lifetimeCreates: z.number().int().min(0).max(10).default(0),
  connects: RateSchema,
  reads: RateSchema,
  pending: z
    .strictObject({
      stateHash: ShopifyProofSchema,
      stateValue: ShopifyProofSchema.nullable(),
      shop: ShopifyShopSchema,
      expiresAt: time,
      returnTo: ShopifyReturnSchema,
      outcome: z.enum(["pending", "unknown", "used", "cancelled"]),
      cleanupOnly: z.boolean().default(false),
    })
    .nullable(),
  shop: ShopifyShopSchema.nullable(),
  catalogue: z
    .strictObject({
      cursor: z.string().max(2048).nullable(),
      page: z.number().int().min(1).max(5),
    })
    .nullable()
    .default(null),
});
export const InstallationSchema = z.strictObject({
  shop: ShopifyShopSchema,
  appId: z.string().min(1).max(200),
  bindingId: ShopifyProofSchema,
  shopId: z.string().max(100),
  name: z.string().max(200),
  currency: z.string().max(3),
  verified: z.boolean(),
  accessBlocked: z.boolean().default(false),
  state: ShopifyStateSchema,
  tokens: TokensSchema.nullable(),
  tokenVersion: z.number().int().nonnegative(),
  lease: z
    .strictObject({ owner: ShopifyProofSchema, expiresAt: time })
    .nullable(),
  expiresAt: time,
  endedAt: time.nullable(),
  connectedAt: time.default(0),
  cleanupCalls: RateSchema.default({ start: 0, count: 0 }),
  maintenanceDue: time.default(0),
  maintenanceAttempts: z.number().int().min(0).max(8).default(0),
  refreshUnknown: z.boolean().default(false),
  uninstallDispatched: z.boolean().default(false),
  notice: z.enum(["uninstalled", "redact"]).nullable().default(null),
  noticeVersion: z.number().int().nonnegative().max(1_000_000).default(0),
  calls: RateSchema,
  products: z
    .array(ProductIntentSchema)
    .max(SHOPIFY_LIMITS.products)
    .default([]),
});
export const LedgerSchema = z.strictObject({
  schemaVersion: z.literal(1),
  bindings: z.array(BindingSchema).max(SHOPIFY_LIMITS.sessions),
  installations: z.array(InstallationSchema).max(SHOPIFY_LIMITS.installations),
  dispatches: z
    .array(
      z.strictObject({
        owner: ShopifyProofSchema,
        expiresAt: time,
        kind: z.enum(["user", "cleanup"]).default("user"),
      }),
    )
    .max(2),
  maintenance: z
    .strictObject({ owner: ShopifyProofSchema, expiresAt: time })
    .nullable()
    .default(null),
  lastSweepAt: time.default(0),
  deliveries: z
    .array(z.strictObject({ key: ShopifyProofSchema, expiresAt: time }))
    .max(256)
    .default([]),
});
export type Tokens = z.infer<typeof TokensSchema>;
export type Binding = z.infer<typeof BindingSchema>;
export type Installation = z.infer<typeof InstallationSchema>;
export type LedgerData = z.infer<typeof LedgerSchema>;
export function emptyLedger(): LedgerData {
  return {
    schemaVersion: 1,
    bindings: [],
    installations: [],
    dispatches: [],
    maintenance: null,
    lastSweepAt: 0,
    deliveries: [],
  };
}
