import type { CommerceGraph } from "@retailor/contracts/commerce";
import type { FactScope } from "@retailor/contracts/facts";
import { exactSum } from "./allocation.js";
import { orderOf } from "./selectors.js";
/** Shared whole-store/product unit rule over an already validated graph and scope. */
export function unitEvents(
  graph: CommerceGraph,
  scope: FactScope,
  productId?: string,
) {
  const inPeriod = (at: string) =>
    at >= scope.from && at < scope.to && at <= scope.asOf;
  const linesOf = (orderId: string) =>
    orderOf(graph, orderId).lines.filter(
      (l) => !productId || l.productId === productId,
    );
  const placed = graph.orders.filter(
    (o) => inPeriod(o.placedAt) && linesOf(o.id).length > 0,
  );
  const cancelled = graph.cancellations.filter(
    (c) => inPeriod(c.at) && linesOf(c.orderId).length > 0,
  );
  const received = graph.returns
    .filter((r) => r.receivedAt && inPeriod(r.receivedAt))
    .map((r) => ({
      record: r,
      lines: r.lines.filter((l) =>
        linesOf(r.orderId).some((known) => known.id === l.lineId),
      ),
    }))
    .filter((r) => r.lines.length > 0);
  return {
    value: exactSum([
      ...placed.flatMap((o) => linesOf(o.id).map((l) => l.quantity)),
      ...cancelled.flatMap((c) => linesOf(c.orderId).map((l) => -l.quantity)),
      ...received.flatMap((r) => r.lines.map((l) => -l.units.length)),
    ]),
    contributors: [
      ...placed.map((o) => `order:${o.id}`),
      ...cancelled.map((c) => `cancellation:${c.id}`),
      ...received.map((r) => `return:${r.record.id}`),
    ],
  };
}
