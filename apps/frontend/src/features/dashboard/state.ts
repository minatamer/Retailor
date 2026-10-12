import { z } from "zod";
import { FactIdSchema } from "@retailor/contracts/facts";
import { CategorySchema } from "@retailor/contracts/product";
import { ExpenseCategorySchema } from "@retailor/contracts/commerce";
import { IdSchema } from "@retailor/contracts/core";
import type { CommerceGraph } from "@retailor/contracts/commerce";
export const DashboardPeriodSchema = z.enum(["7days", "28days", "all"]);
export const DashboardSeriesSchema = z.enum(["net_sales", "operating_result"]);
export const DashboardTargetSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("metric"), factId: FactIdSchema }),
  z.strictObject({ kind: z.literal("comparison"), factId: FactIdSchema }),
  z.strictObject({
    kind: z.literal("day"),
    day: z.iso.date(),
    factId: z
      .enum(["net_sales", "operating_result", "included_orders", "aov"])
      .optional(),
  }),
  z.strictObject({
    kind: z.literal("product"),
    productId: IdSchema,
    factId: z.enum(["product_net_contribution", "net_units"]).optional(),
  }),
  z.strictObject({ kind: z.literal("category"), category: CategorySchema }),
  z.strictObject({
    kind: z.literal("expense"),
    category: ExpenseCategorySchema,
  }),
  z.strictObject({
    kind: z.literal("return-reason"),
    reason: z.enum(["sizing", "changed-mind", "damaged", "other"]),
  }),
  z.strictObject({ kind: z.literal("inventory"), variantId: IdSchema }),
]);
export const DashboardStateSchema = z.strictObject({
  period: DashboardPeriodSchema.default("28days"),
  series: DashboardSeriesSchema.default("net_sales"),
  target: DashboardTargetSchema.nullable().default(null),
  pinned: DashboardTargetSchema.nullable().default(null),
  source: z.string().min(1).max(160).nullable().default(null),
  page: z.number().int().min(0).max(40).default(0),
});
export type DashboardPeriod = z.infer<typeof DashboardPeriodSchema>;
export type DashboardSeries = z.infer<typeof DashboardSeriesSchema>;
export type DashboardTarget = z.infer<typeof DashboardTargetSchema>;
export const INITIAL_DASHBOARD = DashboardStateSchema.parse({});
export function dashboardRecord(graph: CommerceGraph, reference: string) {
  const separator = reference.indexOf(":"),
    kind = reference.slice(0, separator),
    id = reference.slice(separator + 1);
  if (separator < 1 || !id || reference.length > 160) return null;
  switch (kind) {
    case "order": {
      const record = graph.orders.find((r) => r.id === id);
      return record ? { kind: "order" as const, record } : null;
    }
    case "line": {
      const order = graph.orders.find((o) => o.lines.some((l) => l.id === id));
      const record = order?.lines.find((l) => l.id === id);
      return record && order
        ? {
            kind: "line" as const,
            record,
            orderId: order.id,
            origin: order.origin,
            placedAt: order.placedAt,
          }
        : null;
    }
    case "product": {
      const record = graph.products.find((r) => r.id === id);
      return record ? { kind: "product" as const, record } : null;
    }
    case "variant": {
      const product = graph.products.find((p) =>
        p.variants.some((v) => v.id === id),
      );
      const record = product?.variants.find((v) => v.id === id);
      return record && product
        ? { kind: "variant" as const, record, productId: product.id }
        : null;
    }
    case "refund": {
      const record = graph.refunds.find((r) => r.id === id);
      return record ? { kind: "refund" as const, record } : null;
    }
    case "return": {
      const record = graph.returns.find((r) => r.id === id);
      return record ? { kind: "return" as const, record } : null;
    }
    case "expense": {
      const record = graph.expenses.find((r) => r.id === id);
      return record ? { kind: "expense" as const, record } : null;
    }
    case "movement": {
      const record = graph.movements.find((r) => r.id === id);
      return record ? { kind: "movement" as const, record } : null;
    }
    case "writeoff": {
      const record = graph.writeoffs.find((r) => r.id === id);
      return record ? { kind: "writeoff" as const, record } : null;
    }
    case "cancellation": {
      const record = graph.cancellations.find((r) => r.id === id);
      return record ? { kind: "cancellation" as const, record } : null;
    }
    case "traffic": {
      const record = graph.traffic.find((r) => r.id === id);
      return record ? { kind: "traffic" as const, record } : null;
    }
    case "buyer": {
      const record = graph.buyers.find((r) => r.id === id);
      return record ? { kind: "buyer" as const, record } : null;
    }
    case "feedback": {
      const record = graph.feedback.find((r) => r.id === id);
      return record ? { kind: "feedback" as const, record } : null;
    }
    default:
      return null;
  }
}
