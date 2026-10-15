import { assistantFixture } from "./assistant-fixture.js";
import { applyCommand } from "@retailor/commerce/commands";
import { checkoutQuote } from "@retailor/commerce/checkout";
import { CheckoutStartSchema } from "@retailor/contracts/checkout";
export const CHECKOUT_NOW = Date.parse("2026-10-15T12:00:00.000Z");
export function checkoutFixture() {
  const graph = assistantFixture(
    "shopper",
    new Date(CHECKOUT_NOW).toISOString(),
  ).context.graph;
  const applied = applyCommand(
    graph,
    {
      id: "bag_command",
      type: "setBagLine",
      workspaceId: graph.workspaceId,
      scenarioId: graph.scenarioId,
      expectedRevision: graph.revision,
      at: new Date(CHECKOUT_NOW).toISOString(),
      expiresAt: new Date(CHECKOUT_NOW + 60_000).toISOString(),
      origin: "guest_action",
      payload: { variantId: "jeans_m", quantity: 2 },
    },
    {
      now: new Date(CHECKOUT_NOW).toISOString(),
      availablePhotoIds: new Set(["photo"]),
    },
  );
  if (!applied.ok) throw new Error(applied.message);
  const scope = { currency: "USD", snapshot: null } as const;
  return CheckoutStartSchema.parse({
    schemaVersion: 1,
    attemptId: "checkout_test",
    graph: applied.graph,
    availablePhotoIds: ["photo"],
    scope,
    promoApplied: true,
    expectedTotal: checkoutQuote(applied.graph, new Set(["photo"]), scope, true)
      .total,
    brand: { name: "Moonthread", theme: "navy" },
    photos: [
      {
        image: graph.photos[0]!.derivative,
        base64: Buffer.alloc(100).toString("base64"),
      },
    ],
  });
}
