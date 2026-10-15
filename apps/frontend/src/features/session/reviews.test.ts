import { afterEach, describe, expect, it } from "vitest";
import { generateScenario } from "@retailor/commerce/scenarios";
import { environment, file } from "../../../test/workspace";
import type { CheckoutResult } from "@retailor/contracts/checkout";
import { checkoutCurrent } from "../checkout/state";
import {
  restoreProjection,
  serializeProjection,
  SESSION_KEY,
} from "./projection";
const environments: ReturnType<typeof environment>[] = [];
afterEach(() => environments.splice(0).forEach((env) => env.dispose()));
describe("older seeded demo review recovery", () => {
  it("preserves pending checkout and Undo while safely restoring fictional names", async () => {
    const env = environment();
    environments.push(env);
    let result!: CheckoutResult;
    const controller = await env.open({
      scenarioFactory: generateScenario,
      checkoutNavigate: () => undefined,
      checkoutRequest: {
        available: async () => true,
        start: async (input) =>
          (result = {
            schemaVersion: 1,
            attemptId: input.attemptId,
            status: "open",
            currency: input.scope.currency,
            total: input.expectedTotal,
            expiresAt: new Date(env.clock() + 1_800_000).toISOString(),
            url: "https://checkout.stripe.com/c/pay/cs_test_reviews",
          }),
        status: async () => ({ ...result, status: "complete", url: null }),
      },
    });
    await controller.photos.add([file("own garment")]);
    await controller.draftCatalogue();
    controller.publish();
    controller.finishTour();
    controller.useCurrentLook();
    controller.keepWordmark();
    controller.acceptDesign();
    controller.finishTour();
    const product = controller.getSnapshot().state.graph.products[0]!;
    controller.addToBag(product.id, product.variants[0]!.id, 1);
    await controller.startStripeCheckout();
    const state = controller.getSnapshot().state;
    expect(state.stripeCheckout).not.toBeNull();
    const legacy = {
      ...state,
      graph: {
        ...state.graph,
        feedback: state.graph.feedback
          .slice(0, 1)
          .map(({ reviewerName: _name, ...review }) => review),
      },
    };
    const recovered = restoreProjection(legacy, env.clock(), true);
    expect(recovered.graph).toEqual(legacy.graph);
    expect(recovered.stripeCheckout).toEqual(state.stripeCheckout);
    expect(
      checkoutCurrent(
        recovered.stripeCheckout!,
        recovered,
        new Set(controller.photos.availableIds()),
        env.clock(),
      ),
    ).toBe(true);
    const after = restoreProjection(
      { ...legacy, stripeCheckout: null },
      env.clock(),
      true,
    );
    expect(after.graph.feedback).toHaveLength(1);
    expect(after.graph.feedback[0]!.reviewerName).toBeTruthy();
    expect(after.graph.receipts.at(-1)?.undo).toEqual(
      legacy.graph.receipts.at(-1)?.undo,
    );
    expect(after.graph.orders).toEqual(state.graph.orders);
  });
  it("repairs existing uploaded catalogues without resetting saved work and remains idempotent", async () => {
    const env = environment();
    environments.push(env);
    const controller = await env.open({ scenarioFactory: generateScenario });
    await controller.photos.add([file("own shirt"), file("own jeans")]);
    await controller.draftCatalogue();
    controller.publish();
    controller.finishTour();
    const state = controller.getSnapshot().state;
    const legacy = {
      ...state,
      graph: {
        ...state.graph,
        feedback: state.graph.feedback
          .slice(0, 1)
          .map(({ reviewerName: _name, ...review }) => review),
      },
    };
    env.storage.setItem(SESSION_KEY, serializeProjection(legacy, env.clock()));
    controller.dispose();
    const restored = await env.open();
    const next = restored.getSnapshot().state;
    expect(next.graph.feedback.length).toBeGreaterThan(1);
    expect(next.graph.feedback.every((review) => review.reviewerName)).toBe(
      true,
    );
    expect(next.acceptedDesign).toEqual(state.acceptedDesign);
    expect(next.previewDesign).toEqual(state.previewDesign);
    expect(next.graph.orders).toEqual(state.graph.orders);
    expect(next.graph.products).toEqual(state.graph.products);
    expect(next.graph.expiresAt).toBe(state.graph.expiresAt);
    expect(next.selectedIds).toEqual(state.selectedIds);
    const revision = next.graph.revision;
    restored.dispose();
    const twice = await env.open();
    expect(twice.getSnapshot().state.graph.revision).toBe(revision);
    expect(twice.getSnapshot().state.graph.feedback).toEqual(
      next.graph.feedback,
    );
    const unseeded = restoreProjection(
      { ...legacy, scenario: null },
      env.clock(),
      true,
    );
    expect(unseeded.graph.feedback).toEqual(legacy.graph.feedback);
  });
});
