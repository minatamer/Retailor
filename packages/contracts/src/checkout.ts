import { z } from "zod";
import { IdSchema } from "./core.js";
import { GraphSchema, TimestampSchema } from "./commerce.js";
import {
  CurrencySchema,
  CurrencyScopeSchema,
  DisplayMinorSchema,
} from "./currency.js";
import { DerivativeSchema } from "./photos.js";
import { ThemeSchema } from "./design.js";

export const CHECKOUT_LIMITS = Object.freeze({
  bodyBytes: 10 * 1024 * 1024,
  responseBytes: 8192,
  deadlineMs: 120_000,
  sessionMs: 31 * 60_000,
  imageLinkMs: 60 * 60_000,
  identities: 128,
  attempts: 4,
  active: 2,
  photos: 8,
  statusReads: 12,
});
export const CheckoutUrlSchema = z
  .string()
  .max(4096)
  .regex(/^https:\/\/checkout\.stripe\.com\/(?:c\/pay\/|pay\/)[^\s\\]+$/u);
export const CheckoutIdentityResultSchema = z.strictObject({
  schemaVersion: z.literal(1),
  ready: z.literal(true),
});
export const CheckoutStartSchema = z.strictObject({
  schemaVersion: z.literal(1),
  attemptId: IdSchema,
  graph: GraphSchema,
  availablePhotoIds: z.array(IdSchema).max(32),
  scope: CurrencyScopeSchema,
  promoApplied: z.boolean(),
  expectedTotal: DisplayMinorSchema,
  brand: z.strictObject({
    name: z.string().trim().min(1).max(80),
    theme: ThemeSchema,
  }),
  photos: z
    .array(
      z.strictObject({
        image: DerivativeSchema,
        base64: z
          .string()
          .min(4)
          .max(1024 * 1024)
          .regex(/^[A-Za-z0-9+/]+={0,2}$/u),
      }),
    )
    .min(1)
    .max(CHECKOUT_LIMITS.photos),
});
export type CheckoutStart = z.infer<typeof CheckoutStartSchema>;
export const CheckoutControlSchema = z.strictObject({
  schemaVersion: z.literal(1),
  attemptId: IdSchema,
});
export const CheckoutResultSchema = z.strictObject({
  schemaVersion: z.literal(1),
  attemptId: IdSchema,
  status: z.enum(["open", "complete", "cancelled", "expired"]),
  currency: CurrencySchema,
  total: DisplayMinorSchema,
  expiresAt: TimestampSchema,
  url: CheckoutUrlSchema.nullable(),
});
export type CheckoutResult = z.infer<typeof CheckoutResultSchema>;
export const PendingCheckoutSchema = z.strictObject({
  attemptId: IdSchema,
  orderId: IdSchema.optional(),
  workspaceId: IdSchema,
  scenarioId: IdSchema,
  revision: z.number().int().nonnegative(),
  witness: z.string().max(8192),
  scope: CurrencyScopeSchema,
  total: DisplayMinorSchema,
  expiresAt: TimestampSchema,
  promoApplied: z.boolean(),
  brand: z.strictObject({
    name: z.string().min(1).max(80),
    theme: ThemeSchema,
  }),
});
export type PendingCheckout = z.infer<typeof PendingCheckoutSchema>;
