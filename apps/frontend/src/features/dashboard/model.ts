import { CATEGORY_LABELS } from "@retailor/contracts/product";
import type { CommerceGraph } from "@retailor/contracts/commerce";
import type { FactScope, MetricFact } from "@retailor/contracts/facts";
import { facts, allActivityScope } from "@retailor/commerce/facts";
import { dashboardFacts } from "@retailor/commerce/dashboard";
import { formatUsd } from "@retailor/commerce/money";
import type {
  DashboardPeriod,
  DashboardSeries,
  DashboardTarget,
} from "./state";
const DAY = 86_400_000;
export const PERIOD_LABELS: Record<DashboardPeriod, string> = {
  "7days": "Last 7 days",
  "28days": "Last 28 days",
  all: "All activity",
};
export const METRIC_LABELS: Partial<Record<MetricFact["factId"], string>> = {
  net_sales: "Net sales",
  included_orders: "Included orders",
  aov: "Average merchandise order",
  operating_result: "Operating profit",
  awaiting_fulfilment: "Awaiting fulfilment",
  open_returns: "Open return requests",
  low_stock: "Low-stock options",
  refund_value: "Issued refunds",
  eligible_sessions: "Eligible visits",
  engagement_rate: "Product engagement",
  bag_rate: "Added to bag",
  checkout_rate: "Reached checkout",
  conversion_rate: "Placed an order",
  sold_cost: "Sold cost",
  expenses: "Operating expenses",
  inventory_loss: "Inventory loss",
  gross_margin: "Gross margin",
  result_margin: "Operating profit margin",
  new_buyer_share: "New fictional buyers",
  repeat_buyer_share: "Repeat fictional buyers",
  average_rating: "Synthetic rating",
  refunded_order_rate: "Refunded-order rate",
  returned_unit_rate: "Received-return rate",
};
export const labelOf = (fact: MetricFact) =>
  METRIC_LABELS[fact.factId] ?? fact.factId.replaceAll("_", " ");
export function factDisplay(fact: MetricFact) {
  if (fact.value === null) return "Unavailable";
  if (fact.unit === "usd-cents") return formatUsd(fact.value);
  if (fact.unit === "basis-points") return `${(fact.value / 100).toFixed(2)}%`;
  if (fact.unit === "rating-hundredths")
    return `${(fact.value / 100).toFixed(2)} / 5`;
  return fact.value.toLocaleString("en-US");
}
export function dashboardScope(
  graph: CommerceGraph,
  period: DashboardPeriod,
): FactScope {
  if (period === "all") return allActivityScope(graph);
  const to = Date.parse(graph.asOf) + 1;
  return {
    from: new Date(to - (period === "7days" ? 7 : 28) * DAY).toISOString(),
    to: new Date(to).toISOString(),
    asOf: graph.asOf,
  };
}
export function dashboardModel(graph: CommerceGraph, period: DashboardPeriod) {
  const scope = dashboardScope(graph, period),
    groups = dashboardFacts(graph, scope);
  const previousFrom =
    Date.parse(scope.from) - (period === "7days" ? 7 : 28) * DAY;
  const comparison =
    period !== "all" && previousFrom >= Date.parse(graph.anchorAt)
      ? {
          registry: facts(graph, {
            from: new Date(previousFrom).toISOString(),
            to: scope.from,
            asOf: scope.asOf,
          }),
          reason: null,
        }
      : {
          registry: null,
          reason:
            "Comparison unavailable: no complete previous period is supplied.",
        };
  // Ordinary scenarios have 28 days; bound an unexpectedly old recovered history too.
  const first = Math.max(
      Date.parse(scope.from),
      Date.parse(scope.to) - 31 * DAY,
    ),
    end = Date.parse(scope.to);
  const days: {
    day: string;
    sales: MetricFact;
    result: MetricFact;
    registry: MetricFact[];
  }[] = [];
  for (let at = Math.floor(first / DAY) * DAY; at < end; at += DAY) {
    const dailyScope = {
      from: new Date(Math.max(at, first)).toISOString(),
      to: new Date(Math.min(at + DAY, end)).toISOString(),
      asOf: scope.asOf,
    };
    const daily = facts(graph, dailyScope);
    days.push({
      day: new Date(at).toISOString().slice(0, 10),
      sales: daily.find((f) => f.factId === "net_sales")!,
      result: daily.find((f) => f.factId === "operating_result")!,
      registry: daily,
    });
  }
  return {
    scope,
    ...groups,
    days,
    timelineLimited: first > Date.parse(scope.from),
    comparison,
  };
}
export type DashboardModel = ReturnType<typeof dashboardModel>;
export function resolveDashboardTarget(
  model: DashboardModel,
  target: DashboardTarget,
  series: DashboardSeries,
): { label: string; fact: MetricFact } | null {
  switch (target.kind) {
    case "metric": {
      const fact = model.registry.find((f) => f.factId === target.factId);
      return fact ? { label: labelOf(fact), fact } : null;
    }
    case "comparison": {
      const fact = model.comparison.registry?.find(
        (f) => f.factId === target.factId,
      );
      return fact
        ? { label: `Previous period · ${labelOf(fact)}`, fact }
        : null;
    }
    case "day": {
      const day = model.days.find((d) => d.day === target.day);
      const fact = day?.registry.find(
        (f) => f.factId === (target.factId ?? series),
      );
      return fact && day
        ? {
            label: `${day.day} · ${labelOf(fact)}`,
            fact,
          }
        : null;
    }
    case "product": {
      const row = model.products.find((r) => r.productId === target.productId);
      return row
        ? {
            label:
              target.factId === "net_units"
                ? "Product net units"
                : "Product net sales",
            fact: target.factId === "net_units" ? row.units : row.fact,
          }
        : null;
    }
    case "category": {
      const row = model.categories.find((r) => r.category === target.category);
      return row
        ? {
            label: `${CATEGORY_LABELS[target.category]} · Current category contribution`,
            fact: row.fact,
          }
        : null;
    }
    case "expense": {
      const row = model.expenses.find((r) => r.category === target.category);
      return row
        ? {
            label: `${target.category} · Signed operating expenses`,
            fact: row.fact,
          }
        : null;
    }
    case "return-reason": {
      const row = model.returnReasons.find((r) => r.reason === target.reason);
      return row
        ? {
            label: `${target.reason.replaceAll("-", " ")} · Received units`,
            fact: row.fact,
          }
        : null;
    }
    case "inventory": {
      const row = model.inventory.find((r) => r.variantId === target.variantId);
      return row
        ? { label: "Available option units · As of", fact: row.fact }
        : null;
    }
  }
}
