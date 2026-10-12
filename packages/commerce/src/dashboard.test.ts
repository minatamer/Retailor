import { describe, expect, it } from "vitest";
import { Harness, NOW, SCOPE } from "../test/fixtures.js";
import { dashboardFacts } from "./dashboard.js";
import { facts, allActivityScope } from "./facts.js";
import { generateScenario } from "./scenarios/generate.js";
import { refundable } from "./selectors.js";
import { exactSum } from "./allocation.js";

describe("registered dashboard breakdowns", () => {
  it("reconciles each story's product/category, signed expenses, received returns and inventory with registered totals", () => {
    const h = new Harness();
    for (const preset of ["healthy", "breakeven", "loss"] as const) {
      const graph = generateScenario(h.graph, preset, {
        scenarioId: `story_${preset}`,
        now: NOW,
        availablePhotoIds: h.context.availablePhotoIds,
      }).graph;
      const model = dashboardFacts(graph, allActivityScope(graph));
      const value = (id: string) =>
        model.registry.find((f) => f.factId === id)!.value;
      expect(exactSum(model.products.map((r) => r.fact.numerator))).toBe(
        value("net_sales"),
      );
      expect(exactSum(model.products.map((r) => r.units.numerator))).toBe(
        value("net_units"),
      );
      expect(exactSum(model.categories.map((r) => r.fact.numerator))).toBe(
        value("net_sales"),
      );
      expect(exactSum(model.expenses.map((r) => r.fact.numerator))).toBe(
        value("expenses"),
      );
      expect(exactSum(model.returnReasons.map((r) => r.fact.numerator))).toBe(
        value("returned_units"),
      );
      expect(exactSum(model.inventory.map((r) => r.fact.numerator))).toBe(
        value("available_stock"),
      );
      expect(
        model.categories.every((r) => r.fact.productId === undefined),
      ).toBe(true);
      expect(
        model.products.every((r) => r.fact.productId === r.productId),
      ).toBe(true);
    }
  });
  it("keeps a refund-only date negative with no included orders and unavailable AOV, with the actual adjustment references", () => {
    const h = new Harness();
    h.place();
    h.step("issueRefund", {
      id: "refund",
      orderId: "A",
      ...refundable(h.graph, "A"),
    });
    const scope = {
      from: "2026-06-12T00:00:00.000Z",
      to: "2026-06-13T00:00:00.000Z",
      asOf: NOW,
    };
    const model = dashboardFacts(h.graph, scope);
    expect(model.registry.find((f) => f.factId === "net_sales")!.value).toBe(
      -9800,
    );
    expect(
      model.registry.find((f) => f.factId === "included_orders")!.value,
    ).toBe(0);
    expect(model.registry.find((f) => f.factId === "aov")!.value).toBeNull();
    expect(
      model.categories.find((r) => r.category === "shirts")!.fact,
    ).toMatchObject({ value: -9800, contributors: ["refund:refund"] });
  });
  it("preserves signed category corrections and independent physical receipt dates", () => {
    const h = new Harness();
    h.place();
    h.step(
      "saveExpenseDraft",
      { id: "campaign", category: "marketing", amount: 1000, note: "Demo" },
      { at: "2026-06-11T12:00:00.000Z", origin: "seeded_scenario" },
    );
    h.step(
      "postExpense",
      { draftId: "campaign" },
      { at: "2026-06-11T12:00:00.000Z", origin: "seeded_scenario" },
    );
    h.step("correctExpense", {
      id: "correction",
      expenseId: "campaign",
      amount: -400,
      note: "Demo correction",
    });
    h.step("advanceOrder", { orderId: "A", state: "shipped" });
    h.receive();
    const scope = { ...SCOPE, from: "2026-06-12T00:00:00.000Z" };
    const model = dashboardFacts(h.graph, scope);
    expect(
      model.expenses.find((r) => r.category === "marketing")!.fact,
    ).toMatchObject({ value: -400, contributors: ["expense:correction"] });
    expect(
      model.returnReasons.find((r) => r.reason === "sizing")!.fact.value,
    ).toBe(1);
    expect(model.registry.find((f) => f.factId === "refund_value")!.value).toBe(
      0,
    );
    const shortHistory = dashboardFacts(h.graph, {
      ...scope,
      from: "2026-05-01T00:00:00.000Z",
    });
    expect(shortHistory.expenses.every((r) => r.fact.value === null)).toBe(
      true,
    );
    expect(shortHistory.inventory.every((r) => r.fact.value !== null)).toBe(
      true,
    );
    expect(() =>
      facts(h.graph, { ...scope, asOf: "2026-06-13T00:00:00.000Z" }),
    ).toThrow();
  });
});
