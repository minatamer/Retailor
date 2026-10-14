import { describe, expect, it } from "vitest";
import { action } from "../../../../test/fixtures/recognition.js";
import { reconcileCatalogue } from "./reconcile.js";
function example(count = 3) {
  const request = action();
  request.photos = Array.from({ length: count }, (_, index) => {
    const original = request.photos[0]!;
    const id = `source${index}`;
    return {
      ...original,
      id,
      source: { ...original.source, id, hash: String(index).repeat(64) },
      derivative: {
        ...original.derivative,
        id,
        hash: String(index).repeat(64),
      },
    };
  });
  const model = {
    garments: [
      {
        sourceIds: request.photos.map((photo) => photo.id),
        classification: "clothing",
        category: "jeans",
        title: "Straight-leg jeans",
        description: "Straight-leg jeans with front pockets.",
        grouping: "supported_colourways",
        reviewReason:
          "Matching front pocket shape, straight leg and seam construction in blue and black.",
        attributes: [],
        colourways: [
          {
            colour: "Blue",
            sourceIds: ["source0", "source1"],
            evidence: "visual",
          },
          { colour: "Black", sourceIds: ["source2"], evidence: "visual" },
        ],
      },
    ],
    dispositions: request.photos.map((photo) => ({
      sourceId: photo.id,
      kind: "linked",
      garmentIndexes: [0],
      reason: "",
    })),
  };
  return { request, model };
}
describe("independent automatic colourway policy", () => {
  it("creates one product with six exact options, not stock per picture", () => {
    const { request, model } = example();
    let count = 0;
    const draft = reconcileCatalogue(model, request, () => `local${++count}`);
    expect(draft.items).toHaveLength(1);
    const item = draft.items[0]!;
    expect(item.linkOrigin).toBe("recognition");
    expect(item.product.imageIds).toEqual(["source0", "source1", "source2"]);
    expect(item.product.variants).toHaveLength(6);
    expect(
      item.product.variants.map((variant) => [
        variant.colour,
        variant.size,
        variant.openingStock,
        variant.price,
        variant.unitCost,
      ]),
    ).toEqual(
      ["Blue", "Black"].flatMap((colour) =>
        ["S", "M", "L"].map((size) => [colour, size, 10, 4500, 2000]),
      ),
    );
    expect(
      new Set(item.product.variants.map((variant) => variant.id)).size,
    ).toBe(6);
  });
  it("keeps supported same-colour alternate angles at one option set", () => {
    const { request, model } = example(2);
    model.garments[0]!.grouping = "supported_views";
    model.garments[0]!.colourways = [model.garments[0]!.colourways[0]!];
    const product = reconcileCatalogue(model, request).items[0]!.product;
    expect(product.variants).toHaveLength(3);
    expect(
      product.variants.reduce(
        (total, variant) => total + variant.openingStock,
        0,
      ),
    ).toBe(30);
  });
  it("holds uncertain classification or relationship for explicit review", () => {
    for (const change of ["classification", "grouping"] as const) {
      const { request, model } = example();
      model.garments[0]![change] = "uncertain";
      for (const row of model.dispositions) row.kind = "review";
      const draft = reconcileCatalogue(model, request);
      expect(draft.items[0]!.included).toBe(false);
      expect(draft.dispositions.every((row) => row.kind === "review")).toBe(
        true,
      );
    }
  });
  it("rejects missing, foreign, overlapping, colliding or unsupported colour relations", () => {
    const mutations = [
      (row: ReturnType<typeof example>["model"]["garments"][number]) => {
        row.colourways[1]!.sourceIds = ["foreign"];
      },
      (row: ReturnType<typeof example>["model"]["garments"][number]) => {
        row.colourways[0]!.sourceIds = ["source0"];
      },
      (row: ReturnType<typeof example>["model"]["garments"][number]) => {
        row.colourways[1]!.sourceIds = ["source1", "source2"];
      },
      (row: ReturnType<typeof example>["model"]["garments"][number]) => {
        row.colourways[1]!.colour = "BLUE";
      },
      (row: ReturnType<typeof example>["model"]["garments"][number]) => {
        row.grouping = "supported_views";
      },
      (row: ReturnType<typeof example>["model"]["garments"][number]) => {
        row.reviewReason = "";
      },
      (row: ReturnType<typeof example>["model"]["garments"][number]) => {
        row.colourways[1]!.colour = "Unknown";
      },
      (row: ReturnType<typeof example>["model"]["garments"][number]) => {
        row.colourways[0]!.evidence = "label";
      },
    ];
    for (const change of mutations) {
      const { request, model } = example();
      change(model.garments[0]!);
      expect(() => reconcileCatalogue(model, request)).toThrow(
        "UPSTREAM_FAILED",
      );
    }
  });
  it("fits eight actual colours into the existing 24-option bound", () => {
    const { request, model } = example(8);
    model.garments[0]!.colourways = request.photos.map((photo, index) => ({
      colour: "Colour " + index,
      sourceIds: [photo.id],
      evidence: "visual",
    }));
    expect(
      reconcileCatalogue(model, request).items[0]!.product.variants,
    ).toHaveLength(24);
    model.garments[0]!.colourways.push({
      colour: "Extra",
      sourceIds: ["source0"],
      evidence: "visual",
    });
    expect(() => reconcileCatalogue(model, request)).toThrow("UPSTREAM_FAILED");
  });
  it("rejects aggregate option expansion beyond 288 before allocating excess variants", () => {
    const { request, model } = example(8);
    const base = model.garments[0]!;
    base.colourways = request.photos.map((photo, index) => ({
      colour: "Colour " + index,
      sourceIds: [photo.id],
      evidence: "visual",
    }));
    model.garments = Array.from({ length: 13 }, () => structuredClone(base));
    for (const row of model.dispositions)
      row.garmentIndexes = Array.from({ length: 13 }, (_, index) => index);
    let allocated = 0;
    expect(() =>
      reconcileCatalogue(model, request, () => "local" + ++allocated),
    ).toThrow("UPSTREAM_FAILED");
    expect(allocated).toBeLessThanOrEqual(13 + 288);
  });
});
