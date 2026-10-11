import type { CommerceGraph } from "@retailor/contracts/commerce";
import type { Product } from "@retailor/contracts/product";
import { emptyGraph } from "../src/graph.js";
import { NOW, ANCHOR, DAY1, photo } from "./fixtures.js";
/** Independent full-count fixture; assertions use separately calculated expectations. */
export function maximumGraph(): CommerceGraph {
  const graph: CommerceGraph = structuredClone(
    emptyGraph({
      workspaceId: "max_workspace",
      scenarioId: "max_scenario",
      createdAt: NOW,
      anchorAt: ANCHOR,
    }),
  );
  graph.photos = Array.from({ length: 32 }, (_, index) =>
    photo(`photo_${index}`, index + 1),
  );
  graph.products = Array.from({ length: 40 }, (_, index): Product => ({
    id: `product_${index}`,
    title: `Garment ${index} — independent count-pressure fixture`,
    description: "Disclosed sample copy. ".repeat(6),
    category: "tees",
    imageIds: [`photo_${index % 32}`],
    sizingSystemId: "regional-demo",
    attributes: [],
    archived: index >= 20,
    variants: Array.from({ length: index < 8 ? 8 : 7 }, (_, v) => ({
      id: `variant_${index}_${v}`,
      size: `Size ${v + 1}`,
      colour: "Neutral",
      sku: `FIXTURE-${index}-${v}`,
      openingStock: 10,
      openedAt: ANCHOR,
      price: 1000,
      unitCost: 400,
      archived: false,
    })),
  }));
  const variants = graph.products.flatMap((product) =>
    product.variants.map((variant) => ({ product, variant })),
  );
  graph.buyers = Array.from({ length: 40 }, (_, index) => ({
    id: `buyer_${index}`,
    label: `Fictional shopper ${index}`,
    origin: "seeded_scenario",
    fictional: true,
  }));
  graph.traffic = Array.from({ length: 320 }, (_, index) => {
    const at = index < 300 ? DAY1 : NOW;
    return {
      id: `traffic_${index}`,
      actor: "shopper",
      origin: index < 300 ? "seeded_scenario" : "guest_action",
      startedAt: at,
      lastAt: at,
      engagedAt: at,
      bagAt: at,
      checkoutAt: at,
      productIds: [`product_${index % 40}`],
      orderIds: [],
    };
  });
  graph.orders = Array.from({ length: 30 }, (_, index) => {
    const at = index < 20 ? DAY1 : NOW,
      trafficId = `traffic_${index < 20 ? index : 300 + index - 20}`,
      lines = Array.from({ length: 7 }, (_, l) => {
        const item = variants[index * 7 + l]!;
        return {
          id: `line_${index}_${l}`,
          productId: item.product.id,
          variantId: item.variant.id,
          photoId: item.product.imageIds[0]!,
          title: item.product.title,
          category: item.product.category,
          size: item.variant.size,
          colour: item.variant.colour,
          sku: item.variant.sku,
          quantity: 5,
          unitPrice: 1000,
          unitCost: 400,
          unitNet: [1000, 1000, 1000, 1000, 1000],
        };
      });
    const order = {
      id: `order_${index}`,
      actor: "shopper" as const,
      origin:
        index < 20 ? ("seeded_scenario" as const) : ("guest_action" as const),
      buyerId: `buyer_${index}`,
      trafficId,
      placedAt: at,
      state: index < 2 ? ("cancelled" as const) : ("shipped" as const),
      ...(index >= 2 ? { shippedAt: at } : {}),
      lines,
      gross: 35000,
      discount: 0,
      merchandise: 35000,
      delivery: 600,
      tax: 0,
      total: 35600,
    };
    graph.traffic.find((session) => session.id === trafficId)!.orderIds = [
      order.id,
    ];
    for (let l = 0; l < lines.length; l++) {
      const line = lines[l]!;
      graph.movements.push({
        id: `sale_${index}_${l}`,
        variantId: line.variantId,
        at,
        origin: order.origin,
        units: -5,
        kind: "sale",
        sourceId: order.id,
        lineId: line.id,
        reason: "Placed demo order",
      });
    }
    return order;
  });
  graph.cancellations = graph.orders.slice(0, 2).map((order, index) => {
    const event = {
      id: `cancel_${index}`,
      orderId: order.id,
      at: DAY1,
      origin: "seeded_scenario" as const,
      merchandise: 35000,
      delivery: 600,
      tax: 0,
    };
    for (let l = 0; l < order.lines.length; l++) {
      const line = order.lines[l]!;
      graph.movements.push({
        id: `cancel_move_${index}_${l}`,
        variantId: line.variantId,
        at: DAY1,
        origin: "seeded_scenario",
        units: 5,
        kind: "cancel",
        sourceId: event.id,
        lineId: line.id,
        reason: "Cancelled demo order",
      });
    }
    return event;
  });
  graph.returns = Array.from({ length: 60 }, (_, index) => {
    const order = graph.orders[2 + (index % 28)]!,
      line = order.lines[Math.floor(index / 28)]!;
    return {
      id: `return_${index}`,
      orderId: order.id,
      origin: "guest_action",
      reason: "damaged",
      state: "received",
      requestedAt: NOW,
      approvedAt: NOW,
      receivedAt: NOW,
      lines: [{ lineId: line.id, units: [0], restockable: [] }],
    };
  });
  graph.refunds = Array.from({ length: 60 }, (_, index) => {
    const order = graph.orders[2 + (index % 28)]!;
    return {
      id: `refund_${index}`,
      orderId: order.id,
      origin: "guest_action",
      at: NOW,
      lines: [{ lineId: order.lines[0]!.id, amount: 1 }],
      delivery: 0,
      tax: 0,
    };
  });
  graph.writeoffs = Array.from({ length: 24 }, (_, index) => {
    const item = variants[index]!;
    const event = {
      id: `writeoff_${index}`,
      variantId: item.variant.id,
      at: NOW,
      origin: "guest_action" as const,
      quantity: 1,
      unitCost: 400,
      reason: "Available warehouse loss",
    };
    graph.movements.push({
      id: `writeoff_move_${index}`,
      variantId: item.variant.id,
      at: NOW,
      origin: "guest_action",
      units: -1,
      kind: "writeoff",
      sourceId: event.id,
      reason: event.reason,
    });
    return event;
  });
  for (let index = 0; index < 8; index++)
    graph.movements.push({
      id: `inbound_${index}`,
      variantId: variants[index]!.variant.id,
      at: NOW,
      origin: "guest_action",
      units: 1,
      kind: "inbound",
      sourceId: `command_${index}`,
      reason: "Disclosed received stock",
    });
  graph.expenses = Array.from({ length: 40 }, (_, index) => ({
    id: `expense_${index}`,
    category: "operations",
    amount: 100,
    note: "Disclosed demo overhead",
    at: NOW,
    origin: "guest_action",
    kind: "posting",
  }));
  graph.expenseDrafts = Array.from({ length: 4 }, (_, index) => ({
    id: `expense_draft_${index}`,
    category: "marketing",
    amount: 100,
    note: "Unposted draft",
  }));
  graph.orderDrafts = Array.from({ length: 4 }, (_, index) => ({
    id: `order_draft_${index}`,
    actor: "owner",
    origin: "guest_action",
    at: NOW,
    lines: variants.slice(0, 8).map((item) => ({
      variantId: item.variant.id,
      quantity: 1,
      unitPrice: 1000,
    })),
    discount: 0,
    delivery: 600,
    tax: 0,
  }));
  graph.bag = variants.slice(80, 88).map((item) => ({
    variantId: item.variant.id,
    quantity: 5,
    unitPrice: 1000,
  }));
  graph.feedback = Array.from({ length: 60 }, (_, index) => ({
    id: `feedback_${index}`,
    productId: `product_${index % 40}`,
    origin: "seeded_scenario",
    at: NOW,
    rating: 4,
    comment: "Disclosed fictional feedback for the actual retained garment.",
    synthetic: true,
  }));
  graph.revision = 160;
  graph.receipts = Array.from({ length: 160 }, (_, index) => ({
    id: `receipt_${index}`,
    identity: JSON.stringify({
      type: "touchTraffic",
      at: NOW,
      origin: "guest_action",
      payload: { sessionId: `traffic_${index}`, stage: "visit" },
    }),
    revision: index + 1,
    appliedAt: NOW,
    refs: [`traffic:traffic_${index}`],
  }));
  return graph;
}
