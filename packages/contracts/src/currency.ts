import { z } from "zod";
import { IdSchema, MAX_MINOR_AMOUNT } from "./core.js";
export const FX_LIMITS = {
  responseBytes: 8192,
  timeoutMs: 5000,
  cacheMs: 15 * 60_000,
  failureMs: 15_000,
  maxAgeDays: 7,
  componentCount: 32,
} as const;
export const MAX_DISPLAY_MINOR = MAX_MINOR_AMOUNT * 1000;
export const DisplayMinorSchema = z
  .number()
  .int()
  .nonnegative()
  .max(MAX_DISPLAY_MINOR);
/** Fixed-pair bounds: positive, less than 1000, at most 18 decimal places; no exponent. */
export const RateDecimalSchema = z
  .string()
  .max(22)
  .regex(/^(0|[1-9]\d{0,2})(?:\.\d{1,18})?$/u)
  .refine((value) => /[1-9]/u.test(value), "Rate must be positive");
export const CurrencySchema = z.enum(["USD", "EUR"]);
export type Currency = z.infer<typeof CurrencySchema>;
export const FxSnapshotSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    snapshotId: IdSchema,
    base: z.literal("USD"),
    quote: z.literal("EUR"),
    rateDecimal: RateDecimalSchema,
    rateDate: z.iso.date(),
    fetchedAt: z.iso.datetime(),
    sourceId: z.enum(["frankfurter-ecb-v2", "development-fixture"]),
  })
  .refine(
    (value) => value.rateDate <= value.fetchedAt.slice(0, 10),
    "Rate date is after retrieval",
  );
export type FxSnapshot = z.infer<typeof FxSnapshotSchema>;
export const CurrencyScopeSchema = z.discriminatedUnion("currency", [
  z.strictObject({ currency: z.literal("USD"), snapshot: z.null() }),
  z.strictObject({ currency: z.literal("EUR"), snapshot: FxSnapshotSchema }),
]);
export type CurrencyScope = z.infer<typeof CurrencyScopeSchema>;
export const USD_SCOPE: CurrencyScope = { currency: "USD", snapshot: null };
/** Historic confirmation context is structural metadata; current-display freshness is checked separately. */
export const OrderDisplaySchema = z.strictObject({
  orderId: IdSchema,
  scope: CurrencyScopeSchema,
});
export type OrderDisplay = z.infer<typeof OrderDisplaySchema>;

/** Keep the accepted quote even while USD is selected; switching back never silently refreshes it. */
export const CurrencyPreferenceSchema = z
  .strictObject({
    selected: CurrencySchema,
    acceptedSnapshot: FxSnapshotSchema.nullable(),
  })
  .refine(
    (value) => value.selected === "USD" || value.acceptedSnapshot !== null,
    "EUR needs a quote",
  );
export type CurrencyPreference = z.infer<typeof CurrencyPreferenceSchema>;
export const INITIAL_CURRENCY: CurrencyPreference = {
  selected: "USD",
  acceptedSnapshot: null,
};
