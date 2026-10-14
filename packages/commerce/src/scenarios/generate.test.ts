import { describe, expect, it } from "vitest";
import { Harness, NOW, product } from "../../test/fixtures.js";
import { maximumGraph } from "../../test/maximum.js";
import { parseGraph, serializedBytes } from "../graph.js";
import { stockOf } from "../selectors.js";
import { generateScenario } from "./generate.js";
import { applyCommand } from "../commands.js";
import { ScenarioInfoSchema } from "@retailor/contracts/scenarios";
function catalogue() {
  const h = new Harness();
  h.step("updateProduct", product("shirt", 6000, 2400));
  h.step("updateProduct", product("tee", 6000, 2400));
  return h;
}
const generate = (h: Harness, preset: "healthy" | "breakeven" | "loss") =>
  generateScenario(h.graph, preset, {
    scenarioId: `world_${preset}`,
    now: NOW,
    availablePhotoIds: h.context.availablePhotoIds,
  });
describe("real record scenarios over a captured clothing catalogue", () => {
  it("reproduces each pattern, reconciles independent money/stock and leaves guest headroom", () => {
    const h = catalogue();
    const healthy = generate(h, "healthy"),
      near = generate(h, "breakeven"),
      loss = generate(h, "loss");
    // 22 ordered units, one cancellation and one restocked/refunded unit;
    // $42 discounts, $90 dated operating expenses and one $24 stock writeoff.
    expect(healthy.result).toBe(20 * (6000 - 2400) - 4200 - 9000 - 2400);
    expect(near.result).toBe(8 * (6000 - 2400) - 27000);
    expect(loss.result).toBe(6 * 4800 - 4800 - 6 * 2400 - 90000 - 2400);
    expect(healthy.result).toBeGreaterThan(0);
    expect(Math.abs(near.result)).toBeLessThan(2000);
    expect(loss.result).toBeLessThan(0);
    for (const result of [healthy, near, loss]) {
      expect(generate(h, result.info.preset)).toEqual(result);
      expect(parseGraph(result.graph)).toEqual(result.graph);
      expect(result.graph.orders.length).toBeLessThanOrEqual(20);
      expect(result.graph.traffic).toHaveLength(
        result.info.preset === "healthy" ? 204 : 168,
      );
      expect(result.graph.buyers).toHaveLength(12);
      expect(result.graph.receipts.length).toBeLessThan(110);
      expect(result.graph.orderDrafts).toEqual([]);
      expect(result.graph.expenseDrafts).toEqual([]);
      expect(
        result.graph.products.every((p) =>
          p.variants.every((v) => v.price === 6000 && v.unitCost === 2400),
        ),
      ).toBe(true);
      for (const p of result.graph.products)
        for (const v of p.variants)
          expect(stockOf(result.graph, v.id)).toBe(
            20 +
              result.graph.movements
                .filter((m) => m.variantId === v.id)
                .reduce((sum, m) => sum + m.units, 0),
          );
      expect(
        result.graph.orders.every(
          (o) =>
            o.origin === "seeded_scenario" &&
            (o.actor === "shopper" ? !!o.trafficId : !o.trafficId) &&
            o.lines.every((l) =>
              h.graph.products.some(
                (p) =>
                  p.id === l.productId &&
                  p.variants.some((v) => v.id === l.variantId),
              ),
            ),
        ),
      ).toBe(true);
    }
    expect(loss.graph.returns[0]!.restockedAt).toBeUndefined();
    expect(loss.graph.writeoffs).toHaveLength(1);
  });
  it("defaults to varied linked shop activity with real lifecycle, provenance and reconciled daily facts", () => {
    const h = catalogue(),
      before = h.graph,
      { graph, info } = generate(h, "healthy");
    expect(h.graph).toBe(before);
    expect(info.seed).toBe("retailor-history-v2");
    expect(
      ScenarioInfoSchema.parse({ ...info, seed: "retailor-history-v1" }).seed,
    ).toBe("retailor-history-v1");
    expect(
      ScenarioInfoSchema.safeParse({ ...info, seed: "unknown" }).success,
    ).toBe(false);
    expect(graph.orders).toHaveLength(14);
    expect(new Set(graph.orders.map((o) => o.state))).toEqual(
      new Set(["fulfilled", "shipped", "placed", "cancelled"]),
    );
    expect(graph.orders.some((o) => o.lines.length > 1)).toBe(true);
    expect(graph.orders.some((o) => o.lines.some((l) => l.quantity > 1))).toBe(
      true,
    );
    expect(graph.orders.some((o) => o.discount > 0)).toBe(true);
    expect(new Set(graph.orders.map((o) => o.delivery)).size).toBe(3);
    expect(graph.orders.filter((o) => o.actor === "owner")).toHaveLength(2);
    const buyerIds = graph.orders.map((o) => o.buyerId);
    expect(new Set(buyerIds).size).toBeLessThan(buyerIds.length);
    expect(
      graph.buyers.every((b) => b.fictional && b.origin === "seeded_scenario"),
    ).toBe(true);
    const days = new Map<string, number>();
    for (const visit of graph.traffic) {
      const day = visit.startedAt.slice(0, 10);
      days.set(day, (days.get(day) ?? 0) + 1);
      expect(Date.parse(visit.lastAt)).toBeGreaterThanOrEqual(
        Date.parse(visit.startedAt),
      );
      if (visit.checkoutAt) expect(visit.bagAt && visit.engagedAt).toBeTruthy();
      for (const orderId of visit.orderIds)
        expect(graph.orders.find((o) => o.id === orderId)).toMatchObject({
          actor: "shopper",
          trafficId: visit.id,
        });
    }
    expect(days.size).toBe(28);
    expect(new Set(days.values()).size).toBeGreaterThan(3);
    expect(graph.returns).toHaveLength(2);
    expect(graph.returns.some((r) => r.state === "requested")).toBe(true);
    const restocked = graph.returns.find((r) => r.restockedAt)!;
    expect(restocked.state).toBe("closed");
    expect(graph.refunds).toHaveLength(1);
    expect(graph.refunds[0]!.orderId).toBe(restocked.orderId);
    expect(graph.expenses).toHaveLength(4);
    expect(new Set(graph.expenses.map((e) => e.at.slice(0, 10))).size).toBe(4);
    expect(
      graph.movements.some((m) => m.kind === "inbound" && m.units === 4),
    ).toBe(true);
    expect(new Set(graph.feedback.map((f) => f.rating)).size).toBeGreaterThan(
      1,
    );
    expect(
      graph.feedback.every(
        (f) => f.synthetic && f.origin === "seeded_scenario",
      ),
    ).toBe(true);
    // Recompute money from immutable snapshots and issued records, independent of recipe/KPI constants.
    const active = graph.orders.filter((o) => o.state !== "cancelled"),
      merchandise =
        active
          .flatMap((o) => o.lines)
          .reduce((sum, l) => sum + l.unitNet.reduce((a, b) => a + b, 0), 0) -
        graph.refunds.reduce(
          (sum, r) => sum + r.lines.reduce((a, l) => a + l.amount, 0),
          0,
        ),
      rawCost = active
        .flatMap((o) => o.lines)
        .reduce((sum, l) => sum + l.quantity * l.unitCost, 0),
      returned = graph.orders.find((o) => o.id === restocked.orderId)!
        .lines[0]!,
      costs = rawCost - returned.unitCost,
      expenses = graph.expenses.reduce((sum, e) => sum + e.amount, 0),
      loss = graph.writeoffs.reduce(
        (sum, w) => sum + w.quantity * w.unitCost,
        0,
      ),
      factsResult = generate(h, "healthy").result;
    expect(merchandise).toBe(115800);
    expect(costs).toBe(48000);
    expect(factsResult).toBe(merchandise - costs - expenses - loss);
    expect(
      graph.orders.every((o) => Date.parse(o.placedAt) <= Date.parse(NOW)),
    ).toBe(true);
    expect(
      graph.traffic.every((t) => Date.parse(t.lastAt) <= Date.parse(NOW)),
    ).toBe(true);
  });
  it("covers the accepted catalogue, stays bounded for a single/free/near-limit product and excludes unavailable bytes", () => {
    const h = catalogue();
    for (const suffix of ["third", "fourth", "fifth"]) {
      h.step("createProduct", {
        ...product(suffix),
        imageIds: ["photo_goods"],
      });
    }
    const diverse = generate(h, "healthy").graph;
    expect(
      new Set(diverse.orders.flatMap((o) => o.lines.map((l) => l.productId)))
        .size,
    ).toBe(5);
    for (const price of [0, 6000, 999_999_400]) {
      const single = catalogue();
      single.step("removeProduct", { productId: "tee" });
      single.step("updateProduct", product("shirt", price, 2400));
      const result = generate(single, "healthy");
      expect(parseGraph(result.graph)).toEqual(result.graph);
      expect(result.graph.orders).toHaveLength(14);
      expect(result.graph.orders.every((o) => o.lines.length === 1)).toBe(true);
      expect(stockOf(result.graph, "shirt_m")).toBeGreaterThanOrEqual(0);
      if (price === 0) expect(result.graph.refunds).toEqual([]);
      expect(result.graph.receipts.length).toBeLessThan(110);
    }
  });
  it("uses radically different IDs/options/prices and never rewrites the source to hit the label", () => {
    const h = catalogue();
    h.step("updateProduct", {
      ...product("shirt", 12000, 15000),
      title: "Owner-made formal jacket",
      category: "jackets",
    });
    const before = h.graph;
    const result = generate(h, "healthy");
    expect(h.graph).toBe(before);
    expect(result.result).toBeLessThan(0);
    expect(result.graph.products[0]!.title).toBe("Owner-made formal jacket");
    expect(result.graph.products[0]!.variants[0]).toMatchObject({
      price: 12000,
      unitCost: 15000,
      size: "M",
      sku: "SHIRT-M",
    });
    expect(result.assumptions).toContain("edited inputs can change");
  });
  it("revalidates saved bags, discards old activity/drafts and retains exact catalogue photo identities", () => {
    const h = catalogue();
    h.place();
    h.step("setBagLine", { variantId: "shirt_m", quantity: 2 });
    h.step("saveExpenseDraft", {
      id: "unposted",
      category: "marketing",
      amount: 500,
      note: "Discarded draft",
    });
    const result = generate(h, "loss");
    expect(result.discardedDrafts).toBe(1);
    expect(result.graph.workspaceId).toBe(h.graph.workspaceId);
    expect(result.graph.scenarioId).not.toBe(h.graph.scenarioId);
    expect(result.graph.photos).toEqual(h.graph.photos);
    expect(result.graph.bag).toMatchObject([
      { variantId: "shirt_m", quantity: 2 },
    ]);
    expect(result.graph.orders.some((o) => o.id === "A")).toBe(false);
    expect(result.graph.expiresAt).toBe(h.graph.expiresAt);
  });
  it("handles missing photos, no active products and extreme price without inventing a sellable replacement", () => {
    const h = catalogue();
    const missing = generateScenario(h.graph, "healthy", {
      scenarioId: "missing",
      now: NOW,
      availablePhotoIds: new Set(),
    });
    expect(missing.graph.orders).toEqual([]);
    expect(missing.graph.traffic.every((t) => !t.engagedAt)).toBe(true);
    h.step("removeProduct", { productId: "shirt" });
    h.step("removeProduct", { productId: "tee" });
    expect(generate(h, "loss").graph.products).toEqual([]);
    const extreme = catalogue();
    extreme.step("updateProduct", product("shirt", 1_000_000_000, 2400));
    expect(
      generate(extreme, "healthy").graph.orders.every((o) =>
        o.lines.every((l) => l.productId !== "shirt"),
      ),
    ).toBe(true);
  });
  it("fits the independent maximum catalogue and accepts ten further owner orders without erasing replay receipts", () => {
    const initial = maximumGraph(),
      photos = new Set(initial.photos.map((p) => p.id));
    const result = generateScenario(initial, "healthy", {
      scenarioId: "max_rebuilt",
      now: NOW,
      availablePhotoIds: photos,
    });
    let graph = result.graph;
    expect(serializedBytes(graph)).toBeLessThan(512 * 1024);
    for (let index = 0; index < 10; index++)
      for (const [type, payload] of [
        [
          "saveOrderDraft",
          {
            id: `guest_draft_${index}`,
            actor: "owner",
            lines: [
              {
                variantId: graph.products[index]!.variants[0]!.id,
                quantity: 1,
              },
            ],
            discount: 0,
            delivery: 600,
            tax: 0,
          },
        ],
        [
          "placeOrder",
          { draftId: `guest_draft_${index}`, orderId: `guest_order_${index}` },
        ],
      ] as const) {
        const next = applyCommand(
          graph,
          {
            id: `guest_cmd_${index}_${type}`,
            workspaceId: graph.workspaceId,
            scenarioId: graph.scenarioId,
            expectedRevision: graph.revision,
            origin: "guest_action",
            at: NOW,
            expiresAt: "2026-06-12T18:01:00.000Z",
            type,
            payload,
          },
          { now: NOW, availablePhotoIds: photos },
        );
        expect(next.ok).toBe(true);
        if (next.ok) graph = next.graph;
      }
    expect(
      graph.orders.filter((o) => o.origin === "guest_action"),
    ).toHaveLength(10);
    expect(graph.receipts.length).toBeLessThan(160);
    expect(result.bytes).toBeLessThan(512 * 1024);
  });
});
