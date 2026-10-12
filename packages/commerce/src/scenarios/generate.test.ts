import { describe, expect, it } from "vitest";
import { Harness, NOW, product } from "../../test/fixtures.js";
import { maximumGraph } from "../../test/maximum.js";
import { parseGraph, serializedBytes } from "../graph.js";
import { stockOf } from "../selectors.js";
import { generateScenario } from "./generate.js";
import { applyCommand } from "../commands.js";
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
    expect(healthy.result).toBe(14 * (6000 - 2400) - 6000);
    expect(near.result).toBe(8 * (6000 - 2400) - 27000);
    expect(loss.result).toBe(6 * 4800 - 4800 - 6 * 2400 - 90000 - 2400);
    expect(healthy.result).toBeGreaterThan(0);
    expect(Math.abs(near.result)).toBeLessThan(2000);
    expect(loss.result).toBeLessThan(0);
    for (const result of [healthy, near, loss]) {
      expect(generate(h, result.info.preset)).toEqual(result);
      expect(parseGraph(result.graph)).toEqual(result.graph);
      expect(result.graph.orders.length).toBeLessThanOrEqual(20);
      expect(result.graph.traffic).toHaveLength(168);
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
            o.trafficId &&
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
