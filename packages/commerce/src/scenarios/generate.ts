import { CommandSchema } from "@retailor/contracts/commands";
import type { CommerceCommand } from "@retailor/contracts/commands";
import type { CommerceGraph } from "@retailor/contracts/commerce";
import {
  ScenarioPresetSchema,
  ScenarioInfoSchema,
} from "@retailor/contracts/scenarios";
import type { ScenarioPreset } from "@retailor/contracts/scenarios";
import { MAX_MINOR_AMOUNT } from "@retailor/contracts/core";
import { emptyGraph, parseGraph, freeze, serializedBytes } from "../graph.js";
import { applyCommand } from "../commands.js";
import { facts, allActivityScope } from "../facts.js";
import { stockOf } from "../selectors.js";
const DAY = 86_400_000;
export const SCENARIO_LABELS: Record<ScenarioPreset, string> = {
  healthy: "Healthy profit",
  breakeven: "Near break-even",
  loss: "Heavy loss",
};
interface Event {
  at: number;
  type: CommerceCommand["type"];
  payload(graph: CommerceGraph): unknown;
}
/** Seeded patterns create real records. They never assign a headline result or overwrite price/cost. */
export function generateScenario(
  input: CommerceGraph,
  preset: ScenarioPreset,
  options: {
    scenarioId: string;
    now: string;
    availablePhotoIds: ReadonlySet<string>;
  },
) {
  ScenarioPresetSchema.parse(preset);
  const dailyShop = preset === "healthy",
    seed = dailyShop ? "retailor-history-v2" : "retailor-history-v1",
    orderDays = [0, 1, 3, 5, 7, 9, 12, 14, 17, 19, 22, 24, 26, 27],
    shopperNames = [
      "Alex Morgan",
      "Jamie Patel",
      "Sam Rivera",
      "Taylor Chen",
      "Jordan Ellis",
      "Casey Reed",
      "Robin Blake",
      "Morgan Lee",
      "Riley Parker",
      "Drew Quinn",
      "Avery Lane",
      "Cameron Gray",
    ];
  const source = parseGraph(input),
    anchor = Date.parse(source.createdAt),
    historyStart = new Date(anchor - 28 * DAY).toISOString();
  let graph = parseGraph({
    ...emptyGraph({
      workspaceId: source.workspaceId,
      scenarioId: options.scenarioId,
      createdAt: source.createdAt,
      anchorAt: historyStart,
      revision: source.revision + 1,
    }),
    asOf: options.now,
    photos: source.photos,
    products: source.products.map((product) => ({
      ...product,
      variants: product.variants.map((variant) => ({
        ...variant,
        openedAt: historyStart,
        openingStock: product.archived || variant.archived ? 0 : 20,
      })),
    })),
  });
  const available = graph.products.filter(
    (p) =>
      !p.archived &&
      p.imageIds.every((id) => options.availablePhotoIds.has(id)),
  );
  const variants = available.flatMap((product) =>
    product.variants
      .filter((v) => !v.archived && v.price <= MAX_MINOR_AMOUNT - 600)
      .map((variant) => ({ product, variant })),
  );
  const groups = available
    .map((product) => ({
      product,
      variants: variants.filter((row) => row.product.id === product.id),
    }))
    .filter((group) => group.variants.length);
  const targetForOrder = (index: number) => {
    const group = groups[index % groups.length]!;
    return group.variants[index % group.variants.length]!;
  };
  // Source-controlled deterministic identifiers, bounded independently of externally supplied ID length.
  let hash = 2166136261;
  for (const character of `${options.scenarioId}:${seed}:${preset}`)
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0;
  const prefix = `s${hash.toString(16).padStart(8, "0")}`;
  const id = (kind: string, index: number) => `${prefix}_${kind}_${index}`;
  const events: Event[] = [];
  const event = (
    at: number,
    type: Event["type"],
    payload: unknown | ((g: CommerceGraph) => unknown),
  ) => {
    events.push({
      at,
      type,
      payload:
        typeof payload === "function"
          ? (payload as Event["payload"])
          : () => payload,
    });
  };
  const time = (day: number, minute: number) =>
    anchor - (27 - day) * DAY - 60 * 60_000 + minute * 60_000;
  event(anchor - 28 * DAY, "addBuyers", {
    buyers: Array.from({ length: 12 }, (_, index) => ({
      id: id("buyer", index),
      label: dailyShop
        ? shopperNames[index]!
        : `Demo shopper ${String(index + 1).padStart(2, "0")}`,
      origin: "seeded_scenario",
      fictional: true,
    })),
  });
  let visits = 0;
  const orderVisits = new Map<number, string>();
  for (let day = 0; day < 28; day++) {
    const visitCount = dailyShop ? [4, 8, 5, 6, 9, 12, 7][day % 7]! : 6,
      start = visits,
      plannedOrder = dailyShop ? orderDays.indexOf(day) : -1;
    visits += visitCount;
    orderVisits.set(day, id("visit", start));
    event(time(day, dailyShop ? 40 : 5), "addTraffic", {
      sessions: Array.from({ length: visitCount }, (_, index) => {
        const at = new Date(time(day, dailyShop ? index * 2 : 0)).toISOString(),
          lastAt = new Date(
            time(day, dailyShop ? index * 2 + 6 + ((day + index) % 8) : 5),
          ).toISOString(),
          stage = (index * 7 + day) % 10,
          converts =
            dailyShop &&
            index === 0 &&
            plannedOrder >= 0 &&
            ![3, 8].includes(plannedOrder);
        const target = variants.length
          ? dailyShop && plannedOrder >= 0 && index === 0
            ? targetForOrder(plannedOrder)
            : variants[(day + index) % variants.length]
          : undefined;
        const engaged = dailyShop ? index === 0 || stage < 7 : index < 5,
          bag = dailyShop ? converts || stage < 3 : index < 3,
          checkout = dailyShop ? converts || stage === 0 : index < 2;
        return {
          id: id("visit", start + index),
          actor: "shopper",
          origin: "seeded_scenario",
          startedAt: at,
          lastAt,
          ...(target && engaged ? { engagedAt: at } : {}),
          ...(target && bag ? { bagAt: at } : {}),
          ...(target && checkout ? { checkoutAt: lastAt } : {}),
          productIds: target && engaged ? [target.product.id] : [],
        };
      }),
    });
  }
  const count = variants.length
    ? preset === "healthy"
      ? 14
      : preset === "breakeven"
        ? 8
        : 6
    : 0;
  for (let index = 0; index < count; index++) {
    const target = dailyShop
        ? targetForOrder(index)
        : variants[index % variants.length]!,
      day = dailyShop
        ? orderDays[index]!
        : Math.floor((index * 26) / Math.max(1, count - 1)),
      orderId = id("order", index),
      draftId = id("draft", index);
    const quantity =
        dailyShop &&
        [2, 6, 9, 10].includes(index) &&
        target.variant.price * 2 <= MAX_MINOR_AMOUNT - 600
          ? 2
          : 1,
      lines = [{ variantId: target.variant.id, quantity }];
    let subtotal = target.variant.price * quantity;
    if (dailyShop && groups.length > 1 && [2, 5, 8, 10].includes(index)) {
      const otherIndex =
          (index + 4) % groups.length === index % groups.length
            ? index + 1
            : index + 4,
        other = targetForOrder(otherIndex);
      if (subtotal + other.variant.price <= MAX_MINOR_AMOUNT - 600) {
        lines.push({ variantId: other.variant.id, quantity: 1 });
        subtotal += other.variant.price;
      }
    }
    const discount = dailyShop
        ? [5, 8, 10].includes(index)
          ? Math.floor(subtotal / 10)
          : 0
        : preset === "loss"
          ? Math.floor(target.variant.price / 5)
          : 0,
      actor = dailyShop && [3, 8].includes(index) ? "owner" : "shopper";
    event(time(day, dailyShop ? 42 : 6), "saveOrderDraft", {
      id: draftId,
      actor,
      buyerId: id(
        "buyer",
        dailyShop
          ? [0, 1, 2, 3, 0, 4, 5, 2, 6, 1, 7, 8, 3, 9][index]!
          : index % 12,
      ),
      ...(actor === "shopper" ? { trafficId: orderVisits.get(day) } : {}),
      lines,
      discount,
      delivery: dailyShop ? [0, 400, 600][index % 3]! : 600,
      tax: 0,
    });
    event(time(day, dailyShop ? 43 : 7), "placeOrder", { draftId, orderId });
    if (dailyShop) {
      if (index === 1) event(time(day, 50), "cancelOrder", { orderId });
      else {
        if (index < count - 2)
          event(time(Math.min(day + 1, 27), 44), "advanceOrder", {
            orderId,
            state: "shipped",
          });
        if (index < count - 3) {
          event(time(Math.min(day + 2, 27), 45), "advanceOrder", {
            orderId,
            state: "fulfilled",
          });
          event(time(Math.min(day + 3, 27), 53), "addFeedback", {
            feedback: [
              {
                id: id("feedback", index),
                productId: target.product.id,
                orderId,
                origin: "seeded_scenario",
                at: new Date(time(Math.min(day + 3, 27), 53)).toISOString(),
                rating: [4, 5, 5, 3, 4][index % 5]!,
                comment: [
                  "The photos made choosing easy.",
                  "Quick checkout and useful order updates.",
                  "Happy with this addition to my wardrobe.",
                  "Delivery took a little longer than expected.",
                  "The size options were easy to compare.",
                ][index % 5]!,
                synthetic: true,
              },
            ],
          });
        }
      }
      continue;
    }
    if (index < count - 1)
      event(time(day, 17), "advanceOrder", { orderId, state: "shipped" });
    if (index < count - 2)
      event(time(day, 27), "advanceOrder", { orderId, state: "fulfilled" });
  }
  // Explicit posted causes; no expense amount is reverse-calculated to force a chosen KPI.
  const expenses = dailyShop
    ? ([
        [0, "marketing", 3200, "Collection launch promotion", 3],
        [1, "packaging", 2400, "Mailers and packing supplies", 10],
        [2, "marketing", 1800, "Weekend collection promotion", 18],
        [3, "platform", 1600, "Monthly demo storefront tools", 27],
      ] as const)
    : ([
        [
          0,
          "marketing",
          preset === "breakeven" ? 25000 : 85000,
          "Authored demo campaign",
          27,
        ],
        [
          1,
          "operations",
          preset === "breakeven" ? 2000 : 5000,
          "Authored demo operations",
          27,
        ],
      ] as const);
  for (const [index, category, amount, note, day] of expenses) {
    const draftId = id("expense", index);
    event(time(day, 45 + index * 2), "saveExpenseDraft", {
      id: draftId,
      category,
      amount,
      note,
    });
    event(time(day, 46 + index * 2), "postExpense", { draftId });
  }
  if (count && dailyShop) {
    const orderId = id("order", 0),
      returnId = id("return", 0),
      line = (g: CommerceGraph, index = 0) =>
        g.orders.find((o) => o.id === id("order", index))!.lines[0]!;
    event(time(4, 44), "requestReturn", (g: CommerceGraph) => ({
      id: returnId,
      orderId,
      reason: "sizing",
      lines: [{ lineId: line(g).id, units: [0] }],
    }));
    event(time(4, 45), "advanceReturn", { returnId, state: "approved" });
    event(time(5, 44), "receiveReturn", (g: CommerceGraph) => ({
      returnId,
      restockable: [{ lineId: line(g).id, units: [0] }],
    }));
    if (targetForOrder(0).variant.price > 0)
      event(time(5, 45), "issueRefund", (g: CommerceGraph) => ({
        id: id("refund", 0),
        orderId,
        lines: [{ lineId: line(g).id, amount: line(g).unitNet[0] }],
        delivery: 0,
        tax: 0,
      }));
    event(time(5, 46), "restockReturn", { returnId });
    event(time(5, 47), "advanceReturn", { returnId, state: "closed" });
    event(time(26, 49), "requestReturn", (g: CommerceGraph) => ({
      id: id("return", 1),
      orderId: id("order", 10),
      reason: "changed-mind",
      lines: [{ lineId: line(g, 10).id, units: [0] }],
    }));
    event(time(17, 50), "writeoffStock", {
      id: id("loss", 0),
      variantId: variants[0]!.variant.id,
      quantity: 1,
      reason: "One available unit damaged during packing",
    });
    event(time(20, 50), "adjustStock", {
      variantId: variants.at(-1)!.variant.id,
      units: 4,
      kind: "inbound",
      reason: "Small restock delivery",
    });
  }
  if (count && preset === "loss") {
    const orderId = id("order", 0),
      returnId = id("return", 0);
    const line = (g: CommerceGraph) =>
      g.orders.find((o) => o.id === orderId)!.lines[0]!;
    event(time(27, 30), "requestReturn", (g: CommerceGraph) => ({
      id: returnId,
      orderId,
      reason: "damaged",
      lines: [{ lineId: line(g).id, units: [0] }],
    }));
    event(time(27, 31), "advanceReturn", { returnId, state: "approved" });
    event(time(27, 32), "receiveReturn", { returnId, restockable: [] });
    event(time(27, 33), "issueRefund", (g: CommerceGraph) => ({
      id: id("refund", 0),
      orderId,
      lines: [{ lineId: line(g).id, amount: line(g).unitNet[0] }],
      delivery: 0,
      tax: 0,
    }));
    event(time(27, 34), "advanceReturn", { returnId, state: "closed" });
    event(time(27, 35), "writeoffStock", {
      id: id("loss", 0),
      variantId: variants[0]!.variant.id,
      quantity: 1,
      reason: "Authored available-stock damage; separate from sold return",
    });
  }
  if (count && !dailyShop)
    event(time(27, 55), "addFeedback", (g: CommerceGraph) => ({
      feedback: g.orders
        .filter((o) => o.state === "fulfilled")
        .map((o, index) => ({
          id: id("feedback", index),
          productId: o.lines[0]!.productId,
          orderId: o.id,
          origin: "seeded_scenario",
          at: new Date(time(27, 55)).toISOString(),
          rating: preset === "loss" ? 2 + (index % 2) : 4 + (index % 2),
          comment: "Authored fictional clothing feedback",
          synthetic: true,
        })),
    }));
  let sequence = 0;
  const apply = (
    type: CommerceCommand["type"],
    payload: unknown,
    at: string,
    origin: "seeded_scenario" | "guest_action" = "seeded_scenario",
  ) => {
    const command = CommandSchema.parse({
      id: id("cmd", sequence++),
      workspaceId: graph.workspaceId,
      scenarioId: graph.scenarioId,
      expectedRevision: graph.revision,
      origin,
      at,
      expiresAt: new Date(
        Math.min(Date.parse(options.now) + 60_000, Date.parse(graph.expiresAt)),
      ).toISOString(),
      type,
      payload,
    });
    const result = applyCommand(graph, command, {
      now: options.now,
      availablePhotoIds: options.availablePhotoIds,
    });
    if (!result.ok) throw new Error(`Scenario ${type}: ${result.message}`);
    graph = result.graph;
  };
  for (const entry of events.sort((a, b) => a.at - b.at))
    apply(entry.type, entry.payload(graph), new Date(entry.at).toISOString());
  // Preserve only still sellable selections at their current price, within actual reconstructed stock.
  for (const selected of source.bag) {
    const product = graph.products.find((p) =>
        p.variants.some((v) => v.id === selected.variantId),
      ),
      variant = product?.variants.find((v) => v.id === selected.variantId);
    if (
      product &&
      variant &&
      !product.archived &&
      !variant.archived &&
      product.imageIds.every((photo) => options.availablePhotoIds.has(photo))
    ) {
      const quantity = Math.min(selected.quantity, stockOf(graph, variant.id));
      if (quantity)
        apply(
          "setBagLine",
          { variantId: variant.id, quantity },
          options.now,
          "guest_action",
        );
    }
  }
  graph = parseGraph(graph);
  const metrics = facts(graph, allActivityScope(graph)),
    result = metrics.find((f) => f.factId === "operating_result")!.numerator;
  return freeze({
    graph,
    info: ScenarioInfoSchema.parse({
      preset,
      seed,
      anchorAt: source.createdAt,
      openingUnitsPerActiveVariant: 20,
    }),
    result,
    bytes: serializedBytes(graph),
    discardedDrafts: source.orderDrafts.length + source.expenseDrafts.length,
    stockChanges: source.products.flatMap((p) =>
      p.variants.map((v) => ({
        variantId: v.id,
        before: stockOf(source, v.id),
        after: stockOf(graph, v.id),
      })),
    ),
    bagChanged: JSON.stringify(source.bag) !== JSON.stringify(graph.bag),
    assumptions:
      "Synthetic 28-day activity. Active variants start with 20 demo units; current prices and future unit costs are preserved. Expenses are authored patterns, so edited inputs can change the story’s result.",
  });
}
