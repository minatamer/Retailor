import { z } from "zod";
import { IdSchema, RevisionSchema } from "./core.js";
import { TimestampSchema } from "./commerce.js";
export const FactIdSchema = z.enum([
  "gross_sales",
  "discounts",
  "cancellations",
  "merchandise_refunds",
  "net_sales",
  "included_orders",
  "aov",
  "awaiting_fulfilment",
  "refund_value",
  "refunded_orders",
  "returned_units",
  "open_returns",
  "available_stock",
  "average_rating",
  "net_units",
  "sold_cost",
  "gross_result",
  "gross_margin",
  "expenses",
  "inventory_loss",
  "operating_result",
  "result_margin",
  "eligible_sessions",
  "engagement_rate",
  "bag_rate",
  "checkout_rate",
  "conversion_rate",
  "checkout_completion",
  "new_buyer_share",
  "repeat_buyer_share",
  "refunded_order_rate",
  "returned_unit_rate",
  "product_net_contribution",
  "sell_through",
  "stockouts",
  "low_stock",
  "inventory_value",
]);
export type FactId = z.infer<typeof FactIdSchema>;
export const FactScopeSchema = z
  .strictObject({
    from: TimestampSchema,
    to: TimestampSchema,
    asOf: TimestampSchema,
  })
  .refine((scope) => scope.from < scope.to, "Invalid date range");
export type FactScope = z.infer<typeof FactScopeSchema>;
const ExactIntegerSchema = z
  .number()
  .int()
  .min(-Number.MAX_SAFE_INTEGER)
  .max(Number.MAX_SAFE_INTEGER);
export const MetricFactSchema = z.strictObject({
  factId: FactIdSchema,
  workspaceId: IdSchema,
  scenarioId: IdSchema,
  revision: RevisionSchema,
  scope: FactScopeSchema,
  productId: IdSchema.optional(),
  dateBasis: z.string().min(1).max(160),
  formula: z.string().min(1).max(200),
  unit: z.enum(["usd-cents", "count", "basis-points", "rating-hundredths"]),
  numerator: ExactIntegerSchema,
  denominator: ExactIntegerSchema.nullable(),
  value: ExactIntegerSchema.nullable(),
  availability: z.enum(["available", "unavailable"]),
  reason: z.string().max(200).optional(),
  contributors: z.array(z.string().min(1).max(160)).max(2048),
  excluded: z
    .array(
      z.strictObject({
        ref: z.string().min(1).max(160),
        reason: z.string().min(1).max(160),
      }),
    )
    .max(640),
});
export type MetricFact = z.infer<typeof MetricFactSchema>;
