import { describe, expect, it, vi } from "vitest";
import { action, observation } from "../../../../test/fixtures/recognition.js";
import {
  catalogueDiagnostic,
  CATALOGUE_DIAGNOSTIC_BYTES,
} from "./diagnostics.js";
import { reconcileCatalogue } from "./reconcile.js";
import { reportDiagnostic } from "../http/diagnostics.js";

function example() {
  const request = action("private-workspace", "private-operation");
  request.photos = ["private-front", "private-other", "private-back"].map(
    (id) => ({
      ...request.photos[0]!,
      id,
      source: { ...request.photos[0]!.source, id },
      derivative: { ...request.photos[0]!.derivative, id },
    }),
  );
  const model = observation("private-front");
  model.garments[0] = {
    ...model.garments[0]!,
    sourceIds: ["private-front", "private-back"],
    attributes: [],
    title: "PRIVATE_MODEL_TITLE",
    description: "PRIVATE_MODEL_DESCRIPTION",
    grouping: "supported_views",
    reviewReason: "PRIVATE_MODEL_EXPLANATION",
  };
  model.garments.push(observation("private-other").garments[0]!);
  model.dispositions = request.photos.map((photo, index) => ({
    sourceId: photo.id,
    kind: "linked",
    garmentIndexes: [index === 1 ? 1 : 0],
    reason: "PRIVATE_MODEL_REASON",
  }));
  return {
    requestId: "req_decision",
    action: request,
    observation: model,
    phase: "completed" as const,
    code: null,
    elapsedMs: 1234.6,
    providerMs: 1200.2,
  };
}
describe("private catalogue decisions", () => {
  it("records proposed and accepted photo positions without model prose or visitor identifiers", () => {
    const input = example();
    const event = catalogueDiagnostic({
      ...input,
      draft: reconcileCatalogue(input.observation, input.action),
    });
    expect(event).toMatchObject({
      event: "catalogue_decision",
      requestId: "req_decision",
      phase: "completed",
      observation: "parsed",
      elapsedMs: 1235,
      providerMs: 1200,
      detailsOmitted: false,
    });
    expect(event.decisions[0]).toMatchObject({
      grouping: "supported_views",
      photoPositions: [1, 3],
      unknownPhotoReferences: 0,
      reviewReasonPresent: true,
    });
    expect(event.acceptedGroups.map((group) => group.photoPositions)).toEqual([
      [1, 3],
      [2],
    ]);
    expect(JSON.stringify(event)).not.toMatch(/private-|PRIVATE_MODEL/u);
  });
  it("keeps schema-invalid output private and makes foreign references inspectable without echoing them", () => {
    const input = example();
    const invalid = catalogueDiagnostic({
      ...input,
      requestId: "PRIVATE_BAD_REF\n",
      observation: { PRIVATE_RESPONSE: "raw text" },
      phase: "reconciling",
      code: "UPSTREAM_FAILED",
      elapsedMs: Number.NaN,
      providerMs: null,
    });
    expect(invalid).toMatchObject({
      requestId: "request_unavailable",
      observation: "invalid",
      decisions: [],
      acceptedGroups: [],
      elapsedMs: 0,
    });
    expect(JSON.stringify(invalid)).not.toContain("PRIVATE");
    input.observation.garments[0]!.sourceIds.push("PRIVATE_FOREIGN");
    const foreign = catalogueDiagnostic(input);
    expect(foreign.decisions[0]!.unknownPhotoReferences).toBe(1);
    expect(JSON.stringify(foreign)).not.toContain("PRIVATE_FOREIGN");
    expect(
      catalogueDiagnostic({ ...input, observation: undefined }).observation,
    ).toBe("unavailable");
  });
  it("records fixed comparison evidence and identifies contradictory output privately", () => {
    const input = example();
    const comparisons = [
      {
        photoPosition: 1,
        closestPhotoPosition: 3,
        relationship: "same_garment_views",
        evidence: ["matching_outline", "matching_seams"],
      },
      {
        photoPosition: 2,
        closestPhotoPosition: 1,
        relationship: "different_garment",
        evidence: ["conflicting_construction"],
      },
      {
        photoPosition: 3,
        closestPhotoPosition: 1,
        relationship: "same_garment_views",
        evidence: ["matching_outline", "matching_seams"],
      },
    ];
    const event = catalogueDiagnostic({
      ...input,
      observation: { ...input.observation, comparisons },
    });
    expect(event).toMatchObject({
      promptVersion: "catalogue-evidence-v7",
      reasoningEffort: "medium",
      groupingPolicy: "advisory",
      groupingIssue: null,
      comparisons,
    });
    const split = structuredClone(input.observation);
    split.garments[0]!.sourceIds = ["private-front"];
    const invalid = catalogueDiagnostic({
      ...input,
      phase: "reconciling",
      code: "UPSTREAM_FAILED",
      observation: { ...split, comparisons },
    });
    expect(invalid.groupingIssue).toBe("supported_pair_split");
    expect(invalid.acceptedGroups).toEqual([]);
    expect(JSON.stringify(invalid)).not.toMatch(/private-|PRIVATE_MODEL/u);
  });
  it("identifies failed attribute rules using only fixed metadata", () => {
    const input = example();
    input.observation.garments[0]!.attributes = [
      {
        name: "fit",
        evidence: "unknown",
        value: "PRIVATE_ATTRIBUTE",
        sourceIds: [],
      },
    ];
    const event = catalogueDiagnostic({
      ...input,
      code: "UPSTREAM_FAILED",
      phase: "reconciling",
    });
    expect(event.attributeIssues).toEqual([
      {
        garment: 1,
        attribute: 1,
        name: "fit",
        evidence: "unknown",
        code: "unknown_attribute_has_value",
      },
    ]);
    expect(JSON.stringify(event)).not.toMatch(/private-|PRIVATE_/u);
  });
  it("bounds maximum structured decisions and isolates a failed private sink", () => {
    const input = example();
    input.action.photos = Array.from({ length: 24 }, (_, index) => ({
      ...input.action.photos[0]!,
      id: `private-${index + 1}`,
    }));
    const sourceIds = input.action.photos.slice(16).map((photo) => photo.id);
    const garment = input.observation.garments[0]!;
    const model = {
      comparisons: Array.from({ length: 24 }, (_, index) => ({
        photoPosition: index + 1,
        closestPhotoPosition: ((index + 1) % 24) + 1,
        relationship: "same_garment_views",
        evidence: [
          "matching_outline",
          "matching_seams",
          "matching_construction",
          "complementary_view",
        ],
      })),
      garments: Array.from({ length: 20 }, () => ({
        ...garment,
        sourceIds,
        attributes: Array.from({ length: 8 }, () => ({
          name: "fit",
          value: "PRIVATE_ATTRIBUTE",
          sourceIds: [],
          evidence: "unknown",
        })),
        colourways: Array.from({ length: 8 }, () => ({
          colour: "Blue",
          sourceIds,
          evidence: "visual",
        })),
      })),
      dispositions: input.action.photos.map((photo) => ({
        sourceId: photo.id,
        kind: "linked",
        garmentIndexes: Array.from({ length: 20 }, (_, index) => index),
        reason: "PRIVATE_MODEL_REASON",
      })),
    };
    const draft = reconcileCatalogue(observation(), action());
    draft.items = Array.from({ length: 20 }, () => ({
      ...draft.items[0]!,
      product: { ...draft.items[0]!.product, imageIds: sourceIds },
    }));
    const event = catalogueDiagnostic({ ...input, observation: model, draft });
    expect(event.observation).toBe("parsed");
    expect(Buffer.byteLength(JSON.stringify(event))).toBeLessThanOrEqual(
      CATALOGUE_DIAGNOSTIC_BYTES,
    );
    expect(event.detailsOmitted).toBe(true);
    expect(event.comparisons).toEqual([]);
    expect(event.attributeIssues).toEqual([]);
    expect(JSON.stringify(event)).not.toContain("PRIVATE_ATTRIBUTE");
    const stderr = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    expect(() =>
      reportDiagnostic(() => {
        throw new Error("PRIVATE_SINK");
      }, event),
    ).not.toThrow();
    expect(stderr).toHaveBeenCalledTimes(1);
    expect(String(stderr.mock.calls[0]![0])).not.toContain("PRIVATE_SINK");
  });
});
