import { afterEach, describe, expect, it, vi } from "vitest";
import { environment, file } from "../../../test/workspace";
import type { CheckoutRequester } from "./request";
import type { CheckoutResult } from "@retailor/contracts/checkout";
import { checkoutQuote } from "@retailor/commerce/checkout";
import { stockOf } from "@retailor/commerce/selectors";
import { bagEntries, bagPromoDiscount, displayedOrder } from "../bag/quote";
import { SESSION_KEY } from "../session/projection";
const environments: ReturnType<typeof environment>[] = [];
afterEach(() => environments.splice(0).forEach((env) => env.dispose()));
async function setup() {
  const env = environment();
  environments.push(env);
  let result: CheckoutResult;
  const port: CheckoutRequester = {
    available: vi.fn(async () => true),
    start: vi.fn(
      async (input) =>
        (result = {
          schemaVersion: 1,
          attemptId: input.attemptId,
          status: "open",
          currency: input.scope.currency,
          total: input.expectedTotal,
          expiresAt: new Date(env.clock() + 1_800_000).toISOString(),
          url: "https://checkout.stripe.com/c/pay/cs_test_front",
        }),
    ),
    status: vi.fn(async () => ({
      ...result,
      status: "complete" as const,
      url: null,
    })),
  };
  const navigate = vi.fn();
  const controller = await env.open({
    checkoutRequest: port,
    checkoutNavigate: navigate,
    currencyQuote: async () => ({
      schemaVersion: 1,
      snapshotId: "checkout_fx",
      base: "USD",
      quote: "EUR",
      rateDecimal: "0.89321",
      rateDate: "2026-10-11",
      fetchedAt: new Date(env.clock()).toISOString(),
      sourceId: "development-fixture",
    }),
  });
  await controller.photos.add([file("my-own-shirt")]);
  await controller.draftCatalogue();
  controller.publish();
  controller.useCurrentLook();
  controller.keepWordmark();
  controller.acceptDesign();
  const product = controller.getSnapshot().state.graph.products[0]!;
  controller.addToBag(product.id, product.variants[0]!.id, 2);
  return { env, port, navigate, controller, product };
}
describe("controller-owned hosted checkout recovery", () => {
  it("persists uploaded bytes and order identity, then places exactly one order on a verified return and reload", async () => {
    const x = await setup();
    await x.controller.startStripeCheckout();
    expect(x.port.start).toHaveBeenCalledTimes(1);
    const input = vi.mocked(x.port.start).mock.calls[0]![0];
    expect(input.photos).toHaveLength(1);
    expect(input.photos[0]!.image.id).toBe(x.product.imageIds[0]);
    expect(input.photos[0]!.base64).not.toBe("");
    expect(x.navigate).toHaveBeenCalledWith(
      "https://checkout.stripe.com/c/pay/cs_test_front",
    );
    const pending = x.controller.getSnapshot().state.stripeCheckout!;
    const before = x.controller.getSnapshot().state.graph;
    const stock = stockOf(before, x.product.variants[0]!.id);
    expect(x.controller.getSnapshot().checkoutBusy).toBe(true);
    x.controller.dispose();
    x.env.advance(180_000);
    const restored = await x.env.open({
      checkoutRequest: x.port,
      checkoutNavigate: x.navigate,
    });
    await restored.resumeStripeCheckout(pending.attemptId, false);
    expect(restored.getSnapshot().checkoutOutcome).toBe("complete");
    expect(restored.getSnapshot().bagOpen).toBe(true);
    const state = restored.getSnapshot().state;
    expect(state.graph.orders).toHaveLength(before.orders.length + 1);
    expect(state.graph.bag).toEqual([]);
    expect(state.shopping.lastOrderId).toBe(pending.orderId);
    expect(restored.getSnapshot().bagReceiptId).toBe(pending.orderId);
    expect(state.checkoutOrders).toEqual([
      { attemptId: pending.attemptId, orderId: pending.orderId },
    ]);
    expect(stockOf(state.graph, x.product.variants[0]!.id)).toBe(stock - 2);
    expect(
      displayedOrder(state.graph.orders.at(-1)!, pending.scope).total,
    ).toBe(pending.total);
    expect(state.orderDisplays.at(-1)).toEqual({
      orderId: pending.orderId,
      scope: pending.scope,
    });
    await restored.resumeStripeCheckout(pending.attemptId, false);
    expect(x.port.status).toHaveBeenCalledTimes(1);
    const completed = restored.getSnapshot().state.graph;
    restored.dispose();
    const twice = await x.env.open({ checkoutRequest: x.port });
    await twice.resumeStripeCheckout(pending.attemptId, false);
    expect(twice.getSnapshot().state.graph).toEqual(completed);
    expect(twice.getSnapshot().bagReceiptId).toBe(pending.orderId);
    expect(x.port.status).toHaveBeenCalledTimes(1);
    expect(restored.getSnapshot().state.stripeCheckout).toBeNull();
  });
  it("rejects foreign return IDs and changed cart contents without contacting Stripe", async () => {
    const x = await setup();
    await x.controller.startStripeCheckout();
    const pending = x.controller.getSnapshot().state.stripeCheckout!;
    x.controller.dispose();
    const restored = await x.env.open({ checkoutRequest: x.port });
    await restored.resumeStripeCheckout("foreign", false);
    expect(x.port.status).not.toHaveBeenCalled();
    restored.setBagQuantity(x.product.variants[0]!.id, 1);
    await restored.resumeStripeCheckout(pending.attemptId, false);
    expect(x.port.status).not.toHaveBeenCalled();
    expect(restored.getSnapshot().checkoutOutcome).toBeNull();
    expect(restored.getSnapshot().state.graph.orders).toHaveLength(0);
  });
  it.each(["USD", "EUR"] as const)(
    "preserves the exact %s promotion in the paid receipt and dashboard",
    async (currency) => {
      const x = await setup();
      if (currency === "EUR") {
        x.controller.go("dashboard");
        await x.controller.selectCurrency("EUR");
        x.controller.go("storefront");
        x.controller.openBag();
      }
      const discount = bagPromoDiscount(
        bagEntries(
          x.controller.getSnapshot().state.graph,
          x.controller.photos.availableIds(),
        ),
        "THREAD10",
      );
      x.controller.reviewBag(discount);
      await x.controller.checkout(discount);
      const pending = x.controller.getSnapshot().state.stripeCheckout!;
      expect(pending.scope.currency).toBe(currency);
      expect(pending.promoApplied).toBe(true);
      x.controller.dispose();
      const restored = await x.env.open({ checkoutRequest: x.port });
      await restored.resumeStripeCheckout(pending.attemptId, false);
      const order = restored.getSnapshot().state.graph.orders.at(-1)!;
      expect(order.discount).toBe(discount);
      expect(displayedOrder(order, pending.scope).total).toBe(pending.total);
      restored.showBagOrderInOwner();
      expect(restored.getSnapshot().state.ownerView).toBe("orders");
      expect(restored.getSnapshot().state.ownerSearch).toBe(order.id);
    },
  );
  it.each(["open", "cancelled", "expired"] as const)(
    "never places an order for %s status",
    async (status) => {
      const x = await setup();
      await x.controller.startStripeCheckout();
      const pending = x.controller.getSnapshot().state.stripeCheckout!;
      const before = x.controller.getSnapshot().state.graph;
      const complete = vi.mocked(x.port.status).getMockImplementation()!;
      vi.mocked(x.port.status).mockImplementation(async (...args) => ({
        ...(await complete(...args)),
        status,
      }));
      x.controller.dispose();
      const restored = await x.env.open({ checkoutRequest: x.port });
      await restored.resumeStripeCheckout(
        pending.attemptId,
        status === "cancelled",
      );
      expect(restored.getSnapshot().state.graph).toEqual(before);
      expect(restored.getSnapshot().checkoutOutcome).toBe(status);
      expect(restored.getSnapshot().checkoutBusy).toBe(false);
      expect(!!restored.getSnapshot().state.stripeCheckout).toBe(
        status === "open",
      );
    },
  );
  it("retries verification through the single Checkout action without invalidating the paid attempt", async () => {
    const x = await setup();
    x.controller.reviewBag();
    await x.controller.checkout();
    const pending = x.controller.getSnapshot().state.stripeCheckout!;
    vi.mocked(x.port.status).mockRejectedValueOnce(
      new Error("private provider detail"),
    );
    x.controller.dispose();
    const restored = await x.env.open({ checkoutRequest: x.port });
    const before = restored.getSnapshot().state.graph;
    await restored.resumeStripeCheckout(pending.attemptId, false);
    expect(restored.getSnapshot().state.graph).toEqual(before);
    expect(restored.getSnapshot().checkoutNotice).toBe(
      "Checkout couldn’t finish. Please try again.",
    );
    x.env.advance(180_000);
    restored.closeBag();
    restored.openBag();
    restored.reviewBag();
    expect(restored.getSnapshot().state.graph).toEqual(before);
    await restored.checkout();
    expect(x.port.start).toHaveBeenCalledTimes(1);
    expect(restored.getSnapshot().bagReceiptId).toBe(pending.orderId);
  });
  it.each(["amount", "currency", "attempt", "photo", "expired"])(
    "rejects a changed %s before any order effect",
    async (change) => {
      const x = await setup();
      await x.controller.startStripeCheckout();
      const pending = x.controller.getSnapshot().state.stripeCheckout!;
      x.controller.dispose();
      const restored = await x.env.open({ checkoutRequest: x.port });
      if (change === "photo")
        restored.photos.reportUnavailable(x.product.imageIds[0]!);
      if (change === "expired") x.env.advance(32 * 60_000);
      const before = restored.getSnapshot().state.graph;
      const complete = vi.mocked(x.port.status).getMockImplementation()!;
      vi.mocked(x.port.status).mockImplementation(async (...args) => ({
        ...(await complete(...args)),
        ...(change === "amount"
          ? { total: pending.total + 1 }
          : change === "currency"
            ? { currency: "EUR" as const }
            : change === "attempt"
              ? { attemptId: "foreign" }
              : {}),
      }));
      await restored.resumeStripeCheckout(pending.attemptId, false);
      expect(restored.getSnapshot().state.graph).toEqual(before);
      expect(restored.getSnapshot().bagReceiptId).toBeNull();
      expect(restored.getSnapshot().state.checkoutOrders).toEqual([]);
    },
  );
  it("places legacy pending checkouts without an order ID once, and restores their confirmation", async () => {
    const x = await setup();
    await x.controller.startStripeCheckout();
    x.controller.dispose();
    const saved = JSON.parse(x.env.storage.getItem(SESSION_KEY)!);
    const attempt = saved.stripeCheckout.attemptId;
    delete saved.stripeCheckout.orderId;
    delete saved.checkoutOrders;
    x.env.storage.setItem(SESSION_KEY, JSON.stringify(saved));
    const restored = await x.env.open({ checkoutRequest: x.port });
    await restored.resumeStripeCheckout(attempt, false);
    const orderId = restored.getSnapshot().bagReceiptId;
    expect(orderId).toBeTruthy();
    restored.dispose();
    const again = await x.env.open({ checkoutRequest: x.port });
    await again.resumeStripeCheckout(attempt, false);
    expect(again.getSnapshot().bagReceiptId).toBe(orderId);
    expect(again.getSnapshot().state.graph.orders).toHaveLength(1);
  });
  it("publishes none of a partially applied settlement if its final command is rejected", async () => {
    const x = await setup();
    x.controller.reviewBag();
    await x.controller.checkout();
    const pending = x.controller.getSnapshot().state.stripeCheckout!;
    x.controller.dispose();
    const before = x.controller.getSnapshot().state;
    let calls = 0,
      armed = false;
    const restored = await x.env.open({
      checkoutRequest: x.port,
      id: () =>
        armed && ++calls === 3 ? before.graph.receipts[0]!.id : x.env.id(),
    });
    armed = true;
    await restored.resumeStripeCheckout(pending.attemptId, false);
    expect(calls).toBe(3);
    expect(restored.getSnapshot().state.graph).toEqual(before.graph);
    expect(restored.getSnapshot().state.shopping).toEqual(before.shopping);
    expect(restored.getSnapshot().state.checkoutOrders).toEqual([]);
    expect(restored.getSnapshot().bagReceiptId).toBeNull();
  });
  it("uses local ordering only when explicitly unavailable, and never after a failed capability read", async () => {
    const x = await setup();
    x.controller.reviewBag();
    vi.mocked(x.port.available).mockRejectedValueOnce(
      new Error("private network error"),
    );
    await x.controller.checkout();
    expect(x.controller.getSnapshot().state.graph.orders).toHaveLength(0);
    expect(x.port.start).not.toHaveBeenCalled();
    vi.mocked(x.port.available).mockResolvedValue(false);
    await x.controller.checkout();
    expect(x.controller.getSnapshot().state.graph.orders).toHaveLength(1);
    expect(x.port.start).not.toHaveBeenCalled();
  });
  it("blocks duplicate clicks while preparing and cancels a late result after reset", async () => {
    const x = await setup();
    let finish!: (result: CheckoutResult) => void;
    vi.mocked(x.port.start).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const operation = x.controller.startStripeCheckout();
    await vi.waitFor(() => expect(x.port.start).toHaveBeenCalledTimes(1));
    const pending = x.controller.getSnapshot().state.stripeCheckout!;
    const total = checkoutQuote(
      x.controller.getSnapshot().state.graph,
      x.controller.photos.availableIds(),
      pending.scope,
      false,
    ).total;
    await x.controller.startStripeCheckout();
    expect(x.port.start).toHaveBeenCalledTimes(1);
    await x.controller.reset();
    finish({
      schemaVersion: 1,
      attemptId: pending.attemptId,
      status: "open",
      currency: "USD",
      total,
      expiresAt: pending.expiresAt,
      url: "https://checkout.stripe.com/c/pay/cs_test_late",
    });
    await operation;
    expect(x.navigate).not.toHaveBeenCalled();
    expect(x.port.status).toHaveBeenCalledWith(
      pending.attemptId,
      true,
      expect.any(AbortSignal),
    );
    expect(x.controller.getSnapshot().state.graph.products).toHaveLength(0);
  });
  it("does not navigate without a saved recoverable attempt", async () => {
    const x = await setup();
    vi.spyOn(x.env.storage, "setItem").mockImplementation(() => {
      throw new Error("storage denied");
    });
    await x.controller.startStripeCheckout();
    expect(x.port.start).not.toHaveBeenCalled();
    expect(x.navigate).not.toHaveBeenCalled();
    expect(x.controller.getSnapshot().state.graph.orders).toHaveLength(0);
    expect(x.controller.getSnapshot().checkoutBusy).toBe(false);
    expect(x.controller.getSnapshot().checkoutNotice).toContain(
      "Allow browser storage",
    );
  });
  it("ignores a late paid verification after reset", async () => {
    const x = await setup();
    await x.controller.startStripeCheckout();
    const pending = x.controller.getSnapshot().state.stripeCheckout!;
    x.controller.dispose();
    const restored = await x.env.open({ checkoutRequest: x.port });
    let finish!: (result: CheckoutResult) => void;
    vi.mocked(x.port.status).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const operation = restored.resumeStripeCheckout(pending.attemptId, false);
    await vi.waitFor(() => expect(x.port.status).toHaveBeenCalledTimes(1));
    await restored.reset();
    const resetGraph = restored.getSnapshot().state.graph;
    finish({
      schemaVersion: 1,
      attemptId: pending.attemptId,
      status: "complete",
      currency: pending.scope.currency,
      total: pending.total,
      expiresAt: pending.expiresAt,
      url: null,
    });
    await operation;
    expect(restored.getSnapshot().state.graph).toEqual(resetGraph);
    expect(restored.getSnapshot().state.checkoutOrders).toEqual([]);
    expect(restored.getSnapshot().checkoutBusy).toBe(false);
    expect(restored.getSnapshot().bagOpen).toBe(false);
  });
  it("keeps the review visible while preparing and cancels a late result when the bag closes", async () => {
    const x = await setup();
    x.controller.openBag();
    await vi.waitFor(() =>
      expect(x.controller.getSnapshot().checkoutAvailable).toBe(true),
    );
    x.controller.reviewBag();
    const review = x.controller.getSnapshot().checkoutReview;
    let finish!: (result: CheckoutResult) => void;
    vi.mocked(x.port.start).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const operation = x.controller.startStripeCheckout();
    await vi.waitFor(() => expect(x.port.start).toHaveBeenCalledTimes(1));
    expect(x.controller.getSnapshot().checkoutReview).toBe(review);
    x.controller.placeReviewed(review!);
    expect(x.controller.getSnapshot().state.graph.orders).toHaveLength(0);
    const pending = x.controller.getSnapshot().state.stripeCheckout!;
    x.controller.closeBag();
    finish({
      schemaVersion: 1,
      attemptId: pending.attemptId,
      status: "open",
      currency: "USD",
      total: pending.total,
      expiresAt: pending.expiresAt,
      url: "https://checkout.stripe.com/c/pay/cs_test_closed",
    });
    await operation;
    expect(x.navigate).not.toHaveBeenCalled();
    expect(x.port.status).toHaveBeenCalledWith(
      pending.attemptId,
      true,
      expect.any(AbortSignal),
    );
    expect(x.controller.getSnapshot().bagOpen).toBe(false);
  });
});
