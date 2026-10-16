import { describe, it, expect } from "vitest";
import { action, observation } from "../../../../test/fixtures/recognition.js";
import { reconcileCatalogue } from "./reconcile.js";
describe("independent catalogue output policy", () => {
  it("requires exact zero-based reverse links for multiple views and keeps review sources held", () => {
    const request = action();
    request.photos = ["source", "back", "shirt"].map((id) => ({
      ...request.photos[0]!,
      id,
      source: { ...request.photos[0]!.source, id },
      derivative: { ...request.photos[0]!.derivative, id },
    }));
    const model = {
      garments: [
        {
          ...observation().garments[0]!,
          sourceIds: ["source", "back"],
          grouping: "supported_views",
          attributes: [],
        },
        { ...observation("shirt").garments[0]!, attributes: [] },
      ],
      dispositions: [
        { sourceId: "source", kind: "linked", garmentIndexes: [0], reason: "" },
        { sourceId: "back", kind: "linked", garmentIndexes: [0], reason: "" },
        { sourceId: "shirt", kind: "linked", garmentIndexes: [1], reason: "" },
      ],
    };
    const draft = reconcileCatalogue(model, request);
    expect(draft.items.map((item) => item.product.imageIds)).toEqual([
      ["source", "back"],
      ["shirt"],
    ]);
    expect(draft.dispositions.map((row) => row.kind)).toEqual([
      "linked",
      "linked",
      "linked",
    ]);
    for (const change of [
      { kind: "linked", garmentIndexes: [] },
      { kind: "linked", garmentIndexes: [1] },
      { kind: "review", garmentIndexes: [0] },
      { kind: "rejected", garmentIndexes: [0] },
    ]) {
      const invalid = structuredClone(model);
      Object.assign(invalid.dispositions[0]!, change);
      expect(() => reconcileCatalogue(invalid, request)).toThrow(
        "UPSTREAM_FAILED",
      );
    }
    const held = structuredClone(model);
    held.garments[0]!.grouping = "uncertain";
    held.dispositions[0]!.kind = "review";
    held.dispositions[1]!.kind = "review";
    expect(reconcileCatalogue(held, request).items[0]!.included).toBe(false);
    for (const description of ["A linen-look shirt.", "A breathable shirt."]) {
      const unsupported = structuredClone(model);
      unsupported.garments[1]!.description = description;
      expect(() => reconcileCatalogue(unsupported, request)).toThrow(
        "UPSTREAM_FAILED",
      );
    }
  });
  it("formats generated garment names without changing category, sources or evidence", () => {
    const model = observation();
    model.garments[0]!.title = "  straight-leg jeans  ";
    const before = structuredClone(model);
    const product = reconcileCatalogue(model, action()).items[0]!.product;
    expect(product.title).toBe("Straight-leg Jeans");
    expect(product.category).toBe(model.garments[0]!.category);
    expect(product.imageIds).toEqual(model.garments[0]!.sourceIds);
    expect(model).toEqual(before);
  });
  it("assigns application IDs and disclosed defaults while preserving exact sources", () => {
    let count = 0;
    const draft = reconcileCatalogue(
      observation(),
      action(),
      () => `local${++count}`,
    );
    expect(draft.items[0]!.product).toMatchObject({
      id: "local1",
      imageIds: ["source"],
      sizingSystemId: "alpha-demo",
    });
    expect(
      draft.items[0]!.product.variants.map((row) => [
        row.size,
        row.price,
        row.unitCost,
        row.openingStock,
      ]),
    ).toEqual([
      ["S", 4500, 2000, 10],
      ["M", 4500, 2000, 10],
      ["L", 4500, 2000, 10],
    ]);
    expect(draft.items[0]!.product.attributes[0]).toMatchObject({
      provenance: "image_observed",
      review: "draft",
    });
  });
  it("holds uncertain garment/grouping, accepts label drafts and rejects non-clothing honestly", () => {
    const uncertain = observation();
    uncertain.garments[0]!.classification = "uncertain";
    uncertain.dispositions[0]!.kind = "review";
    expect(reconcileCatalogue(uncertain, action()).items[0]!.included).toBe(
      false,
    );
    const label = observation();
    label.garments[0]!.attributes = [
      {
        name: "material",
        value: "Label reads cotton",
        sourceIds: ["source"],
        evidence: "label",
      },
    ];
    expect(
      reconcileCatalogue(label, action()).items[0]!.product.attributes[0]!
        .review,
    ).toBe("draft");
    const rejected = reconcileCatalogue(
      {
        garments: [],
        dispositions: [
          {
            sourceId: "source",
            kind: "rejected",
            garmentIndexes: [],
            reason: "This is footwear, outside clothing scope.",
          },
        ],
      },
      action(),
    );
    expect(rejected.items).toEqual([]);
    expect(rejected.dispositions[0]!.kind).toBe("rejected");
  });
  it("rejects invented, omitted, dangling or duplicated references and arbitrary facts", () => {
    const invalid = [
      { ...observation(), dispositions: [] },
      observation("invented"),
      { ...observation(), garments: [] },
      {
        ...observation(),
        dispositions: [
          ...observation().dispositions,
          ...observation().dispositions,
        ],
      },
      {
        ...observation(),
        garments: [{ ...observation().garments[0], price: 99 }],
      },
      {
        ...observation(),
        garments: [
          {
            ...observation().garments[0],
            attributes: [
              {
                name: "fit",
                value: "True to size",
                evidence: "visual",
                sourceIds: ["source"],
              },
            ],
          },
        ],
      },
      {
        ...observation(),
        garments: [
          {
            ...observation().garments[0],
            description: "Guaranteed waterproof organic cotton.",
          },
        ],
      },
      {
        ...observation(),
        garments: [
          {
            ...observation().garments[0],
            attributes: [
              {
                name: "material",
                value: "Cotton",
                evidence: "visual",
                sourceIds: ["source"],
              },
            ],
          },
        ],
      },
    ];
    for (const value of invalid)
      expect(() => reconcileCatalogue(value, action())).toThrow(
        "UPSTREAM_FAILED",
      );
  });
});
