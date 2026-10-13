import { DemoExportSchema, EXPORT_LIMITS } from "@retailor/contracts/export";
import { facts } from "@retailor/commerce/facts";
import { parseGraph } from "@retailor/commerce/graph";
import { validateSnapshot } from "@retailor/commerce/currency";
import { dashboardScope } from "../dashboard/model";
import type { Projection } from "./projection";
import { ProjectionSchema } from "./projection";

/** Explicit report allow-list; never serializes controllers or the runtime snapshot. */
export function buildExport(
  input: Projection,
  now: number,
  fixtureAllowed: boolean,
) {
  const state = ProjectionSchema.parse(input),
    graph = parseGraph(state.graph);
  if (
    now < Date.parse(graph.createdAt) ||
    now >= Date.parse(graph.expiresAt) ||
    (state.fixture && !fixtureAllowed) ||
    !graph.products.length
  )
    throw new Error("This collection is not available for export.");
  if (state.currency.acceptedSnapshot)
    validateSnapshot(state.currency.acceptedSnapshot, now, fixtureAllowed);
  const scope = dashboardScope(graph, state.dashboard.period);
  const report = DemoExportSchema.parse({
    schemaVersion: 1,
    kind: "retailor-demo-report",
    exportedAt: new Date(now).toISOString(),
    notice:
      "Synthetic clothing demo. No real payment, shipping or accounting authority. Images, chat and pending actions are excluded; this report cannot restore a workspace.",
    mode: state.fixture ? "development-fixture" : "live",
    moneyAuthority: "USD integer cents",
    records: {
      schemaVersion: graph.schemaVersion,
      workspaceId: graph.workspaceId,
      scenarioId: graph.scenarioId,
      revision: graph.revision,
      createdAt: graph.createdAt,
      anchorAt: graph.anchorAt,
      expiresAt: graph.expiresAt,
      asOf: graph.asOf,
      photos: graph.photos,
      products: graph.products,
      orders: graph.orders,
      cancellations: graph.cancellations,
      returns: graph.returns,
      refunds: graph.refunds,
      movements: graph.movements,
      expenses: graph.expenses,
      writeoffs: graph.writeoffs,
      buyers: graph.buyers,
      traffic: graph.traffic,
      feedback: graph.feedback,
    },
    scenario: state.scenario,
    catalogueReview: state.draft,
    catalogueReviewIsHistorical: true,
    acceptedDesign: state.hasAcceptedLook ? state.acceptedDesign : null,
    selectedLogo: state.hasAcceptedLook
      ? (state.logos.candidates.find(
          (logo) => logo.id === state.acceptedDesign.logoId,
        ) ?? null)
      : null,
    heroPhoto: state.hasAcceptedLook
      ? (state.photos.find(
          (photo) => photo.id === state.acceptedDesign.heroPhotoId,
        ) ?? null)
      : null,
    currency: state.currency,
    orderDisplays: state.orderDisplays,
    report: {
      period: state.dashboard.period,
      scope,
      facts: facts(graph, scope),
    },
  });
  const json = JSON.stringify(report, null, 2),
    bytes = new TextEncoder().encode(json).byteLength;
  if (bytes > EXPORT_LIMITS.bytes)
    throw new Error("This report exceeds its 2-MiB download envelope.");
  return {
    json,
    bytes,
    filename: `retailor-demo-v1-${report.exportedAt.slice(0, 10)}.json`,
  };
}
