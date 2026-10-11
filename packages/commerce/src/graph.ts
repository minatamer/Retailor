import { GraphSchema, COMMERCE_LIMITS } from "@retailor/contracts/commerce";
import type { CommerceGraph, Movement } from "@retailor/contracts/commerce";
import type { Product, Variant } from "@retailor/contracts/product";
import { MAX_MINOR_AMOUNT } from "@retailor/contracts/core";
import { ensure, unique, CommerceError } from "./errors.js";
import {
  allocate,
  allocateUnits,
  exactSum,
  exactProduct,
} from "./allocation.js";

export function utf8Bytes(value: string) {
  let bytes = 0;
  for (const char of value) {
    const code = char.codePointAt(0)!;
    bytes += code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
  }
  return bytes;
}
export function serializedBytes(value: unknown) {
  return utf8Bytes(JSON.stringify(value));
}
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object")
    return `{${Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
export function freeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
export function emptyGraph(input: {
  workspaceId: string;
  scenarioId: string;
  createdAt: string;
  anchorAt?: string;
  revision?: number;
}): CommerceGraph {
  return parseGraph({
    schemaVersion: 1,
    workspaceId: input.workspaceId,
    scenarioId: input.scenarioId,
    revision: input.revision ?? 0,
    createdAt: input.createdAt,
    anchorAt: input.anchorAt ?? input.createdAt,
    expiresAt: new Date(Date.parse(input.createdAt) + 7_200_000).toISOString(),
    asOf: input.createdAt,
    photos: [],
    products: [],
    bag: [],
    orderDrafts: [],
    orders: [],
    cancellations: [],
    returns: [],
    refunds: [],
    movements: [],
    expenseDrafts: [],
    expenses: [],
    writeoffs: [],
    buyers: [],
    traffic: [],
    feedback: [],
    receipts: [],
  });
}
/** Shape, relationships, exact snapshots and full ledger coherence, independent of UI. */
export function parseGraph(input: unknown): CommerceGraph {
  const parsed = GraphSchema.safeParse(input);
  if (!parsed.success)
    throw new CommerceError(
      parsed.error.issues.some((issue) => issue.code === "too_big")
        ? "limit"
        : "invalid",
      "The demo exceeded a record/text limit or has an invalid record shape.",
    );
  const graph = parsed.data;
  ensure(
    serializedBytes(graph) <= COMMERCE_LIMITS.graphBytes,
    "limit",
    "This demo reached its 512-KiB record limit. Start a new scenario.",
  );
  ensure(
    graph.anchorAt <= graph.createdAt &&
      graph.createdAt <= graph.asOf &&
      graph.asOf < graph.expiresAt &&
      Date.parse(graph.expiresAt) - Date.parse(graph.createdAt) === 7_200_000,
    "invalid",
    "Invalid workspace dates.",
  );
  const date = (at: string, origin?: "seeded_scenario" | "guest_action") =>
    ensure(
      at >= graph.anchorAt &&
        at <= graph.asOf &&
        (origin !== "guest_action" || at >= graph.createdAt),
      "relation",
      "Record date is outside the known history.",
    );
  const groups = [
    graph.photos,
    graph.products,
    graph.orders,
    graph.orderDrafts,
    graph.cancellations,
    graph.returns,
    graph.refunds,
    graph.movements,
    graph.expenses,
    graph.expenseDrafts,
    graph.writeoffs,
    graph.buyers,
    graph.traffic,
    graph.feedback,
    graph.receipts,
  ];
  for (const items of groups) unique(items.map((item) => item.id));
  const photos = new Set(graph.photos.map((item) => item.id)),
    buyers = new Set(graph.buyers.map((item) => item.id));
  const variants = new Map<string, { product: Product; variant: Variant }>();
  ensure(
    graph.products.filter((item) => !item.archived).length <=
      COMMERCE_LIMITS.activeProducts,
    "limit",
    "At most 20 products can be active.",
  );
  for (const product of graph.products) {
    unique(product.imageIds);
    ensure(
      product.imageIds.every((id) => photos.has(id)),
      "relation",
      "Product photo reference is unavailable.",
    );
    unique(product.attributes.map((item) => item.name));
    for (const attribute of product.attributes) {
      unique(attribute.sourceIds);
      ensure(
        attribute.sourceIds.every((id) => product.imageIds.includes(id)) &&
          (attribute.provenance !== "image_observed" ||
            attribute.sourceIds.length > 0) &&
          (attribute.provenance !== "unknown" || attribute.value === null),
        "relation",
        "Attribute provenance is invalid.",
      );
    }
    unique(
      product.variants.map(
        (variant) =>
          `${variant.size.toLowerCase()}:${variant.colour.toLowerCase()}`,
      ),
      "Variant option combinations must be distinct.",
    );
    for (const variant of product.variants) {
      date(variant.openedAt);
      ensure(
        !variants.has(variant.id),
        "duplicate",
        "Variant IDs must be unique across products.",
      );
      variants.set(variant.id, { product, variant });
    }
  }
  ensure(
    variants.size <= COMMERCE_LIMITS.variants,
    "limit",
    "This demo reached its retained variant limit.",
  );
  const variant = (id: string) => {
    const item = variants.get(id);
    ensure(item, "relation", "Unknown variant reference.");
    return item;
  };
  const orders = new Map(graph.orders.map((order) => [order.id, order]));
  const orderOf = (id: string) => {
    const order = orders.get(id);
    ensure(order, "relation", "Unknown order reference.");
    return order;
  };
  for (const draft of graph.orderDrafts) {
    date(draft.at, draft.origin);
    unique(draft.lines.map((line) => line.variantId));
    for (const line of draft.lines) variant(line.variantId);
    ensure(
      !draft.buyerId || buyers.has(draft.buyerId),
      "relation",
      "Unknown buyer reference.",
    );
  }
  unique(graph.bag.map((line) => line.variantId));
  for (const line of graph.bag) {
    const item = variant(line.variantId);
    ensure(
      !item.product.archived && !item.variant.archived,
      "relation",
      "Archived variants cannot remain in the bag.",
    );
  }
  for (const origin of ["seeded_scenario", "guest_action"] as const)
    ensure(
      graph.orders.filter((order) => order.origin === origin).length <=
        (origin === "seeded_scenario"
          ? COMMERCE_LIMITS.seededOrders
          : COMMERCE_LIMITS.guestOrders),
      "limit",
      "This scenario reached its placed-order allowance.",
    );
  unique(
    graph.orders.flatMap((order) => order.lines.map((line) => line.id)),
    "Placed line identities must be unique across orders.",
  );
  for (const order of graph.orders) {
    date(order.placedAt, order.origin);
    unique(order.lines.map((line) => line.id));
    unique(order.lines.map((line) => line.variantId));
    ensure(
      !order.buyerId || buyers.has(order.buyerId),
      "relation",
      "Unknown buyer reference.",
    );
    const grossLines = order.lines.map((line) =>
      exactProduct(line.unitPrice, line.quantity),
    );
    ensure(
      order.gross === exactSum(grossLines) &&
        order.discount <= order.gross &&
        order.merchandise === order.gross - order.discount &&
        order.total ===
          exactSum([order.merchandise, order.delivery, order.tax]),
      "relation",
      "Order totals do not reconcile.",
    );
    const discounts = allocate(order.discount, grossLines);
    for (let index = 0; index < order.lines.length; index++) {
      const line = order.lines[index]!,
        item = variant(line.variantId);
      ensure(
        item.product.id === line.productId && photos.has(line.photoId),
        "relation",
        "Order item reference is invalid.",
      );
      ensure(
        canonical(line.unitNet) ===
          canonical(
            allocateUnits(
              grossLines[index]! - discounts[index]!,
              line.quantity,
            ),
          ),
        "relation",
        "Discounted unit snapshot is invalid.",
      );
    }
    if (order.shippedAt) {
      date(order.shippedAt);
      ensure(
        order.shippedAt >= order.placedAt,
        "relation",
        "Shipment predates placement.",
      );
    }
    if (order.fulfilledAt) {
      date(order.fulfilledAt);
      ensure(
        order.shippedAt && order.fulfilledAt >= order.shippedAt,
        "relation",
        "Fulfilment predates shipment.",
      );
    }
    ensure(
      (order.state === "shipped" || order.state === "fulfilled") ===
        Boolean(order.shippedAt) &&
        (order.state === "fulfilled") === Boolean(order.fulfilledAt),
      "relation",
      "Order state dates disagree.",
    );
  }
  unique(graph.cancellations.map((item) => item.orderId));
  for (const cancellation of graph.cancellations) {
    const order = orderOf(cancellation.orderId);
    date(cancellation.at, cancellation.origin);
    ensure(
      order.state === "cancelled" &&
        cancellation.at >= order.placedAt &&
        cancellation.merchandise === order.merchandise &&
        cancellation.delivery === order.delivery &&
        cancellation.tax === order.tax &&
        !graph.returns.some((item) => item.orderId === order.id) &&
        !graph.refunds.some((item) => item.orderId === order.id),
      "relation",
      "Cancellation does not reconcile.",
    );
  }
  for (const order of graph.orders)
    ensure(
      (order.state === "cancelled") ===
        graph.cancellations.some((item) => item.orderId === order.id),
      "relation",
      "Cancellation event is missing.",
    );
  const claimedUnits = new Set<string>();
  for (const returned of graph.returns) {
    const order = orderOf(returned.orderId);
    date(returned.requestedAt, returned.origin);
    ensure(
      order.shippedAt &&
        returned.requestedAt >= order.shippedAt &&
        order.state !== "cancelled",
      "relation",
      "Only shipped units can be returned.",
    );
    unique(returned.lines.map((line) => line.lineId));
    for (const line of returned.lines) {
      const placed = order.lines.find((item) => item.id === line.lineId);
      ensure(placed, "relation", "Unknown returned line.");
      unique(line.units);
      unique(line.restockable);
      ensure(
        line.units.every((unit) => unit < placed.quantity) &&
          line.restockable.every((unit) => line.units.includes(unit)) &&
          (returned.reason !== "damaged" || line.restockable.length === 0),
        "relation",
        "Returned unit selection is invalid.",
      );
      if (returned.state !== "closed" || returned.receivedAt)
        for (const unit of line.units) {
          const key = `${order.id}:${line.lineId}:${unit}`;
          ensure(
            !claimedUnits.has(key),
            "relation",
            "Units are already in a return.",
          );
          claimedUnits.add(key);
        }
    }
    if (returned.approvedAt) {
      date(returned.approvedAt);
      ensure(
        returned.approvedAt >= returned.requestedAt,
        "relation",
        "Invalid return approval date.",
      );
    }
    if (returned.receivedAt) {
      date(returned.receivedAt);
      ensure(
        returned.approvedAt && returned.receivedAt >= returned.approvedAt,
        "relation",
        "Invalid return receipt date.",
      );
    }
    if (returned.closedAt) {
      date(returned.closedAt);
      ensure(
        returned.closedAt >=
          (returned.receivedAt ?? returned.approvedAt ?? returned.requestedAt),
        "relation",
        "Invalid return closure date.",
      );
    }
    ensure(
      (returned.state === "closed") === Boolean(returned.closedAt) &&
        (returned.state !== "requested" || !returned.approvedAt) &&
        (returned.state !== "approved" ||
          (returned.approvedAt && !returned.receivedAt)) &&
        (returned.state !== "received" || Boolean(returned.receivedAt)) &&
        (Boolean(returned.receivedAt) ||
          returned.lines.every((line) => !line.restockable.length)),
      "relation",
      "Return state dates disagree.",
    );
    if (returned.restockedAt) {
      date(returned.restockedAt);
      ensure(
        returned.receivedAt &&
          returned.restockedAt >= returned.receivedAt &&
          returned.lines.some((line) => line.restockable.length),
        "relation",
        "Uninspected units cannot be restocked.",
      );
    }
  }
  for (const refund of graph.refunds) {
    const order = orderOf(refund.orderId);
    date(refund.at, refund.origin);
    ensure(
      order.state !== "cancelled" && refund.at >= order.placedAt,
      "relation",
      "Invalid refund lifecycle.",
    );
    unique(refund.lines.map((line) => line.lineId));
    ensure(
      refund.lines.every((line) =>
        order.lines.some((item) => item.id === line.lineId),
      ) &&
        exactSum([
          ...refund.lines.map((line) => line.amount),
          refund.delivery,
          refund.tax,
        ]) > 0,
      "relation",
      "Invalid refund components.",
    );
  }
  for (const order of graph.orders) {
    const refunds = graph.refunds.filter((item) => item.orderId === order.id);
    ensure(
      exactSum(refunds.map((item) => item.delivery)) <= order.delivery &&
        exactSum(refunds.map((item) => item.tax)) <= order.tax,
      "refund-limit",
      "Delivery or tax refund exceeds its remaining basis.",
    );
    for (const line of order.lines)
      ensure(
        exactSum(
          refunds.flatMap((item) =>
            item.lines
              .filter((component) => component.lineId === line.id)
              .map((component) => component.amount),
          ),
        ) <= exactSum(line.unitNet),
        "refund-limit",
        "Merchandise refund exceeds its remaining discounted basis.",
      );
  }
  const expenses = new Map(graph.expenses.map((item) => [item.id, item]));
  for (const expense of graph.expenses) {
    date(expense.at, expense.origin);
    if (expense.kind === "posting")
      ensure(
        !expense.parentId && expense.amount >= 0,
        "relation",
        "Posted expenses cannot be negative.",
      );
    else {
      const parent = expense.parentId
        ? expenses.get(expense.parentId)
        : undefined;
      ensure(
        parent?.kind === "posting" &&
          parent.at <= expense.at &&
          parent.category === expense.category &&
          expense.amount !== 0,
        "relation",
        "Expense adjustment requires its original posting.",
      );
    }
  }
  for (const posting of graph.expenses.filter(
    (item) => item.kind === "posting",
  )) {
    const adjustments = graph.expenses
      .filter((item) => item.parentId === posting.id)
      .sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
    let balance = posting.amount,
      voided = false;
    for (const item of adjustments) {
      ensure(
        !voided &&
          balance + item.amount >= 0 &&
          balance + item.amount <= MAX_MINOR_AMOUNT,
        "relation",
        "Expense history cannot over-correct or follow a void.",
      );
      if (item.kind === "void") {
        ensure(
          item.amount === -balance,
          "relation",
          "Expense void must reverse its exact remaining balance.",
        );
        voided = true;
      }
      balance += item.amount;
    }
  }
  for (const writeoff of graph.writeoffs) {
    variant(writeoff.variantId);
    date(writeoff.at, writeoff.origin);
  }
  const expected = new Map<
    string,
    {
      kind: Movement["kind"];
      sourceId: string;
      lineId?: string;
      variantId: string;
      units: number;
      at: string;
    }
  >();
  const expect = (
    key: string,
    value: {
      kind: Movement["kind"];
      sourceId: string;
      lineId?: string;
      variantId: string;
      units: number;
      at: string;
    },
  ) => expected.set(key, value);
  for (const order of graph.orders)
    for (const line of order.lines)
      expect(`sale:${order.id}:${line.id}`, {
        kind: "sale",
        sourceId: order.id,
        lineId: line.id,
        variantId: line.variantId,
        units: -line.quantity,
        at: order.placedAt,
      });
  for (const cancellation of graph.cancellations)
    for (const line of orderOf(cancellation.orderId).lines)
      expect(`cancel:${cancellation.id}:${line.id}`, {
        kind: "cancel",
        sourceId: cancellation.id,
        lineId: line.id,
        variantId: line.variantId,
        units: line.quantity,
        at: cancellation.at,
      });
  for (const returned of graph.returns)
    if (returned.restockedAt)
      for (const line of returned.lines.filter(
        (item) => item.restockable.length,
      )) {
        const placed = orderOf(returned.orderId).lines.find(
          (item) => item.id === line.lineId,
        )!;
        expect(`restock:${returned.id}:${line.lineId}`, {
          kind: "restock",
          sourceId: returned.id,
          lineId: line.lineId,
          variantId: placed.variantId,
          units: line.restockable.length,
          at: returned.restockedAt,
        });
      }
  for (const writeoff of graph.writeoffs)
    expect(`writeoff:${writeoff.id}:`, {
      kind: "writeoff",
      sourceId: writeoff.id,
      variantId: writeoff.variantId,
      units: -writeoff.quantity,
      at: writeoff.at,
    });
  const observed = new Set<string>();
  for (const movement of graph.movements) {
    variant(movement.variantId);
    date(movement.at, movement.origin);
    if (movement.kind === "inbound" || movement.kind === "correction") {
      ensure(
        !movement.lineId && (movement.kind !== "inbound" || movement.units > 0),
        "relation",
        "Invalid reasoned stock movement.",
      );
      continue;
    }
    const key = `${movement.kind}:${movement.sourceId}:${movement.lineId ?? ""}`,
      basis = expected.get(key);
    ensure(
      basis &&
        !observed.has(key) &&
        movement.variantId === basis.variantId &&
        movement.units === basis.units &&
        movement.at === basis.at,
      "relation",
      "Stock movement does not match its economic source.",
    );
    observed.add(key);
  }
  ensure(
    observed.size === expected.size,
    "relation",
    "Economic event is missing its stock movement.",
  );
  for (const { variant: item } of variants.values()) {
    let balance = item.openingStock;
    const movements = graph.movements
      .filter((movement) => movement.variantId === item.id)
      .sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
    for (const movement of movements) {
      ensure(
        movement.at >= item.openedAt,
        "relation",
        "Stock movement predates its variant.",
      );
      balance += movement.units;
      ensure(
        balance >= 0 && balance <= 10_000,
        "stock",
        "Stock history exceeds available units or its limit.",
      );
    }
  }
  const traffic = new Map(graph.traffic.map((item) => [item.id, item]));
  for (const origin of ["seeded_scenario", "guest_action"] as const)
    ensure(
      graph.traffic.filter((item) => item.origin === origin).length <=
        (origin === "seeded_scenario"
          ? COMMERCE_LIMITS.seededTraffic
          : COMMERCE_LIMITS.guestTraffic),
      "limit",
      "This scenario reached its traffic-session allowance.",
    );
  for (const session of graph.traffic) {
    date(session.startedAt, session.origin);
    date(session.lastAt);
    ensure(
      session.lastAt >= session.startedAt,
      "relation",
      "Traffic chronology is invalid.",
    );
    unique(session.productIds);
    unique(session.orderIds);
    ensure(
      session.productIds.every((id) =>
        graph.products.some((item) => item.id === id),
      ),
      "relation",
      "Traffic product reference is invalid.",
    );
    const stages = [
      session.startedAt,
      session.engagedAt,
      session.bagAt,
      session.checkoutAt,
    ];
    for (let index = 1; index < stages.length; index++) {
      const at = stages[index];
      if (at) {
        date(at);
        ensure(
          stages[index - 1] && at >= stages[index - 1]! && at <= session.lastAt,
          "relation",
          "Shopper stages must be a nested chronological cohort.",
        );
      }
    }
    for (const id of session.orderIds) {
      const order = orderOf(id);
      ensure(
        session.actor === "shopper" &&
          order.actor === "shopper" &&
          session.checkoutAt &&
          order.trafficId === session.id &&
          order.placedAt >= session.checkoutAt &&
          order.placedAt <= session.lastAt,
        "relation",
        "Conversion requires a known eligible checkout session.",
      );
    }
  }
  for (const order of graph.orders)
    if (order.trafficId)
      ensure(
        traffic.get(order.trafficId)?.orderIds.includes(order.id),
        "relation",
        "Order conversion link is missing.",
      );
  for (const draft of graph.orderDrafts)
    if (draft.trafficId)
      ensure(
        traffic.has(draft.trafficId),
        "relation",
        "Draft traffic reference is invalid.",
      );
  for (const feedback of graph.feedback) {
    date(feedback.at, feedback.origin);
    ensure(
      graph.products.some((item) => item.id === feedback.productId) &&
        (!feedback.orderId ||
          orderOf(feedback.orderId).lines.some(
            (line) => line.productId === feedback.productId,
          )),
      "relation",
      "Feedback must resolve to this catalogue and order.",
    );
  }
  for (let index = 0; index < graph.receipts.length; index++) {
    const receipt = graph.receipts[index]!;
    date(receipt.appliedAt);
    ensure(
      receipt.revision <= graph.revision &&
        (index === 0 ||
          receipt.revision > graph.receipts[index - 1]!.revision) &&
        (!receipt.undo || index === graph.receipts.length - 1),
      "relation",
      "Receipt revision or Undo eligibility is invalid.",
    );
  }
  if (graph.receipts.length)
    ensure(
      graph.receipts.at(-1)!.revision === graph.revision,
      "relation",
      "Latest command receipt is missing.",
    );
  return freeze(graph);
}
export function invalidGraph(error: unknown): CommerceError {
  return error instanceof CommerceError
    ? error
    : new CommerceError("invalid", "The demo records are invalid.");
}
