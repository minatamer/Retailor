import { FactScopeSchema, MetricFactSchema } from "@retailor/contracts/facts";
import type { FactScope, FactId, MetricFact } from "@retailor/contracts/facts";
import type {
  CommerceGraph,
  Movement,
  Order,
} from "@retailor/contracts/commerce";
import { parseGraph, freeze } from "./graph.js";
import { stockOf, orderOf } from "./selectors.js";
import { exactSum, exactProduct, roundRatio } from "./allocation.js";
import { ensure } from "./errors.js";
const refs = (kind: string, items: readonly { id: string }[]) =>
  items.map((item) => `${kind}:${item.id}`);
const combine = (...groups: readonly string[][]) => [...new Set(groups.flat())];
function cancelled(graph: CommerceGraph, order: Order, asOf: string) {
  return graph.cancellations.some(
    (item) => item.orderId === order.id && item.at <= asOf,
  );
}
function costOf(graph: CommerceGraph, movement: Movement) {
  let order: Order;
  if (movement.kind === "sale") order = orderOf(graph, movement.sourceId);
  else if (movement.kind === "cancel")
    order = orderOf(
      graph,
      graph.cancellations.find((item) => item.id === movement.sourceId)!
        .orderId,
    );
  else if (movement.kind === "restock")
    order = orderOf(
      graph,
      graph.returns.find((item) => item.id === movement.sourceId)!.orderId,
    );
  else return 0;
  const line = order.lines.find((item) => item.id === movement.lineId)!;
  return exactProduct(-movement.units, line.unitCost);
}
/** Facts are projections of validated records, never independently mutable totals. */
export function facts(input: unknown, rawScope: unknown): MetricFact[] {
  const graph = parseGraph(input),
    scope = FactScopeSchema.parse(rawScope);
  ensure(
    scope.asOf >= graph.anchorAt && scope.asOf <= graph.asOf,
    "invalid",
    "This as-of date is outside the known demo.",
  );
  const inPeriod = (at: string) =>
      at >= scope.from && at < scope.to && at <= scope.asOf,
    history = scope.from >= graph.anchorAt;
  const output: MetricFact[] = [];
  function fact(
    factId: FactId,
    numerator: number,
    contributors: string[],
    formula: string,
    dateBasis: string,
    unit: MetricFact["unit"] = "usd-cents",
    options: {
      denominator?: number;
      scale?: number;
      reason?: string;
      asOf?: boolean;
      excluded?: MetricFact["excluded"];
    } = {},
  ) {
    const denominator = options.denominator ?? null,
      unavailable =
        options.reason ??
        (!options.asOf && !history
          ? "No recorded history covers this whole period."
          : denominator !== null && denominator <= 0
            ? "The denominator is unavailable or zero."
            : undefined);
    const value = unavailable
      ? null
      : denominator === null
        ? numerator
        : roundRatio(numerator, denominator, options.scale ?? 1);
    output.push(
      MetricFactSchema.parse({
        factId,
        workspaceId: graph.workspaceId,
        scenarioId: graph.scenarioId,
        revision: graph.revision,
        scope,
        dateBasis,
        formula,
        unit,
        numerator,
        denominator,
        value,
        availability: unavailable ? "unavailable" : "available",
        ...(unavailable ? { reason: unavailable } : {}),
        contributors: [...new Set(contributors)],
        excluded: options.excluded ?? [],
      }),
    );
  }
  const placed = graph.orders.filter((order) => inPeriod(order.placedAt)),
    cancellations = graph.cancellations.filter((item) => inPeriod(item.at)),
    refunds = graph.refunds.filter((item) => inPeriod(item.at)),
    included = placed.filter((order) => !cancelled(graph, order, scope.asOf));
  const gross = exactSum(placed.map((order) => order.gross)),
    discount = exactSum(placed.map((order) => order.discount)),
    reversal = exactSum(cancellations.map((item) => item.merchandise)),
    merchRefund = exactSum(
      refunds.flatMap((item) => item.lines.map((line) => line.amount)),
    ),
    net = exactSum([gross, -discount, -reversal, -merchRefund]);
  const salesRefs = combine(
    refs("order", placed),
    refs("cancellation", cancellations),
    refs("refund", refunds),
  );
  fact(
    "gross_sales",
    gross,
    refs("order", placed),
    "sum original unit price × placed quantity",
    "Order placement dates",
  );
  fact(
    "discounts",
    discount,
    refs("order", placed),
    "sum allocated merchandise discounts",
    "Order placement dates",
  );
  fact(
    "cancellations",
    reversal,
    refs("cancellation", cancellations),
    "sum once-only discounted merchandise reversals",
    "Cancellation event dates",
  );
  fact(
    "merchandise_refunds",
    merchRefund,
    refs("refund", refunds),
    "sum issued merchandise refund components",
    "Refund issue dates",
  );
  fact(
    "net_sales",
    net,
    salesRefs,
    "gross − discounts − cancellation reversals − merchandise refunds",
    "Placement and adjustment event dates",
  );
  const excludedOrders = placed
    .filter((order) => cancelled(graph, order, scope.asOf))
    .map((order) => ({
      ref: `order:${order.id}`,
      reason: "Cancelled as of the selected cut",
    }));
  fact(
    "included_orders",
    included.length,
    refs("order", included),
    "count period-placed orders not cancelled as of cut",
    "Order dates; cancellation state at as-of",
    "count",
    { excluded: excludedOrders },
  );
  fact(
    "aov",
    exactSum(included.map((order) => order.merchandise)),
    refs("order", included),
    "included discounted merchandise before refunds / included orders",
    "Order dates; before refunds",
    "usd-cents",
    { denominator: included.length, excluded: excludedOrders },
  );
  const awaiting = graph.orders.filter(
    (order) =>
      order.placedAt <= scope.asOf &&
      !cancelled(graph, order, scope.asOf) &&
      (!order.shippedAt || order.shippedAt > scope.asOf),
  );
  fact(
    "awaiting_fulfilment",
    awaiting.length,
    refs("order", awaiting),
    "count placed non-cancelled orders not yet shipped",
    "Current operational balance at as-of",
    "count",
    { asOf: true },
  );
  fact(
    "refund_value",
    exactSum(
      refunds.map((item) =>
        exactSum([
          ...item.lines.map((line) => line.amount),
          item.delivery,
          item.tax,
        ]),
      ),
    ),
    refs("refund", refunds),
    "issued merchandise + delivery + simulated tax refunds",
    "Refund issue dates",
  );
  fact(
    "refunded_orders",
    new Set(refunds.map((item) => item.orderId)).size,
    combine(
      refs("refund", refunds),
      refunds.map((item) => `order:${item.orderId}`),
    ),
    "distinct orders with issued refunds in period",
    "Refund issue dates",
    "count",
  );
  const received = graph.returns.filter(
    (item) => item.receivedAt && inPeriod(item.receivedAt),
  );
  fact(
    "returned_units",
    exactSum(
      received.flatMap((item) => item.lines.map((line) => line.units.length)),
    ),
    refs("return", received),
    "sum physically received unit indices",
    "Physical receipt dates",
    "count",
  );
  const open = graph.returns.filter(
    (item) =>
      item.requestedAt <= scope.asOf &&
      (!item.receivedAt || item.receivedAt > scope.asOf) &&
      (!item.closedAt || item.closedAt > scope.asOf),
  );
  fact(
    "open_returns",
    exactSum(
      open.flatMap((item) => item.lines.map((line) => line.units.length)),
    ),
    refs("return", open),
    "requested/approved unit quantities not yet received or closed",
    "Current operational balance at as-of",
    "count",
    { asOf: true },
  );
  const variants = graph.products.flatMap((product) =>
    product.variants
      .filter((variant) => variant.openedAt <= scope.asOf)
      .map((variant) => ({
        product,
        variant,
        stock: stockOf(graph, variant.id, scope.asOf),
      })),
  );
  const stockRefs = combine(
    variants.map((item) => `variant:${item.variant.id}`),
    refs(
      "movement",
      graph.movements.filter((item) => item.at <= scope.asOf),
    ),
  );
  fact(
    "available_stock",
    exactSum(variants.map((item) => item.stock)),
    stockRefs,
    "opening units + signed stock movements",
    "Inventory balance at as-of",
    "count",
    { asOf: true },
  );
  const feedback = graph.feedback.filter((item) => inPeriod(item.at));
  fact(
    "average_rating",
    exactSum(feedback.map((item) => item.rating)),
    refs("feedback", feedback),
    "sum synthetic ratings / feedback count",
    "Feedback dates; synthetic evidence",
    "rating-hundredths",
    { denominator: feedback.length, scale: 100 },
  );
  const placedUnits = exactSum(
      placed.flatMap((order) => order.lines.map((line) => line.quantity)),
    ),
    cancelledUnits = exactSum(
      cancellations.flatMap((item) =>
        orderOf(graph, item.orderId).lines.map((line) => line.quantity),
      ),
    ),
    returnedUnits = exactSum(
      received.flatMap((item) => item.lines.map((line) => line.units.length)),
    );
  fact(
    "net_units",
    exactSum([placedUnits, -cancelledUnits, -returnedUnits]),
    combine(
      refs("order", placed),
      refs("cancellation", cancellations),
      refs("return", received),
    ),
    "placed units − cancelled units − physically received units",
    "Placement/cancellation/receipt event dates",
    "count",
  );
  const costEvents = graph.movements.filter(
      (item) =>
        ["sale", "cancel", "restock"].includes(item.kind) && inPeriod(item.at),
    ),
    soldCost = exactSum(costEvents.map((item) => costOf(graph, item))),
    costRefs = combine(
      refs("movement", costEvents),
      costEvents.flatMap((item) =>
        item.lineId ? [`line:${item.lineId}`] : [],
      ),
    );
  fact(
    "sold_cost",
    soldCost,
    costRefs,
    "placed unit-cost snapshots − cancellation/restock cost reversals",
    "Placement and eligible reversal event dates",
  );
  const grossResult = exactSum([net, -soldCost]);
  fact(
    "gross_result",
    grossResult,
    combine(salesRefs, costRefs),
    "net merchandise sales − sold cost",
    "Sales and sold-cost event dates",
  );
  fact(
    "gross_margin",
    grossResult,
    combine(salesRefs, costRefs),
    "gross result / net merchandise sales",
    "Sales and sold-cost event dates",
    "basis-points",
    {
      denominator: net,
      scale: 10_000,
      ...(net <= 0
        ? {
            reason:
              "Margin is unavailable when net sales are zero or negative.",
          }
        : {}),
    },
  );
  const expenses = graph.expenses.filter((item) => inPeriod(item.at)),
    expenseTotal = exactSum(expenses.map((item) => item.amount)),
    writeoffs = graph.writeoffs.filter((item) => inPeriod(item.at)),
    inventoryLoss = exactSum(
      writeoffs.map((item) => exactProduct(item.quantity, item.unitCost)),
    );
  fact(
    "expenses",
    expenseTotal,
    refs("expense", expenses),
    "posted operating expenses + signed linked corrections",
    "Expense posting/adjustment dates",
  );
  fact(
    "inventory_loss",
    inventoryLoss,
    combine(
      refs("writeoff", writeoffs),
      refs(
        "movement",
        graph.movements.filter(
          (item) => item.kind === "writeoff" && inPeriod(item.at),
        ),
      ),
    ),
    "available units written off × captured unit cost",
    "Writeoff dates; sold damaged returns excluded",
  );
  const result = exactSum([net, -soldCost, -expenseTotal, -inventoryLoss]),
    resultRefs = combine(
      salesRefs,
      costRefs,
      refs("expense", expenses),
      refs("writeoff", writeoffs),
    );
  fact(
    "operating_result",
    result,
    resultRefs,
    "net sales − sold cost − operating expenses − inventory loss",
    "Contributing event dates; simulated result",
  );
  fact(
    "result_margin",
    result,
    resultRefs,
    "simulated operating result / net sales",
    "Contributing event dates",
    "basis-points",
    {
      denominator: net,
      scale: 10_000,
      ...(net <= 0
        ? {
            reason:
              "Margin is unavailable when net sales are zero or negative.",
          }
        : {}),
    },
  );
  const sessions = graph.traffic.filter((item) => inPeriod(item.startedAt)),
    eligible = sessions.filter((item) => item.actor === "shopper"),
    excludedTraffic = sessions
      .filter((item) => item.actor !== "shopper")
      .map((item) => ({
        ref: `traffic:${item.id}`,
        reason: "Owner/designer activity excluded",
      }));
  const reached = (stage: "engagedAt" | "bagAt" | "checkoutAt") =>
      eligible.filter((item) => item[stage] && item[stage]! <= scope.asOf),
    engaged = reached("engagedAt"),
    bag = reached("bagAt"),
    checkout = reached("checkoutAt"),
    converted = eligible.filter((item) =>
      item.orderIds.some((id) => orderOf(graph, id).placedAt <= scope.asOf),
    );
  fact(
    "eligible_sessions",
    eligible.length,
    refs("traffic", eligible),
    "distinct known shopper sessions beginning in period",
    "Session-start cohort; stages observed to as-of",
    "count",
    { excluded: excludedTraffic },
  );
  for (const [id, items, label] of [
    ["engagement_rate", engaged, "product engagement"],
    ["bag_rate", bag, "add-to-bag"],
    ["checkout_rate", checkout, "checkout initiation"],
    ["conversion_rate", converted, "placed-order conversion"],
  ] as const)
    fact(
      id,
      items.length,
      combine(
        refs("traffic", eligible),
        id === "conversion_rate"
          ? converted.flatMap((item) =>
              item.orderIds
                .filter((id) => orderOf(graph, id).placedAt <= scope.asOf)
                .map((order) => `order:${order}`),
            )
          : [],
      ),
      `${label} sessions / eligible sessions`,
      "Same session-start cohort; repeated actions count once",
      "basis-points",
      {
        denominator: eligible.length,
        scale: 10_000,
        excluded: excludedTraffic,
      },
    );
  fact(
    "checkout_completion",
    converted.length,
    combine(refs("traffic", checkout), refs("traffic", converted)),
    "converting sessions / checkout-reaching sessions",
    "Same session-start cohort",
    "basis-points",
    { denominator: checkout.length, scale: 10_000, excluded: excludedTraffic },
  );
  const buyerIds = [
      ...new Set(
        included.flatMap((order) => (order.buyerId ? [order.buyerId] : [])),
      ),
    ],
    repeat = buyerIds.filter((id) =>
      graph.orders.some(
        (order) =>
          order.buyerId === id &&
          order.placedAt < scope.from &&
          !cancelled(graph, order, scope.asOf),
      ),
    ),
    buyerRefs = combine(
      refs(
        "order",
        included.filter((order) => order.buyerId),
      ),
      buyerIds.map((id) => `buyer:${id}`),
    ),
    unknownBuyers = included
      .filter((order) => !order.buyerId)
      .map((order) => ({
        ref: `order:${order.id}`,
        reason: "No known fictional buyer ID",
      }));
  fact(
    "new_buyer_share",
    buyerIds.length - repeat.length,
    buyerRefs,
    "distinct buyers without a prior non-cancelled order / known period buyers",
    "Order-date cohort; fictional buyer IDs",
    "basis-points",
    { denominator: buyerIds.length, scale: 10_000, excluded: unknownBuyers },
  );
  fact(
    "repeat_buyer_share",
    repeat.length,
    combine(
      buyerRefs,
      graph.orders
        .filter(
          (order) =>
            order.placedAt < scope.from &&
            order.buyerId &&
            repeat.includes(order.buyerId) &&
            !cancelled(graph, order, scope.asOf),
        )
        .map((order) => `order:${order.id}`),
    ),
    "distinct buyers with a prior non-cancelled order / known period buyers",
    "Order-date cohort; fictional buyer IDs",
    "basis-points",
    { denominator: buyerIds.length, scale: 10_000, excluded: unknownBuyers },
  );
  const cohortEnd = scope.to < scope.asOf ? scope.to : scope.asOf,
    cohort = placed.filter((order) => !cancelled(graph, order, cohortEnd)),
    cohortIds = new Set(cohort.map((order) => order.id)),
    cohortRefunds = graph.refunds.filter(
      (item) =>
        cohortIds.has(item.orderId) &&
        item.at < scope.to &&
        item.at <= scope.asOf,
    ),
    refunded = new Set(cohortRefunds.map((item) => item.orderId));
  fact(
    "refunded_order_rate",
    refunded.size,
    combine(refs("order", cohort), refs("refund", cohortRefunds)),
    "period-placed orders refunded by scope end / eligible period-placed orders",
    "Order cohort with adjustment cut at scope end",
    "basis-points",
    { denominator: cohort.length, scale: 10_000 },
  );
  const shippedCohort = cohort.filter(
      (order) =>
        order.shippedAt &&
        order.shippedAt < scope.to &&
        order.shippedAt <= scope.asOf,
    ),
    shippedIds = new Set(shippedCohort.map((order) => order.id)),
    cohortReturns = graph.returns.filter(
      (item) =>
        shippedIds.has(item.orderId) &&
        item.receivedAt &&
        item.receivedAt < scope.to &&
        item.receivedAt <= scope.asOf,
    );
  fact(
    "returned_unit_rate",
    exactSum(
      cohortReturns.flatMap((item) =>
        item.lines.map((line) => line.units.length),
      ),
    ),
    combine(refs("order", shippedCohort), refs("return", cohortReturns)),
    "received units from period-placed orders / shipped units from those orders",
    "Matching order cohort; receipts cut at scope end",
    "basis-points",
    {
      denominator: exactSum(
        shippedCohort.flatMap((order) =>
          order.lines.map((line) => line.quantity),
        ),
      ),
      scale: 10_000,
    },
  );
  const allPlaced = graph.orders.filter(
      (order) => order.placedAt <= scope.asOf,
    ),
    allCancelled = graph.cancellations.filter((item) => item.at <= scope.asOf),
    allReceived = graph.returns.filter(
      (item) => item.receivedAt && item.receivedAt <= scope.asOf,
    ),
    soldUnits = exactSum([
      ...allPlaced.flatMap((order) => order.lines.map((line) => line.quantity)),
      ...allCancelled.flatMap((item) =>
        orderOf(graph, item.orderId).lines.map((line) => -line.quantity),
      ),
      ...allReceived.flatMap((item) =>
        item.lines.map((line) => -line.units.length),
      ),
    ]),
    supply = graph.movements.filter(
      (item) =>
        item.at <= scope.asOf &&
        item.units > 0 &&
        (item.kind === "inbound" || item.kind === "correction"),
    ),
    supplyUnits = exactSum([
      ...variants.map((item) => item.variant.openingStock),
      ...supply.map((item) => item.units),
    ]);
  fact(
    "sell_through",
    soldUnits,
    combine(
      refs("order", allPlaced),
      refs("cancellation", allCancelled),
      refs("return", allReceived),
      refs("movement", supply),
      variants.map((item) => `variant:${item.variant.id}`),
    ),
    "scenario-to-date net units / opening + positive inbound/correcting supply units",
    "Scenario-to-date at as-of; returns counted physically",
    "basis-points",
    { denominator: supplyUnits, scale: 10_000, asOf: true },
  );
  const active = variants.filter(
      (item) => !item.product.archived && !item.variant.archived,
    ),
    stockouts = active.filter((item) => item.stock === 0),
    low = active.filter((item) => item.stock <= 2);
  const matchingStockRefs = (items: typeof variants) => {
    const ids = new Set(items.map((item) => item.variant.id));
    return combine(
      items.map((item) => `variant:${item.variant.id}`),
      refs(
        "movement",
        graph.movements.filter(
          (item) => ids.has(item.variantId) && item.at <= scope.asOf,
        ),
      ),
    );
  };
  const alertScope = {
    asOf: true,
    ...(scope.asOf !== graph.asOf
      ? {
          reason:
            "Historical archive settings are not stored; inspect current stock alerts instead.",
        }
      : {}),
  };
  fact(
    "stockouts",
    stockouts.length,
    matchingStockRefs(stockouts),
    "active variants at zero units",
    "Current inventory balance at as-of",
    "count",
    alertScope,
  );
  fact(
    "low_stock",
    low.length,
    matchingStockRefs(low),
    "active variants at two units or fewer, including stockouts",
    "Current inventory balance at as-of",
    "count",
    alertScope,
  );
  fact(
    "inventory_value",
    exactSum(
      variants.map((item) => exactProduct(item.stock, item.variant.unitCost)),
    ),
    stockRefs,
    "current units × current disclosed demo unit cost",
    "Current cost settings; estimated demo inventory value",
    "usd-cents",
    {
      asOf: true,
      ...(scope.asOf !== graph.asOf
        ? {
            reason:
              "Historical current-cost settings are not stored; inspect current inventory instead.",
          }
        : {}),
    },
  );
  return freeze(output);
}
export function productContribution(
  input: unknown,
  rawScope: unknown,
  productId: string,
): MetricFact {
  const graph = parseGraph(input),
    scope = FactScopeSchema.parse(rawScope);
  ensure(
    graph.products.some((product) => product.id === productId),
    "not-found",
    "This product is unavailable.",
  );
  ensure(
    scope.asOf >= graph.anchorAt && scope.asOf <= graph.asOf,
    "invalid",
    "This as-of date is outside the known demo.",
  );
  const inPeriod = (at: string) =>
    at >= scope.from && at < scope.to && at <= scope.asOf;
  let value = 0;
  const contributors: string[] = [];
  for (const order of graph.orders) {
    const lines = order.lines.filter((line) => line.productId === productId);
    if (!lines.length) continue;
    if (inPeriod(order.placedAt)) {
      value = exactSum([value, ...lines.map((line) => exactSum(line.unitNet))]);
      contributors.push(
        `order:${order.id}`,
        ...lines.map((line) => `line:${line.id}`),
      );
    }
    for (const cancellation of graph.cancellations.filter(
      (item) => item.orderId === order.id && inPeriod(item.at),
    )) {
      value = exactSum([
        value,
        ...lines.map((line) => -exactSum(line.unitNet)),
      ]);
      contributors.push(`cancellation:${cancellation.id}`);
    }
    for (const refund of graph.refunds.filter(
      (item) => item.orderId === order.id && inPeriod(item.at),
    )) {
      const components = refund.lines.filter((item) =>
        lines.some((line) => line.id === item.lineId),
      );
      if (components.length) {
        value = exactSum([value, ...components.map((item) => -item.amount)]);
        contributors.push(`refund:${refund.id}`);
      }
    }
  }
  const unavailable = scope.from < graph.anchorAt;
  return freeze(
    MetricFactSchema.parse({
      factId: "product_net_contribution",
      workspaceId: graph.workspaceId,
      scenarioId: graph.scenarioId,
      revision: graph.revision,
      scope,
      productId,
      dateBasis: "Product's placement and adjustment event dates",
      formula:
        "discounted product merchandise − cancellation − issued product refunds",
      unit: "usd-cents",
      numerator: value,
      denominator: null,
      value: unavailable ? null : value,
      availability: unavailable ? "unavailable" : "available",
      ...(unavailable
        ? { reason: "No recorded history covers this whole period." }
        : {}),
      contributors: [...new Set(contributors)],
      excluded: [],
    }),
  );
}
export function allActivityScope(graph: CommerceGraph): FactScope {
  return {
    from: graph.anchorAt,
    to: new Date(Date.parse(graph.asOf) + 1).toISOString(),
    asOf: graph.asOf,
  };
}
