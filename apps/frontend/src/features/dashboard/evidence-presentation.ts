import type { CommerceGraph } from "@retailor/contracts/commerce";
import type { MetricFact } from "@retailor/contracts/facts";
import { exactProduct, exactSum } from "@retailor/commerce/allocation";
import { formatUsd } from "@retailor/commerce/money";
import { orderFinancialState } from "@retailor/commerce/selectors";
import type { dashboardRecord } from "./state";

export type EvidenceRecord = NonNullable<ReturnType<typeof dashboardRecord>>;
type RecordIcon =
  | "receipt"
  | "garment"
  | "returns"
  | "expense"
  | "inventory"
  | "customers"
  | "feedback";
export interface RecordPresentation {
  kind: string;
  title: string;
  detail: string;
  icon: RecordIcon;
  at: string | null;
  value: string | null;
  valueLabel: string | null;
}
export const readable = (value: string) =>
  value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/^./u, (c) => c.toUpperCase());

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const timeFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
  hour: "2-digit",
  minute: "2-digit",
});
export function evidenceDate(value: string, time = true) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Date unavailable";
  return (time ? timeFormat : dateFormat).format(date) + (time ? " UTC" : "");
}

export function describeRecord(
  graph: CommerceGraph,
  resolved: EvidenceRecord,
): RecordPresentation {
  const info = (
    kind: string,
    title: string,
    detail: string,
    icon: RecordIcon,
    at: string | null = null,
    value: string | null = null,
    valueLabel: string | null = value ? "Recorded amount" : null,
  ): RecordPresentation => ({
    kind,
    title,
    detail,
    icon,
    at,
    value,
    valueLabel,
  });
  switch (resolved.kind) {
    case "order": {
      const o = resolved.record;
      return info(
        "Order",
        o.lines[0]!.title +
          (o.lines.length > 1 ? ` + ${o.lines.length - 1} more` : ""),
        [
          ...new Set([
            readable(o.state),
            orderFinancialState(graph, o.id),
            readable(o.actor),
          ]),
        ].join(" · "),
        "receipt",
        o.placedAt,
        formatUsd(o.total),
        "Order total",
      );
    }
    case "line": {
      const l = resolved.record;
      return info(
        "Order item",
        l.title,
        `${l.colour} · ${l.size} · Quantity ${l.quantity}`,
        "garment",
        resolved.placedAt,
        formatUsd(exactProduct(l.quantity, l.unitPrice)),
        "Before discounts",
      );
    }
    case "product": {
      const p = resolved.record;
      return info(
        "Garment",
        p.title,
        p.archived ? "Archived · History retained" : "Current catalogue",
        "garment",
      );
    }
    case "variant": {
      const v = resolved.record,
        p = graph.products.find((p) => p.id === resolved.productId);
      return info(
        "Size & colour",
        p?.title ?? "Garment option",
        `${v.colour} · ${v.size}${v.archived ? " · Archived" : ""}`,
        "garment",
        v.openedAt,
        formatUsd(v.price),
        "Current price",
      );
    }
    case "refund": {
      const r = resolved.record;
      return info(
        "Refund",
        "Issued refund",
        "Financial refund · Stock handled separately",
        "returns",
        r.at,
        formatUsd(
          exactSum([...r.lines.map((l) => l.amount), r.delivery, r.tax]),
        ),
        "Refund total",
      );
    }
    case "return": {
      const r = resolved.record;
      return info(
        "Return",
        `${readable(r.reason)} return`,
        readable(r.state),
        "returns",
        r.requestedAt,
      );
    }
    case "expense": {
      const e = resolved.record;
      return info(
        "Expense",
        e.note || `${readable(e.category)} expense`,
        `${readable(e.category)} · ${readable(e.kind)}`,
        "expense",
        e.at,
        formatUsd(e.amount),
      );
    }
    case "movement": {
      const m = resolved.record;
      return info(
        "Stock movement",
        `${readable(m.kind)} movement`,
        m.reason,
        "inventory",
        m.at,
        `${m.units > 0 ? "+" : ""}${m.units} ${Math.abs(m.units) === 1 ? "unit" : "units"}`,
        "Signed movement",
      );
    }
    case "writeoff": {
      const w = resolved.record;
      return info(
        "Stock loss",
        "Inventory writeoff",
        w.reason,
        "inventory",
        w.at,
        formatUsd(exactProduct(w.quantity, w.unitCost)),
        "Captured loss",
      );
    }
    case "cancellation": {
      const c = resolved.record;
      return info(
        "Cancellation",
        "Order cancellation",
        "Merchandise reversal",
        "returns",
        c.at,
        formatUsd(c.merchandise),
        "Merchandise reversal",
      );
    }
    case "traffic": {
      const t = resolved.record;
      return info(
        "Visit",
        `${readable(t.actor)} visit`,
        `${t.productIds.length} ${t.productIds.length === 1 ? "garment" : "garments"} viewed · ${t.orderIds.length} ${t.orderIds.length === 1 ? "order" : "orders"}`,
        "customers",
        t.startedAt,
      );
    }
    case "buyer":
      return info(
        "Demo customer",
        resolved.record.label,
        "Fictional customer identity",
        "customers",
      );
    case "feedback": {
      const f = resolved.record;
      return info(
        "Review",
        f.reviewerName ?? "Demo review",
        "Fictional customer feedback",
        "feedback",
        f.at,
        `${f.rating} / 5`,
        "Rating",
      );
    }
  }
}

export function explainFact(fact: MetricFact) {
  const explanations: Partial<Record<MetricFact["factId"], string>> = {
    net_sales:
      "Merchandise sales after discounts, cancellations and merchandise refunds. Shipping and tax are excluded.",
    included_orders:
      "Orders placed in this period that are currently not cancelled.",
    aov: "Average merchandise value of the included orders, before refunds.",
    operating_result:
      "Net sales less sold cost, operating expenses and inventory loss. This operating profit is simulated demo activity.",
    refund_value:
      "Refunds issued in this period, including any refunded delivery and tax.",
    awaiting_fulfilment:
      "Orders currently waiting to be fulfilled, as of the latest records.",
    open_returns:
      "Units in return requests that are still open. Receiving items and issuing refunds are separate actions.",
    low_stock:
      "Active size and colour options with two or fewer units available.",
    available_stock:
      "Current available units after recorded sales, returns and stock movements.",
    gross_margin:
      "Merchandise sales less sold cost, expressed as a share of merchandise sales.",
    result_margin: "Simulated operating profit as a share of net sales.",
    average_rating:
      "The average rating in this small sample of fictional customer reviews.",
  };
  return (
    explanations[fact.factId] ??
    "Explore the linked records behind this figure. The exact calculation and scope are available below."
  );
}
