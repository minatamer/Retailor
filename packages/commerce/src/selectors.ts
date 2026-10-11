import type { CommerceGraph, Order } from "@retailor/contracts/commerce";
import { ensure, CommerceError } from "./errors.js";
import { exactSum } from "./allocation.js";
export function variantOf(graph: CommerceGraph, id: string) {
  for (const product of graph.products) {
    const variant = product.variants.find((item) => item.id === id);
    if (variant) return { product, variant };
  }
  throw new CommerceError("not-found", "This variant is unavailable.");
}
export function orderOf(graph: CommerceGraph, id: string): Order {
  const order = graph.orders.find((item) => item.id === id);
  ensure(order, "not-found", "This order is unavailable.");
  return order;
}
export function stockOf(
  graph: CommerceGraph,
  variantId: string,
  asOf = graph.asOf,
) {
  const { variant } = variantOf(graph, variantId);
  return variant.openedAt > asOf
    ? 0
    : exactSum([
        variant.openingStock,
        ...graph.movements
          .filter((item) => item.variantId === variantId && item.at <= asOf)
          .map((item) => item.units),
      ]);
}
export function productReferenced(
  graph: CommerceGraph,
  id: string,
  variantId?: string,
) {
  const product = graph.products.find((item) => item.id === id);
  ensure(product, "not-found", "This product is unavailable.");
  const variants = new Set(
    variantId ? [variantId] : product.variants.map((item) => item.id),
  );
  return (
    graph.orders.some((order) =>
      order.lines.some((line) => variants.has(line.variantId)),
    ) ||
    graph.movements.some((item) => variants.has(item.variantId)) ||
    graph.feedback.some((item) => item.productId === id) ||
    graph.traffic.some((item) => item.productIds.includes(id))
  );
}
export function lineNet(order: Order, lineId: string) {
  const line = order.lines.find((item) => item.id === lineId);
  ensure(line, "not-found", "This order line is unavailable.");
  return exactSum(line.unitNet);
}
export function refundable(graph: CommerceGraph, orderId: string) {
  const order = orderOf(graph, orderId);
  const refunds = graph.refunds.filter((item) => item.orderId === orderId);
  return {
    lines: order.lines.map((line) => ({
      lineId: line.id,
      amount:
        order.state === "cancelled"
          ? 0
          : lineNet(order, line.id) -
            exactSum(
              refunds.flatMap((refund) =>
                refund.lines
                  .filter((item) => item.lineId === line.id)
                  .map((item) => item.amount),
              ),
            ),
    })),
    delivery:
      order.state === "cancelled"
        ? 0
        : order.delivery - exactSum(refunds.map((item) => item.delivery)),
    tax:
      order.state === "cancelled"
        ? 0
        : order.tax - exactSum(refunds.map((item) => item.tax)),
  };
}
