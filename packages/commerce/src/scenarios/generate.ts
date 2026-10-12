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
  // Source-controlled deterministic identifiers, bounded independently of externally supplied ID length.
  let hash = 2166136261;
  for (const character of `${options.scenarioId}:retailor-history-v1:${preset}`)
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
      label: `Demo shopper ${String(index + 1).padStart(2, "0")}`,
      origin: "seeded_scenario",
      fictional: true,
    })),
  });
  for (let day = 0; day < 28; day++) {
    event(time(day, 5), "addTraffic", {
      sessions: Array.from({ length: 6 }, (_, index) => {
        const at = new Date(time(day, 0)).toISOString(),
          lastAt = new Date(time(day, 5)).toISOString();
        const target = variants.length
          ? variants[(day + index) % variants.length]
          : undefined;
        return {
          id: id("visit", day * 6 + index),
          actor: "shopper",
          origin: "seeded_scenario",
          startedAt: at,
          lastAt,
          ...(target && index < 5 ? { engagedAt: at } : {}),
          ...(target && index < 3 ? { bagAt: at } : {}),
          ...(target && index < 2 ? { checkoutAt: lastAt } : {}),
          productIds: target && index < 5 ? [target.product.id] : [],
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
    const target = variants[index % variants.length]!,
      day = Math.floor((index * 26) / Math.max(1, count - 1)),
      orderId = id("order", index),
      draftId = id("draft", index);
    const discount =
      preset === "loss" ? Math.floor(target.variant.price / 5) : 0;
    event(time(day, 6), "saveOrderDraft", {
      id: draftId,
      actor: "shopper",
      buyerId: id("buyer", index % 12),
      trafficId: id("visit", day * 6),
      lines: [{ variantId: target.variant.id, quantity: 1 }],
      discount,
      delivery: 600,
      tax: 0,
    });
    event(time(day, 7), "placeOrder", { draftId, orderId });
    if (index < count - 1)
      event(time(day, 17), "advanceOrder", { orderId, state: "shipped" });
    if (index < count - 2)
      event(time(day, 27), "advanceOrder", { orderId, state: "fulfilled" });
  }
  // Explicit posted causes; no expense amount is reverse-calculated to force a chosen KPI.
  for (const [index, category, amount, note] of [
    [
      0,
      "marketing",
      preset === "healthy" ? 4000 : preset === "breakeven" ? 25000 : 85000,
      "Authored demo campaign",
    ],
    [
      1,
      "operations",
      preset === "healthy" ? 2000 : preset === "breakeven" ? 2000 : 5000,
      "Authored demo operations",
    ],
  ] as const) {
    const draftId = id("expense", index);
    event(time(27, 45 + index * 2), "saveExpenseDraft", {
      id: draftId,
      category,
      amount,
      note,
    });
    event(time(27, 46 + index * 2), "postExpense", { draftId });
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
  if (count)
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
      seed: "retailor-history-v1",
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
