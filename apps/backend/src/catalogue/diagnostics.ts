import type { CatalogueAction } from "@retailor/contracts/recognition";
import type { CatalogueDraft } from "@retailor/contracts/catalogue";
import type { ErrorCode } from "@retailor/contracts/api";
import {
  CATALOGUE_MODEL,
  CATALOGUE_PROMPT_VERSION,
  CATALOGUE_REASONING_EFFORT,
} from "./provider.js";
import { CatalogueObservationSchema, groupingIssue } from "./grouping.js";
import { attributeIssue } from "./attributes.js";

export const CATALOGUE_DIAGNOSTIC_BYTES = 16 * 1024;
export type CataloguePhase =
  "preparing_images" | "interpreting" | "reconciling" | "completed";
function duration(value: number) {
  return Number.isFinite(value)
    ? Math.round(Math.max(0, Math.min(value, Number.MAX_SAFE_INTEGER)))
    : 0;
}
/** Positions are 1-based within this request, never visitor/provider IDs or prose. */
export function catalogueDiagnostic(input: {
  requestId: unknown;
  action: CatalogueAction;
  observation: unknown;
  draft?: CatalogueDraft;
  phase: CataloguePhase;
  code: ErrorCode | null;
  elapsedMs: number;
  providerMs: number | null;
}) {
  const positions = new Map(
    input.action.photos.map((photo, index) => [photo.id, index + 1]),
  );
  const photos = (ids: readonly string[]) =>
    ids.flatMap((id) => {
      const position = positions.get(id);
      return position === undefined ? [] : [position];
    });
  const model = CatalogueObservationSchema.safeParse(input.observation);
  const event = {
    schemaVersion: 1 as const,
    event: "catalogue_decision" as const,
    operation: "catalogue/interpret" as const,
    source: "catalogue/routes.ts" as const,
    requestId:
      typeof input.requestId === "string" &&
      /^[A-Za-z0-9._-]{1,100}$/u.test(input.requestId)
        ? input.requestId
        : "request_unavailable",
    model: CATALOGUE_MODEL,
    promptVersion: CATALOGUE_PROMPT_VERSION,
    reasoningEffort: CATALOGUE_REASONING_EFFORT,
    groupingPolicy: "advisory" as const,
    photoCount: input.action.photos.length,
    garmentCount: model.success ? model.data.garments.length : null,
    acceptedGroupCount: input.draft?.items.length ?? 0,
    phase: input.phase,
    code: input.code,
    elapsedMs: duration(input.elapsedMs),
    providerMs: input.providerMs === null ? null : duration(input.providerMs),
    observation: model.success
      ? ("parsed" as const)
      : input.observation === undefined
        ? ("unavailable" as const)
        : ("invalid" as const),
    groupingIssue: model.success
      ? groupingIssue(model.data, input.action)
      : null,
    comparisons: model.success ? (model.data.comparisons ?? []) : [],
    attributeIssues: model.success
      ? model.data.garments.flatMap((garment, garmentIndex) =>
          garment.attributes.flatMap((attr, attributeIndex) => {
            const code = attributeIssue(attr, garment.sourceIds);
            return code
              ? [
                  {
                    garment: garmentIndex + 1,
                    attribute: attributeIndex + 1,
                    name: attr.name,
                    evidence: attr.evidence,
                    code,
                  },
                ]
              : [];
          }),
        )
      : [],
    decisions: model.success
      ? model.data.garments.map((garment, index) => ({
          garment: index + 1,
          classification: garment.classification,
          category: garment.category,
          grouping: garment.grouping,
          photoPositions: photos(garment.sourceIds),
          unknownPhotoReferences: garment.sourceIds.filter(
            (id) => !positions.has(id),
          ).length,
          colourwayPhotoPositions: (garment.colourways ?? []).map((row) =>
            photos(row.sourceIds),
          ),
          reviewReasonPresent: !!garment.reviewReason.trim(),
        }))
      : [],
    dispositions: model.success
      ? model.data.dispositions.map((row) => ({
          photoPosition: positions.get(row.sourceId) ?? null,
          kind: row.kind,
          garments: row.garmentIndexes.map((index) => index + 1),
        }))
      : [],
    acceptedGroups: (input.draft?.items ?? []).map((item, index) => ({
      garment: index + 1,
      included: item.included,
      photoPositions: photos(item.product.imageIds),
    })),
    detailsOmitted: false,
  };
  if (Buffer.byteLength(JSON.stringify(event)) > CATALOGUE_DIAGNOSTIC_BYTES) {
    event.decisions = [];
    event.dispositions = [];
    event.acceptedGroups = [];
    event.comparisons = [];
    event.attributeIssues = [];
    event.detailsOmitted = true;
  }
  return event;
}
export type CatalogueDiagnostic = ReturnType<typeof catalogueDiagnostic>;
