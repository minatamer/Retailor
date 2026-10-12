import { describe, expect, it } from "vitest";
import { emptyGraph } from "@retailor/commerce/graph";
import { allActivityScope } from "@retailor/commerce/facts";
import type { AssistantPayload } from "@retailor/contracts/assistant";
import { prepareAssistantContext, modelProjection } from "./context.js";
const now = "2026-10-12T12:00:00.000Z";
function payload(): AssistantPayload {
  const graph = emptyGraph({
    workspaceId: "workspace",
    scenarioId: "story",
    createdAt: now,
  });
  return {
    schemaVersion: 1,
    mode: "fake",
    operationId: "turn",
    prompt: "Summarize this demo",
    history: [],
    context: {
      role: "owner",
      graph,
      scope: allActivityScope(graph),
      currency: { currency: "USD", snapshot: null },
      design: {
        template: "studio",
        theme: "ink",
        typography: "editorial",
        name: "Demo",
        headline: "Clothes with a point of view.",
        heroPhotoId: null,
        revision: 0,
      },
      availablePhotoIds: [],
      query: "",
      categories: [],
      minimum: null,
      maximum: null,
      selectedProductId: null,
      selectedFactId: null,
      selectedDay: null,
      designConfirmed: true,
    },
  };
}
describe("validated minimum assistant evidence", () => {
  it("recomputes current facts and projects only role-appropriate minimum data", () => {
    const prepared = prepareAssistantContext(payload(), now),
      projected = modelProjection(prepared);
    expect(prepared.registry.find((f) => f.factId === "net_sales")!.value).toBe(
      0,
    );
    expect(projected.facts.map((f) => f.factId)).toEqual([
      "net_sales",
      "included_orders",
      "aov",
      "operating_result",
    ]);
    expect(projected).not.toHaveProperty("graph");
    expect(projected).not.toHaveProperty("photos");
    const shopper = payload();
    shopper.context.role = "shopper";
    expect(
      modelProjection(prepareAssistantContext(shopper, now)).facts,
    ).toEqual([]);
  });
  it("rejects stale identity times, unknown photo witnesses and nonregistered reporting ranges", () => {
    expect(() =>
      prepareAssistantContext(payload(), "2026-10-12T14:00:00.000Z"),
    ).toThrow();
    const absent = payload();
    absent.context.availablePhotoIds = ["unknown"];
    expect(() => prepareAssistantContext(absent, now)).toThrow();
    const range = payload();
    range.context.scope.to = "2026-10-13T00:00:00.000Z";
    expect(() => prepareAssistantContext(range, now)).toThrow();
  });
  it("keeps owner amounts in USD even when a valid storefront EUR quote exists", () => {
    const input = payload();
    input.context.currency = {
      currency: "EUR",
      snapshot: {
        schemaVersion: 1,
        snapshotId: "quote",
        base: "USD",
        quote: "EUR",
        rateDecimal: "0.9",
        rateDate: "2026-10-12",
        fetchedAt: now,
        sourceId: "development-fixture",
      },
    };
    expect(() => prepareAssistantContext(input, now)).toThrow("INVALID_INPUT");
    input.context.role = "shopper";
    expect(
      prepareAssistantContext(input, now).payload.context.currency.currency,
    ).toBe("EUR");
  });
});
