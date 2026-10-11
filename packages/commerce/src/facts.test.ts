import { describe, it, expect } from "vitest";
import { facts, productContribution } from "./facts.js";
import { applyCommand } from "./commands.js";
import {
  Harness,
  product,
  NOW,
  DAY1,
  ANCHOR,
  SCOPE,
} from "../test/fixtures.js";
import type { FactId, FactScope } from "@retailor/contracts/facts";
const fact = (h: Harness, id: FactId, scope: FactScope = SCOPE) =>
  facts(h.graph, scope).find((item) => item.factId === id)!;
it("limits stock alert evidence to qualifying variants and explains unknown buyers", () => {
  const h = new Harness();
  h.step("adjustStock", {
    variantId: "shirt_m",
    units: -8,
    kind: "correction",
    reason: "Counted shortage",
  });
  h.step("adjustStock", {
    variantId: "tee_m",
    units: 1,
    kind: "inbound",
    reason: "Received stock",
  });
  const low = fact(h, "low_stock");
  expect(low.value).toBe(1);
  expect(low.contributors).toContain("variant:shirt_m");
  expect(low.contributors).not.toContain("variant:tee_m");
  expect(low.contributors).not.toContain(
    `movement:${h.graph.movements[1]!.id}`,
  );
  expect(fact(h, "stockouts").contributors).toEqual([]);
  h.place("unknown", "tee_m", 1, 0, NOW);
  expect(fact(h, "new_buyer_share")).toMatchObject({
    value: null,
    contributors: [],
    excluded: [{ ref: "order:unknown", reason: "No known fictional buyer ID" }],
  });
});
it("includes positive count corrections in disclosed sell-through supply", () => {
  const h = new Harness();
  h.step("adjustStock", {
    variantId: "shirt_m",
    units: 10,
    kind: "correction",
    reason: "Previously missed shelf stock",
  });
  h.place("sale", "shirt_m", 5, 0, NOW);
  expect(fact(h, "sell_through")).toMatchObject({
    numerator: 5,
    denominator: 30,
    value: 1667,
  });
});
describe("independent worked financial expectations", () => {
  it("reconciles shirt A and cancelled tee B with separate refund/restock bases", () => {
    const h = new Harness();
    h.place();
    h.place("B", "tee_m", 1, 0);
    h.step(
      "cancelOrder",
      { orderId: "B" },
      { at: DAY1, origin: "seeded_scenario" },
    );
    h.step(
      "advanceOrder",
      { orderId: "A", state: "shipped" },
      { at: DAY1, origin: "seeded_scenario" },
    );
    h.receive();
    h.step("restockReturn", { returnId: "R" });
    const line = h.graph.orders[0]!.lines[0]!,
      { command } = h.step("issueRefund", {
        id: "refund",
        orderId: "A",
        lines: [{ lineId: line.id, amount: 4900 }],
        delivery: 0,
        tax: 0,
      });
    expect(applyCommand(h.graph, command, h.context)).toMatchObject({
      ok: true,
      replayed: true,
    });
    expect(fact(h, "gross_sales").value).toBe(14600);
    expect(fact(h, "discounts").value).toBe(1000);
    expect(fact(h, "cancellations").value).toBe(3800);
    expect(fact(h, "merchandise_refunds").value).toBe(4900);
    expect(fact(h, "net_sales").value).toBe(4900);
    expect(fact(h, "included_orders").value).toBe(1);
    expect(fact(h, "aov")).toMatchObject({
      value: 9800,
      numerator: 9800,
      denominator: 1,
    });
    expect(fact(h, "returned_units").value).toBe(1);
    expect(fact(h, "net_units").value).toBe(1);
    expect(fact(h, "sold_cost").value).toBe(2400);
    expect(fact(h, "operating_result").value).toBe(2500);
    expect(fact(h, "available_stock").value).toBe(19);
    expect(productContribution(h.graph, SCOPE, "shirt").value).toBe(4900);
    expect(productContribution(h.graph, SCOPE, "tee").value).toBe(0);
    expect(fact(h, "net_sales").contributors).toContain("refund:refund");
    expect(fact(h, "aov").excluded).toEqual([
      { ref: "order:B", reason: "Cancelled as of the selected cut" },
    ]);
  });
  it("shows a negative refund-only period without inventing included orders or cost reversals", () => {
    const h = new Harness();
    h.place();
    const line = h.graph.orders[0]!.lines[0]!;
    h.step("issueRefund", {
      id: "later",
      orderId: "A",
      lines: [{ lineId: line.id, amount: 4900 }],
      delivery: 0,
      tax: 0,
    });
    const later = { from: "2026-06-12T00:00:00.000Z", to: SCOPE.to, asOf: NOW };
    expect(fact(h, "net_sales", later).value).toBe(-4900);
    expect(fact(h, "included_orders", later).value).toBe(0);
    expect(fact(h, "aov", later)).toMatchObject({
      value: null,
      availability: "unavailable",
      denominator: 0,
    });
    expect(fact(h, "sold_cost", later).value).toBe(0);
    expect(fact(h, "gross_margin", later).availability).toBe("unavailable");
    expect(fact(h, "refunded_orders", later).value).toBe(1);
    expect(fact(h, "refunded_order_rate", later).value).toBeNull();
  });
  it("retains $24 sold cost after a $60 goodwill refund and reverses it only on eligible restock", () => {
    const h = new Harness();
    h.step("createProduct", product("goods", 6000, 2400), {
      at: ANCHOR,
      origin: "seeded_scenario",
    });
    h.place("A", "goods_m", 1, 0);
    const line = h.graph.orders[0]!.lines[0]!;
    h.step("issueRefund", {
      id: "goodwill",
      orderId: "A",
      lines: [{ lineId: line.id, amount: 6000 }],
      delivery: 0,
      tax: 0,
    });
    expect(fact(h, "net_sales").value).toBe(0);
    expect(fact(h, "sold_cost").value).toBe(2400);
    expect(fact(h, "operating_result").value).toBe(-2400);
    expect(fact(h, "returned_units").value).toBe(0);
    h.step(
      "advanceOrder",
      { orderId: "A", state: "shipped" },
      { at: DAY1, origin: "seeded_scenario" },
    );
    h.receive();
    expect(fact(h, "sold_cost").value).toBe(2400);
    h.step("restockReturn", { returnId: "R" });
    expect(fact(h, "sold_cost").value).toBe(0);
    expect(fact(h, "operating_result").value).toBe(0);
  });
  it("does not charge a sold damaged return again as warehouse loss", () => {
    const h = new Harness();
    h.step("createProduct", product("goods", 6000, 2400), {
      at: ANCHOR,
      origin: "seeded_scenario",
    });
    h.place("A", "goods_m", 1, 0);
    h.step(
      "advanceOrder",
      { orderId: "A", state: "shipped" },
      { at: DAY1, origin: "seeded_scenario" },
    );
    h.receive("damaged", "A", false, NOW, "damaged");
    const line = h.graph.orders[0]!.lines[0]!;
    h.step("issueRefund", {
      id: "refund",
      orderId: "A",
      lines: [{ lineId: line.id, amount: 6000 }],
      delivery: 0,
      tax: 0,
    });
    expect(fact(h, "sold_cost").value).toBe(2400);
    expect(fact(h, "inventory_loss").value).toBe(0);
    expect(fact(h, "net_units").value).toBe(0);
    expect(fact(h, "operating_result").value).toBe(-2400);
  });
  it("separates available-stock loss and operating expense from inbound purchase cost", () => {
    const h = new Harness();
    h.step("writeoffStock", {
      id: "damage",
      variantId: "shirt_m",
      quantity: 1,
      reason: "Warehouse damage",
    });
    h.step("saveExpenseDraft", {
      id: "marketing",
      category: "marketing",
      amount: 1000,
      note: "Disclosed demo spending",
    });
    expect(fact(h, "expenses").value).toBe(0);
    h.step("postExpense", { draftId: "marketing" });
    h.step("adjustStock", {
      variantId: "shirt_m",
      units: 2,
      kind: "inbound",
      reason: "Disclosed received units",
    });
    expect(fact(h, "inventory_loss").value).toBe(2400);
    expect(fact(h, "expenses").value).toBe(1000);
    expect(fact(h, "sold_cost").value).toBe(0);
    expect(fact(h, "operating_result").value).toBe(-3400);
    h.step("correctExpense", {
      id: "correction",
      expenseId: "marketing",
      amount: -200,
      note: "Revised bill",
    });
    expect(fact(h, "expenses").value).toBe(800);
    expect(fact(h, "operating_result").value).toBe(-3200);
  });
});
describe("known nested cohorts and exact availability", () => {
  it("rejects owner-created orders linked to shopper traffic, including recovered graphs", () => {
    const h = new Harness();
    h.step("addTraffic", {
      sessions: [
        {
          id: "shopper",
          actor: "shopper",
          origin: "guest_action",
          startedAt: NOW,
          lastAt: NOW,
          engagedAt: NOW,
          bagAt: NOW,
          checkoutAt: NOW,
          productIds: ["shirt"],
        },
      ],
    });
    h.step("saveOrderDraft", {
      id: "owner",
      actor: "owner",
      trafficId: "shopper",
      lines: [{ variantId: "shirt_m", quantity: 1 }],
      discount: 0,
      delivery: 0,
      tax: 0,
    });
    expect(
      applyCommand(
        h.graph,
        h.command("placeOrder", { draftId: "owner", orderId: "invalid" }),
        h.context,
      ),
    ).toMatchObject({ ok: false, code: "relation" });
    expect(fact(h, "conversion_rate").value).toBe(0);
    h.step("saveOrderDraft", {
      id: "guest",
      actor: "shopper",
      trafficId: "shopper",
      lines: [{ variantId: "shirt_m", quantity: 1 }],
      discount: 0,
      delivery: 0,
      tax: 0,
    });
    h.step("placeOrder", { draftId: "guest", orderId: "valid" });
    expect(() =>
      facts(
        {
          ...h.graph,
          orders: h.graph.orders.map((order) => ({ ...order, actor: "owner" })),
        },
        SCOPE,
      ),
    ).toThrow("eligible checkout");
  });
  it("deduplicates stages and multiple orders in one session while excluding owner/designer visits", () => {
    const h = new Harness();
    h.step(
      "addTraffic",
      {
        sessions: ["buy", "browse", "owner", "designer"].map((id) => ({
          id,
          actor:
            id === "owner"
              ? ("owner" as const)
              : id === "designer"
                ? ("designer" as const)
                : ("shopper" as const),
          origin: "seeded_scenario" as const,
          startedAt: DAY1,
          lastAt: DAY1,
          ...(id === "buy"
            ? { engagedAt: DAY1, bagAt: DAY1, checkoutAt: DAY1 }
            : {}),
          productIds: id === "buy" ? ["shirt"] : [],
        })),
      },
      { origin: "seeded_scenario" },
    );
    for (let index = 0; index < 3; index++)
      h.step("touchTraffic", {
        sessionId: "buy",
        stage: "checkout",
        productId: "shirt",
      });
    for (const id of ["A", "B"]) {
      h.step(
        "saveOrderDraft",
        {
          id: `draft_${id}`,
          actor: "shopper",
          trafficId: "buy",
          lines: [{ variantId: "shirt_m", quantity: 1 }],
          discount: 0,
          delivery: 0,
          tax: 0,
        },
        { at: DAY1, origin: "seeded_scenario" },
      );
      h.step(
        "placeOrder",
        { draftId: `draft_${id}`, orderId: id },
        { at: DAY1, origin: "seeded_scenario" },
      );
    }
    expect(fact(h, "eligible_sessions").value).toBe(2);
    for (const id of [
      "engagement_rate",
      "bag_rate",
      "checkout_rate",
      "conversion_rate",
    ] as const)
      expect(fact(h, id)).toMatchObject({
        value: 5000,
        numerator: 1,
        denominator: 2,
      });
    expect(fact(h, "checkout_completion").value).toBe(10000);
    expect(fact(h, "conversion_rate").excluded).toHaveLength(2);
    expect(h.graph.traffic[0]!.productIds).toEqual(["shirt"]);
    expect(h.graph.traffic[0]!.lastAt).toBe(NOW);
  });
  it("rejects unnested flags and invalid owner conversion links", () => {
    const h = new Harness();
    expect(
      applyCommand(
        h.graph,
        h.command("addTraffic", {
          sessions: [
            {
              id: "broken",
              actor: "shopper",
              origin: "guest_action",
              startedAt: NOW,
              lastAt: NOW,
              checkoutAt: NOW,
              productIds: [],
            },
          ],
        }),
        h.context,
      ).ok,
    ).toBe(false);
    h.step("addTraffic", {
      sessions: [
        {
          id: "owner",
          actor: "owner",
          origin: "guest_action",
          startedAt: NOW,
          lastAt: NOW,
          engagedAt: NOW,
          bagAt: NOW,
          checkoutAt: NOW,
          productIds: [],
        },
      ],
    });
    h.step("saveOrderDraft", {
      id: "draft",
      actor: "owner",
      trafficId: "owner",
      lines: [{ variantId: "shirt_m", quantity: 1 }],
      discount: 0,
      delivery: 0,
      tax: 0,
    });
    expect(
      applyCommand(
        h.graph,
        h.command("placeOrder", { draftId: "draft", orderId: "invalid" }),
        h.context,
      ),
    ).toMatchObject({ ok: false, code: "relation" });
    expect(fact(h, "eligible_sessions").value).toBe(0);
    expect(fact(h, "conversion_rate").value).toBeNull();
  });
  it("uses a session-start cohort when checkout/order crosses a day boundary", () => {
    const h = new Harness();
    h.step(
      "addTraffic",
      {
        sessions: [
          {
            id: "overnight",
            actor: "shopper",
            origin: "seeded_scenario",
            startedAt: "2026-06-11T23:59:00.000Z",
            lastAt: NOW,
            engagedAt: NOW,
            bagAt: NOW,
            checkoutAt: NOW,
            productIds: ["shirt"],
          },
        ],
      },
      { origin: "seeded_scenario" },
    );
    h.step("saveOrderDraft", {
      id: "draft",
      actor: "shopper",
      trafficId: "overnight",
      lines: [{ variantId: "shirt_m", quantity: 1 }],
      discount: 0,
      delivery: 0,
      tax: 0,
    });
    h.step("placeOrder", { draftId: "draft", orderId: "A" });
    const yesterday = {
      from: ANCHOR,
      to: "2026-06-12T00:00:00.000Z",
      asOf: NOW,
    };
    expect(fact(h, "eligible_sessions", yesterday).value).toBe(1);
    expect(fact(h, "conversion_rate", yesterday).value).toBe(10000);
    expect(fact(h, "included_orders", yesterday).value).toBe(0);
  });
  it("uses known fictional buyers and matching order/return/refund date cohorts", () => {
    const h = new Harness();
    h.step("addBuyers", {
      buyers: [
        {
          id: "buyer",
          label: "Fictional shopper 1",
          fictional: true,
          origin: "guest_action",
        },
      ],
    });
    for (const [id, at] of [
      ["prior", DAY1],
      ["current", NOW],
    ]) {
      h.step(
        "saveOrderDraft",
        {
          id: `draft_${id}`,
          actor: "shopper",
          buyerId: "buyer",
          lines: [{ variantId: "shirt_m", quantity: 1 }],
          discount: 0,
          delivery: 0,
          tax: 0,
        },
        { at: at!, origin: "seeded_scenario" },
      );
      h.step(
        "placeOrder",
        { draftId: `draft_${id}`, orderId: id! },
        { at: at!, origin: "seeded_scenario" },
      );
    }
    const today = { from: "2026-06-12T00:00:00.000Z", to: SCOPE.to, asOf: NOW };
    expect(fact(h, "repeat_buyer_share", today).value).toBe(10000);
    expect(fact(h, "new_buyer_share", today).value).toBe(0);
    const line = h.graph.orders.find((order) => order.id === "prior")!
      .lines[0]!;
    h.step("issueRefund", {
      id: "older",
      orderId: "prior",
      lines: [{ lineId: line.id, amount: 5400 }],
      delivery: 0,
      tax: 0,
    });
    expect(fact(h, "refunded_orders", today).value).toBe(1);
    expect(fact(h, "refunded_order_rate", today)).toMatchObject({
      value: 0,
      numerator: 0,
      denominator: 1,
    });
  });
  it("distinguishes genuine zero, unavailable denominator, missing comparison history and historical inventory settings", () => {
    const h = new Harness();
    expect(fact(h, "net_sales")).toMatchObject({
      value: 0,
      availability: "available",
    });
    expect(fact(h, "aov")).toMatchObject({
      value: null,
      availability: "unavailable",
      denominator: 0,
    });
    expect(fact(h, "average_rating").value).toBeNull();
    const older = { from: "2026-06-01T00:00:00.000Z", to: ANCHOR, asOf: NOW };
    expect(fact(h, "net_sales", older)).toMatchObject({
      value: null,
      availability: "unavailable",
    });
    const previousCut = { ...SCOPE, asOf: DAY1 };
    expect(fact(h, "available_stock", previousCut).value).toBe(20);
    expect(fact(h, "inventory_value", previousCut).value).toBeNull();
    expect(fact(h, "stockouts", previousCut)).toMatchObject({
      value: null,
      availability: "unavailable",
    });
    expect(fact(h, "low_stock", previousCut)).toMatchObject({
      value: null,
      availability: "unavailable",
    });
  });
  it("exposes deterministic rounded AOV/rating and their unrounded evidence", () => {
    const h = new Harness();
    h.step("addFeedback", {
      feedback: [
        {
          id: "one",
          productId: "shirt",
          origin: "guest_action",
          at: NOW,
          rating: 4,
          comment: "Synthetic feedback",
          synthetic: true,
        },
        {
          id: "two",
          productId: "shirt",
          origin: "guest_action",
          at: NOW,
          rating: 5,
          comment: "Synthetic feedback",
          synthetic: true,
        },
      ],
    });
    expect(fact(h, "average_rating")).toMatchObject({
      value: 450,
      numerator: 9,
      denominator: 2,
      unit: "rating-hundredths",
    });
    expect(fact(h, "average_rating").contributors).toEqual([
      "feedback:one",
      "feedback:two",
    ]);
    expect(Object.isFrozen(fact(h, "average_rating").contributors)).toBe(true);
  });
});
