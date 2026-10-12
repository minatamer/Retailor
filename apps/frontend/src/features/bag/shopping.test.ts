import { afterEach, describe, expect, it } from "vitest";
import { environment, file } from "../../../test/workspace";
import { stockOf } from "@retailor/commerce/selectors";
import { facts, allActivityScope } from "@retailor/commerce/facts";
import { ProductInputSchema } from "@retailor/contracts/product";
import type { CommerceCommand } from "@retailor/contracts/commands";
import {
  bagEntries,
  displayedBag,
  displayedOrder,
  tryDisplayedBag,
} from "./quote";
const environments: ReturnType<typeof environment>[] = [];
afterEach(() => environments.splice(0).forEach((env) => env.dispose()));
async function setup(count = 2) {
  const env = environment();
  environments.push(env);
  const controller = await env.open({
    currencyQuote: async () => ({
      schemaVersion: 1,
      snapshotId: "quote",
      base: "USD",
      quote: "EUR",
      rateDecimal: "0.89321",
      rateDate: "2026-10-11",
      fetchedAt: new Date(env.clock()).toISOString(),
      sourceId: "development-fixture",
    }),
  });
  await controller.photos.add(
    Array.from({ length: count }, (_, index) => file(`garment-${index}`)),
  );
  await controller.draftCatalogue();
  controller.publish();
  controller.useCurrentLook();
  controller.keepWordmark();
  controller.acceptDesign();
  return {
    env,
    controller,
    product: controller.getSnapshot().state.graph.products[0]!,
  };
}
function ownerCommand(
  env: ReturnType<typeof environment>,
  controller: Awaited<ReturnType<typeof setup>>["controller"],
  operation:
    | Pick<
        Extract<CommerceCommand, { type: "updateProduct" }>,
        "type" | "payload"
      >
    | Pick<
        Extract<CommerceCommand, { type: "removeProduct" }>,
        "type" | "payload"
      >,
) {
  const graph = controller.getSnapshot().state.graph;
  return {
    ...operation,
    id: env.id(),
    workspaceId: graph.workspaceId,
    scenarioId: graph.scenarioId,
    expectedRevision: graph.revision,
    origin: "guest_action" as const,
    at: new Date(env.clock()).toISOString(),
    expiresAt: new Date(env.clock() + 60_000).toISOString(),
  };
}
describe("owned shopping, exact review and once-only placement", () => {
  it("keeps an over-limit bag recoverable after an actual owner price change", async () => {
    const { env, controller, product } = await setup();
    const variant = product.variants[0]!;
    controller.addToBag(product.id, variant.id, 2);
    controller.go("dashboard");
    const input = ProductInputSchema.parse({
      ...product,
      variants: product.variants.map(({ openedAt: _openedAt, ...v }) => ({
        ...v,
        price: 600_000_000,
      })),
    });
    expect(
      controller.applyCommerce(
        ownerCommand(env, controller, {
          type: "updateProduct",
          payload: input,
        }),
      ).ok,
    ).toBe(true);
    controller.go("storefront");
    const rows = bagEntries(
      controller.getSnapshot().state.graph,
      controller.photos.availableIds(),
    );
    expect(() =>
      displayedBag(rows, { currency: "USD", snapshot: null }),
    ).toThrow("The demo amount needs review");
    expect(
      tryDisplayedBag(rows, { currency: "USD", snapshot: null }),
    ).toMatchObject({ ok: false });
    controller.reviewBag();
    expect(controller.getSnapshot().checkoutReview).toBeNull();
    expect(controller.getSnapshot().state.graph.bag[0]!.quantity).toBe(2);
    controller.setBagQuantity(variant.id, 1);
    expect(
      tryDisplayedBag(
        bagEntries(
          controller.getSnapshot().state.graph,
          controller.photos.availableIds(),
        ),
        { currency: "USD", snapshot: null },
      ).ok,
    ).toBe(true);
  });
  it("merges quantities within bounds without reserving stock; removes a failed-photo line", async () => {
    const { controller, product } = await setup();
    const variant = product.variants[0]!;
    const initial = stockOf(controller.getSnapshot().state.graph, variant.id);
    controller.addToBag(product.id, variant.id, 2);
    controller.addToBag(product.id, variant.id, 3);
    expect(controller.getSnapshot().state.graph.bag[0]!.quantity).toBe(5);
    controller.addToBag(product.id, variant.id, 1);
    expect(controller.getSnapshot().state.graph.bag[0]!.quantity).toBe(5);
    expect(stockOf(controller.getSnapshot().state.graph, variant.id)).toBe(
      initial,
    );
    controller.photos.reportUnavailable(product.imageIds[0]!);
    controller.reviewBag();
    expect(controller.getSnapshot().checkoutReview).toBeNull();
    expect(
      bagEntries(
        controller.getSnapshot().state.graph,
        controller.photos.availableIds(),
      )[0]!.unavailable,
    ).toContain("photograph");
    controller.setBagQuantity(variant.id, 0);
    expect(controller.getSnapshot().state.graph.bag).toEqual([]);
  });
  it("applies two actual lines and an odd-cent discount atomically; duplicate clicks and refresh do not deduct twice", async () => {
    const { env, controller, product } = await setup();
    const second = controller.getSnapshot().state.graph.products[1]!,
      variant = product.variants[0]!;
    const before = stockOf(controller.getSnapshot().state.graph, variant.id);
    controller.addToBag(product.id, variant.id, 2);
    controller.addToBag(second.id, second.variants[0]!.id, 1);
    await controller.selectCurrency("EUR");
    controller.reviewBag(501);
    const review = controller.getSnapshot().checkoutReview!;
    expect(review).not.toBeNull();
    const shown = displayedBag(
      bagEntries(
        controller.getSnapshot().state.graph,
        controller.photos.availableIds(),
      ),
      review.scope,
      501,
    );
    const id = controller.placeReviewed(review)!;
    expect(controller.placeReviewed(review)).toBe(id);
    const state = controller.getSnapshot().state,
      order = state.graph.orders[0]!;
    expect(state.graph.orders).toHaveLength(1);
    expect(state.graph.movements.filter((m) => m.kind === "sale")).toHaveLength(
      2,
    );
    expect(stockOf(state.graph, variant.id)).toBe(before - 2);
    expect(state.graph.bag).toEqual([]);
    expect(order.discount).toBe(501);
    expect(order.total).toBe(order.merchandise + 600);
    expect(
      order.lines
        .flatMap((line) => line.unitNet)
        .reduce((sum, n) => sum + n, 0),
    ).toBe(order.merchandise);
    expect(displayedOrder(order, state.orderDisplays[0]!.scope)).toEqual(shown);
    expect(
      shown.rows.reduce(
        (sum, row) => sum + row.amount,
        shown.roundingAdjustment,
      ),
    ).toBe(shown.total);
    const restored = await env.open();
    expect(restored.getSnapshot().state.shopping.lastOrderId).toBe(id);
    expect(restored.getSnapshot().state.graph).toEqual(state.graph);
    expect(restored.getSnapshot().checkoutReview).toBeNull();
    await controller.selectCurrency("USD");
    expect(
      controller.getSnapshot().state.orderDisplays[0]!.scope.currency,
    ).toBe("EUR");
  });
  it("rejects price, currency, photograph and time changes while preserving selections for a new review", async () => {
    const { env, controller, product } = await setup();
    const variant = product.variants[0]!;
    controller.addToBag(product.id, variant.id, 2);
    controller.reviewBag();
    const old = controller.getSnapshot().checkoutReview!;
    controller.go("dashboard");
    const updated = {
      ...product,
      variants: product.variants.map((v) => ({ ...v, price: v.price + 100 })),
    };
    expect(
      controller.applyCommerce(
        ownerCommand(env, controller, {
          type: "updateProduct",
          payload: ProductInputSchema.parse({
            ...updated,
            variants: updated.variants.map(
              ({ openedAt: _openedAt, ...v }) => v,
            ),
          }),
        }),
      ).ok,
    ).toBe(true);
    controller.go("storefront");
    expect(controller.placeReviewed(old)).toBeUndefined();
    expect(controller.getSnapshot().state.graph.orders).toHaveLength(0);
    expect(controller.getSnapshot().state.graph.bag[0]!.quantity).toBe(2);
    expect(
      bagEntries(
        controller.getSnapshot().state.graph,
        controller.photos.availableIds(),
      )[0]!.unitPrice,
    ).toBe(variant.price + 100);
    controller.reviewBag();
    const usd = controller.getSnapshot().checkoutReview!;
    await controller.selectCurrency("EUR");
    expect(controller.placeReviewed(usd)).toBeUndefined();
    controller.reviewBag();
    const euro = controller.getSnapshot().checkoutReview!;
    controller.photos.reportUnavailable(product.imageIds[0]!);
    expect(controller.placeReviewed(euro)).toBeUndefined();
    expect(controller.getSnapshot().state.graph.orders).toHaveLength(0);
    await controller.repair(product.imageIds[0]!, file("garment-0"));
    controller.reviewBag();
    const expired = controller.getSnapshot().checkoutReview!;
    env.advance(120_001);
    expect(controller.placeReviewed(expired)).toBeUndefined();
    controller.reviewBag();
    expect(
      controller.placeReviewed(controller.getSnapshot().checkoutReview!),
    ).toBeDefined();
  });
  it("excludes previews/owner and counts repeat shopping orders in one nested eligible visit", async () => {
    const { env, controller, product } = await setup();
    const variant = product.variants[0]!;
    controller.go("style");
    controller.browse({ page: "collection" });
    controller.openBag();
    controller.go("dashboard");
    controller.openBag();
    expect(controller.getSnapshot().state.graph.traffic).toHaveLength(0);
    controller.go("storefront");
    controller.browse({ page: "product", productId: product.id });
    for (let n = 0; n < 2; n++) {
      controller.addToBag(product.id, variant.id, 1);
      controller.openBag();
      controller.openBag();
      controller.reviewBag();
      controller.placeReviewed(controller.getSnapshot().checkoutReview!);
    }
    const graph = controller.getSnapshot().state.graph,
      visit = graph.traffic[0]!;
    expect(graph.traffic).toHaveLength(1);
    expect(visit.orderIds).toHaveLength(2);
    expect(visit.engagedAt && visit.bagAt && visit.checkoutAt).toBeTruthy();
    expect(visit.productIds).toEqual([product.id]);
    const metrics = facts(graph, allActivityScope(graph));
    expect(metrics.find((m) => m.factId === "conversion_rate")?.value).toBe(
      10000,
    );
    const revisions = graph.revision;
    controller.openBag();
    controller.openBag();
    expect(controller.getSnapshot().state.graph.revision).toBe(revisions);
    env.advance(30 * 60_000);
    controller.browse({ page: "collection" });
    expect(controller.getSnapshot().state.graph.traffic).toHaveLength(2);
  });
  it("rejects the entire order after oversell and preserves every bag line for correction", async () => {
    const { env, controller, product } = await setup();
    const variant = product.variants[0]!;
    const second = controller.getSnapshot().state.graph.products[1]!;
    controller.addToBag(product.id, variant.id, 2);
    controller.addToBag(second.id, second.variants[0]!.id, 1);
    controller.reviewBag();
    const review = controller.getSnapshot().checkoutReview!;
    const graph = controller.getSnapshot().state.graph;
    expect(
      controller.applyCommerce({
        id: env.id(),
        workspaceId: graph.workspaceId,
        scenarioId: graph.scenarioId,
        expectedRevision: graph.revision,
        origin: "guest_action",
        at: new Date(env.clock()).toISOString(),
        expiresAt: new Date(env.clock() + 60_000).toISOString(),
        type: "adjustStock",
        payload: {
          variantId: variant.id,
          units: -9,
          kind: "correction",
          reason: "Local oversell test",
        },
      }).ok,
    ).toBe(true);
    expect(controller.placeReviewed(review)).toBeUndefined();
    controller.reviewBag();
    expect(controller.getSnapshot().checkoutReview).toBeNull();
    expect(controller.getSnapshot().state.graph.orders).toHaveLength(0);
    expect(controller.getSnapshot().state.graph.bag).toHaveLength(2);
    controller.setBagQuantity(variant.id, 1);
    controller.reviewBag();
    expect(
      controller.placeReviewed(controller.getSnapshot().checkoutReview!),
    ).toBeDefined();
  });
  it("uses exact activity for the thirty-minute gap and clears old effects after a rebuild", async () => {
    const { env, controller, product } = await setup();
    const variant = product.variants[0]!;
    controller.addToBag(product.id, variant.id, 1);
    controller.reviewBag();
    const review = controller.getSnapshot().checkoutReview!;
    env.advance(29 * 60_000 + 59_000);
    controller.openBag();
    env.advance(1000);
    controller.openBag();
    expect(controller.getSnapshot().state.graph.traffic).toHaveLength(1);
    controller.go("catalogue");
    controller.publish(true);
    controller.useCurrentLook();
    controller.keepWordmark();
    controller.acceptDesign();
    expect(controller.getSnapshot().state.shopping.visitId).toBeNull();
    expect(controller.getSnapshot().bagOpen).toBe(false);
    expect(controller.placeReviewed(review)).toBeUndefined();
    expect(controller.getSnapshot().state.graph.orders).toHaveLength(0);
  });
  it("caps distinct options at eight and never substitutes an archived garment", async () => {
    const { env, controller, product } = await setup(9);
    const products = controller.getSnapshot().state.graph.products;
    for (const p of products) controller.addToBag(p.id, p.variants[0]!.id, 1);
    expect(controller.getSnapshot().state.graph.bag).toHaveLength(8);
    controller.go("dashboard");
    expect(
      controller.applyCommerce(
        ownerCommand(env, controller, {
          type: "removeProduct",
          payload: { productId: product.id },
        }),
      ).ok,
    ).toBe(true);
    controller.go("storefront");
    controller.reviewBag();
    expect(controller.getSnapshot().state.graph.bag).toHaveLength(7);
    expect(
      bagEntries(
        controller.getSnapshot().state.graph,
        controller.photos.availableIds(),
      ).some((row) => row.productId === product.id),
    ).toBe(false);
    expect(controller.getSnapshot().state.graph.orders).toHaveLength(0);
  });
});
