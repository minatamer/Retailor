import { describe, it, expect } from "vitest";
import { action, observation } from "../../../../test/fixtures/recognition.js";
import { reconcileCatalogue } from "./reconcile.js";
describe("independent catalogue output policy", () => {
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
