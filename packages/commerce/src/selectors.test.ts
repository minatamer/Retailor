import { describe, expect, it } from "vitest";
import { Harness, product } from "../test/fixtures.js";
import { orderFinancialState, refundable } from "./selectors.js";

describe("order financial disposition", () => {
  it("separates a partial merchandise refund from a complete charge refund", () => {
    const h = new Harness();
    h.place();
    expect(orderFinancialState(h.graph, "A")).toBe("Unadjusted");
    const remaining = refundable(h.graph, "A");
    h.step("issueRefund", {
      id: "merchandise",
      orderId: "A",
      lines: remaining.lines,
      delivery: 0,
      tax: 0,
    });
    expect(orderFinancialState(h.graph, "A")).toBe("Partially refunded");
    h.step("issueRefund", {
      id: "delivery",
      orderId: "A",
      lines: [],
      delivery: remaining.delivery,
      tax: 0,
    });
    expect(orderFinancialState(h.graph, "A")).toBe("Fully refunded");
    expect(h.graph.orders[0]!.state).toBe("placed");
  });
  it("distinguishes cancellation and a zero-value order without any refund", () => {
    const h = new Harness();
    h.place();
    h.step("cancelOrder", { orderId: "A" });
    expect(orderFinancialState(h.graph, "A")).toBe("Cancelled");
    h.step("updateProduct", product("tee", 0, 1600));
    h.step("saveOrderDraft", {
      id: "zero_draft",
      actor: "owner",
      lines: [{ variantId: "tee_m", quantity: 1 }],
      discount: 0,
      delivery: 0,
      tax: 0,
    });
    h.step("placeOrder", { draftId: "zero_draft", orderId: "zero" });
    expect(orderFinancialState(h.graph, "zero")).toBe("Unadjusted");
  });
});
