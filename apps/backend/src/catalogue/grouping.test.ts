import { describe, expect, it } from "vitest";
import { action, observation } from "../../../../test/fixtures/recognition.js";
import { CatalogueObservationSchema, groupingIssue } from "./grouping.js";
import type { PhotoComparison } from "./grouping.js";
import { reconcileCatalogue } from "./reconcile.js";

function example() {
  const request = action();
  request.photos = ["rear", "other", "front"].map((id) => ({
    ...request.photos[0]!,
    id,
    source: { ...request.photos[0]!.source, id },
    derivative: { ...request.photos[0]!.derivative, id },
  }));
  const model = CatalogueObservationSchema.parse({
    garments: [
      {
        ...observation("rear").garments[0]!,
        sourceIds: ["rear", "front"],
        category: "jeans",
        title: "Blue Straight-leg Jeans",
        description: "Blue jeans with front and rear pockets.",
        attributes: [],
        grouping: "supported_views",
        reviewReason: "Corresponding leg outline, waist and seam construction.",
        colourways: [
          { colour: "Blue", sourceIds: ["rear", "front"], evidence: "visual" },
        ],
      },
      { ...observation("other").garments[0]!, attributes: [] },
    ],
    dispositions: request.photos.map((photo, index) => ({
      sourceId: photo.id,
      kind: "linked",
      garmentIndexes: [index === 1 ? 1 : 0],
      reason: "",
    })),
    comparisons: [views(1, 3), none(2), views(3, 1)],
  });
  return { request, model };
}
function views(photo: number, closest: number): PhotoComparison {
  return {
    photoPosition: photo,
    closestPhotoPosition: closest,
    relationship: "same_garment_views",
    evidence: ["matching_outline", "matching_seams", "complementary_view"],
  };
}
function none(photo: number): PhotoComparison {
  return {
    photoPosition: photo,
    closestPhotoPosition: null,
    relationship: "no_candidate",
    evidence: [],
  };
}
function colours(photo: number, closest: number): PhotoComparison {
  return {
    photoPosition: photo,
    closestPhotoPosition: closest,
    relationship: "same_design_colourway",
    evidence: ["different_colour_only", "matching_construction"],
  };
}

describe("comparison-backed catalogue grouping", () => {
  it("keeps supported nonadjacent front/rear views together without changing price authority", () => {
    const { request, model } = example();
    expect(groupingIssue(model, request)).toBeNull();
    const draft = reconcileCatalogue(model, request);
    expect(draft.items.map((item) => item.product.imageIds)).toEqual([
      ["rear", "front"],
      ["other"],
    ]);
    expect(draft.items[0]!.product.variants.map((row) => row.price)).toEqual([
      4500, 4500, 4500,
    ]);
  });
  it("retains supported white/black design as colour options on one product", () => {
    const { request, model } = example();
    Object.assign(model.garments[0]!, {
      category: "tees",
      title: "Crew-neck T-Shirt",
      grouping: "supported_colourways",
      colourways: [
        { colour: "White", sourceIds: ["rear"], evidence: "visual" },
        { colour: "Black", sourceIds: ["front"], evidence: "visual" },
      ],
    });
    model.comparisons = [colours(1, 3), none(2), colours(3, 1)];
    const draft = reconcileCatalogue(model, request);
    expect(draft.items[0]!.product.imageIds).toEqual(["rear", "front"]);
    expect(draft.items[0]!.product.colourPhotos).toEqual([
      { colour: "White", photoIds: ["rear"] },
      { colour: "Black", photoIds: ["front"] },
    ]);
    expect(draft.items[0]!.product.variants.map((row) => row.colour)).toEqual([
      "White",
      "White",
      "White",
      "Black",
      "Black",
      "Black",
    ]);
  });
  it("compares same-category singles but preserves a visible cut conflict or uncertainty", () => {
    for (const relationship of ["different_garment", "uncertain"] as const) {
      const { request, model } = example();
      const first = model.garments[0]!;
      const third = { ...structuredClone(first), sourceIds: ["front"] };
      first.sourceIds = ["rear"];
      for (const garment of [first, third]) {
        garment.grouping = "single";
        garment.colourways = null;
      }
      model.garments.push(third);
      model.dispositions[2]!.garmentIndexes = [2];
      model.comparisons = [
        {
          photoPosition: 1,
          closestPhotoPosition: 3,
          relationship,
          evidence: [
            relationship === "different_garment"
              ? "conflicting_outline"
              : "insufficient_evidence",
          ],
        },
        none(2),
        {
          photoPosition: 3,
          closestPhotoPosition: 1,
          relationship,
          evidence: [
            relationship === "different_garment"
              ? "conflicting_outline"
              : "insufficient_evidence",
          ],
        },
      ];
      expect(groupingIssue(model, request)).toBeNull();
      expect(reconcileCatalogue(model, request).items).toHaveLength(3);
      model.comparisons[0] = none(1);
      expect(groupingIssue(model, request)).toBe(
        "comparison_candidate_missing",
      );
    }
  });
  it("supports a connected group of views and colourways through transitive comparisons", () => {
    const { request, model } = example();
    model.garments = [
      {
        ...model.garments[0]!,
        sourceIds: ["rear", "other", "front"],
        grouping: "supported_colourways",
        colourways: [
          { colour: "Blue", sourceIds: ["rear", "front"], evidence: "visual" },
          { colour: "Black", sourceIds: ["other"], evidence: "visual" },
        ],
      },
    ];
    model.dispositions.forEach((row) => {
      row.garmentIndexes = [0];
    });
    model.comparisons = [views(1, 3), colours(2, 3), views(3, 1)];
    expect(groupingIssue(model, request)).toBeNull();
    expect(
      reconcileCatalogue(model, request).items[0]!.product.imageIds,
    ).toHaveLength(3);
  });
  it("records incomplete, duplicate, self, foreign or contradictory comparisons without rejecting valid review data", () => {
    const { request, model } = example();
    const cases: [PhotoComparison[], string][] = [
      [[views(1, 3), none(2)], "comparison_coverage"],
      [[views(1, 3), none(2), views(1, 3)], "comparison_coverage"],
      [[views(1, 3), none(2), views(4, 1)], "comparison_coverage"],
      [[views(1, 1), none(2), views(3, 1)], "comparison_reference"],
      [[views(1, 4), none(2), views(3, 1)], "comparison_reference"],
      [
        [{ ...views(1, 3), closestPhotoPosition: null }, none(2), views(3, 1)],
        "comparison_reference",
      ],
      [
        [{ ...none(1), closestPhotoPosition: 3 }, none(2), views(3, 1)],
        "comparison_reference",
      ],
      [
        [
          { ...views(1, 3), evidence: ["matching_outline"] },
          none(2),
          views(3, 1),
        ],
        "comparison_evidence",
      ],
      [
        [
          { ...views(1, 3), evidence: ["matching_seams", "matching_seams"] },
          none(2),
          views(3, 1),
        ],
        "comparison_reference",
      ],
      [
        [
          {
            ...views(1, 3),
            evidence: ["matching_seams", "conflicting_outline"],
          },
          none(2),
          views(3, 1),
        ],
        "comparison_evidence",
      ],
      [
        [
          {
            ...views(1, 3),
            relationship: "different_garment",
            evidence: ["conflicting_outline"],
          },
          none(2),
          views(3, 1),
        ],
        "unsupported_pair_merged",
      ],
      [
        [
          {
            ...views(1, 3),
            relationship: "uncertain",
            evidence: ["insufficient_evidence"],
          },
          none(2),
          views(3, 1),
        ],
        "unsupported_pair_merged",
      ],
    ];
    for (const [comparisons, issue] of cases) {
      const invalid = { ...model, comparisons };
      expect(groupingIssue(invalid, request)).toBe(issue);
      expect(reconcileCatalogue(invalid, request).items).toHaveLength(2);
    }
  });
  it("lets users review separated predictions while diagnosing comparison disagreements", () => {
    const { request, model } = example();
    const split = structuredClone(model);
    split.garments[0]!.sourceIds = ["rear"];
    split.garments.push({
      ...structuredClone(split.garments[0]!),
      sourceIds: ["front"],
    });
    for (const garment of [split.garments[0]!, split.garments[2]!]) {
      garment.grouping = "single";
      garment.colourways = null;
    }
    split.dispositions[2]!.garmentIndexes = [2];
    expect(groupingIssue(split, request)).toBe("supported_pair_split");
    expect(
      reconcileCatalogue(split, request).items.map(
        (item) => item.product.imageIds,
      ),
    ).toEqual([["rear"], ["other"], ["front"]]);
    model.comparisons = [colours(1, 3), none(2), colours(3, 1)];
    expect(groupingIssue(model, request)).toBe("comparison_colour_partition");
    model.comparisons = [views(1, 3), none(2), views(3, 1)];
    model.garments[0]!.grouping = "supported_colourways";
    model.garments[0]!.colourways = [
      { colour: "Blue", sourceIds: ["rear"], evidence: "visual" },
      { colour: "Black", sourceIds: ["front"], evidence: "visual" },
    ];
    expect(groupingIssue(model, request)).toBe("comparison_colour_partition");
  });
  it("diagnoses disconnected prediction groups while preserving editable photo groups", () => {
    const { request, model } = example();
    const fourth = {
      ...request.photos[0]!,
      id: "fourth",
      source: { ...request.photos[0]!.source, id: "fourth" },
      derivative: { ...request.photos[0]!.derivative, id: "fourth" },
    };
    request.photos.push(fourth);
    model.garments = [
      {
        ...model.garments[0]!,
        sourceIds: ["rear", "other", "front", "fourth"],
        colourways: null,
      },
    ];
    model.comparisons = [views(1, 3), views(2, 4), views(3, 1), views(4, 2)];
    model.dispositions.forEach((row) => {
      row.garmentIndexes = [0];
    });
    model.dispositions.push({
      sourceId: "fourth",
      kind: "linked",
      garmentIndexes: [0],
      reason: "",
    });
    expect(groupingIssue(model, request)).toBe("group_comparison_disconnected");
    expect(
      reconcileCatalogue(model, request).items[0]!.product.imageIds,
    ).toHaveLength(4);
  });
  it("keeps held and rejected photos out of supported groups and retains legacy readers", () => {
    const { request, model } = example();
    model.garments[0]!.grouping = "uncertain";
    expect(groupingIssue(model, request)).toBe("supported_pair_split");
    model.comparisons = [none(1), none(2), none(3)];
    model.dispositions[0]!.kind = "review";
    model.dispositions[2]!.kind = "review";
    expect(reconcileCatalogue(model, request).items[0]!.included).toBe(false);
    const rejected = {
      garments: [],
      dispositions: [
        {
          sourceId: "source",
          kind: "rejected",
          garmentIndexes: [],
          reason: "Not clothing.",
        },
      ],
      comparisons: [none(1)],
    };
    expect(reconcileCatalogue(rejected, action()).items).toEqual([]);
    expect(reconcileCatalogue(observation(), action()).items).toHaveLength(1);
  });
});
