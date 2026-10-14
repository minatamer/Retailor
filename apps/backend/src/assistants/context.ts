import {
  AssistantPayloadSchema,
  assistantFence,
} from "@retailor/contracts/assistant";
import type { AssistantPayload } from "@retailor/contracts/assistant";
import { parseGraph, freeze } from "@retailor/commerce/graph";
import { facts } from "@retailor/commerce/facts";
import { validateSnapshot } from "@retailor/commerce/currency";
import { stockOf } from "@retailor/commerce/selectors";
import { deny } from "../security/errors.js";

/** Recompute canonical records before projection; the text model never receives the graph/photo bytes. */
export function prepareAssistantContext(input: unknown, now: string) {
  let payload: AssistantPayload;
  try {
    payload = AssistantPayloadSchema.parse(input);
  } catch {
    return deny("INVALID_INPUT", 400);
  }
  let graph;
  try {
    graph = parseGraph(payload.context.graph);
  } catch {
    return deny("INVALID_INPUT", 400);
  }
  if (graph.createdAt > now || graph.asOf > now || graph.expiresAt <= now)
    return deny("STALE", 409);
  const c = payload.context;
  if (c.role === "owner" && c.currency.currency !== "USD")
    return deny("INVALID_INPUT", 400);
  const to = new Date(Date.parse(graph.asOf) + 1).toISOString();
  const knownStarts = [
    graph.anchorAt,
    new Date(Date.parse(to) - 7 * 86_400_000).toISOString(),
    new Date(Date.parse(to) - 28 * 86_400_000).toISOString(),
  ];
  if (
    c.scope.asOf !== graph.asOf ||
    c.scope.to !== to ||
    !knownStarts.includes(c.scope.from)
  )
    return deny("INVALID_INPUT", 400);
  if (
    new Set(c.availablePhotoIds).size !== c.availablePhotoIds.length ||
    c.availablePhotoIds.some((id) => !graph.photos.some((p) => p.id === id))
  )
    return deny("INVALID_INPUT", 400);
  if (
    c.selectedProductId &&
    !graph.products.some((p) => p.id === c.selectedProductId)
  )
    return deny("STALE", 409);
  if (c.currency.currency === "EUR") {
    try {
      validateSnapshot(
        c.currency.snapshot,
        Date.parse(now),
        payload.mode === "fake",
      );
    } catch {
      return deny("STALE", 409);
    }
    if (
      payload.mode === "live" &&
      c.currency.snapshot.sourceId === "development-fixture"
    )
      return deny("INVALID_INPUT", 400);
  }
  const registry = facts(graph, c.scope);
  let focusScope = c.scope;
  if (c.selectedDay) {
    const start = `${c.selectedDay}T00:00:00.000Z`,
      end = new Date(Date.parse(start) + 86_400_000).toISOString();
    const from = start > c.scope.from ? start : c.scope.from,
      to = end < c.scope.to ? end : c.scope.to;
    if (from >= to) return deny("STALE", 409);
    focusScope = { ...c.scope, from, to };
  }
  const focusedRegistry = c.selectedDay ? facts(graph, focusScope) : registry;
  const fence = assistantFence({ ...c, graph });
  return freeze({
    payload: { ...payload, context: { ...c, graph } },
    graph,
    registry,
    focusedRegistry,
    focusScope,
    fence,
  });
}
export type PreparedAssistantContext = ReturnType<
  typeof prepareAssistantContext
>;
/** Bounded minimum evidence for the first request; subsequent reads use finite tools. */
export function modelProjection(prepared: PreparedAssistantContext) {
  const { payload, graph, focusedRegistry } = prepared,
    c = payload.context;
  const products = graph.products
    .filter(
      (p) =>
        !p.archived &&
        (c.role !== "owner" ||
          p.id === c.selectedProductId ||
          payload.prompt.toLowerCase().includes(p.category) ||
          payload.prompt.toLowerCase().includes(p.title.toLowerCase())),
    )
    .sort(
      (a, b) =>
        Number(
          b.id === c.selectedProductId ||
            payload.prompt.toLowerCase().includes(b.category),
        ) -
        Number(
          a.id === c.selectedProductId ||
            payload.prompt.toLowerCase().includes(a.category),
        ),
    )
    .slice(0, 3)
    .map((p) => ({
      id: p.id,
      title: p.title,
      category: p.category,
      attributes: p.attributes.map((a) => ({
        name: a.name,
        value: a.review === "confirmed" ? a.value : null,
        provenance: a.provenance,
        review: a.review,
      })),
      variants: p.variants
        .filter((v) => !v.archived)
        .slice(0, 2)
        .map((v) => ({
          id: v.id,
          size: v.size,
          colour: v.colour,
          priceUsdCents: v.price,
          availableUnits: stockOf(graph, v.id),
          ...(c.role === "owner" ? { demoUnitCostCents: v.unitCost } : {}),
        })),
      photosAvailable: p.imageIds.every((id) =>
        c.availablePhotoIds.includes(id),
      ),
    }));
  return {
    role: c.role,
    currency: c.currency,
    scope: c.scope,
    design: c.role !== "shopper" ? c.design : null,
    products,
    selection: {
      day: c.selectedDay,
      factId: c.selectedFactId,
      productId: c.selectedProductId,
    },
    facts:
      c.role === "owner"
        ? focusedRegistry
            .filter((f) =>
              [
                "net_sales",
                "included_orders",
                "aov",
                "operating_result",
              ].includes(f.factId),
            )
            .map((f) => ({
              factId: f.factId,
              value: f.value,
              availability: f.availability,
              dateBasis: f.dateBasis,
            }))
        : [],
    context:
      "Temporary clothing demo. Prices, sizing, costs and business history are demo inputs. Unknown/unconfirmed attributes must remain unknown. No real payment/shipping or monetary calculation by the model.",
  };
}
