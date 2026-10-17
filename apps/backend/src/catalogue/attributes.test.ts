import { describe, expect, it } from "vitest";
import {
  ModelAttributeSchema,
  ModelCatalogueSchema,
} from "@retailor/contracts/recognition";
import { attributeIssue } from "./attributes.js";
import { reconcileCatalogue } from "./reconcile.js";
import { action, observation } from "../../../../test/fixtures/recognition.js";

describe("private attribute validation reasons", () => {
  it("retains every source/evidence/value rejection without exposing attribute content", () => {
    const base = {
      name: "closure",
      value: "Buttons",
      sourceIds: ["source"],
      evidence: "visual",
    };
    const cases = [
      [{ sourceIds: ["source", "source"] }, "duplicate_sources"],
      [{ sourceIds: ["private-foreign"] }, "foreign_source"],
      [{ sourceIds: [] }, "missing_evidence_sources"],
      [{ value: null }, "missing_evidence_value"],
      [{ name: "fit" }, "visual_attribute_not_allowed"],
      [{ evidence: "label" }, "label_attribute_not_allowed"],
      [
        { evidence: "unknown", sourceIds: [], value: "PRIVATE_VALUE" },
        "unknown_attribute_has_value",
      ],
      [{ evidence: "unknown", value: null }, "unknown_attribute_has_sources"],
    ] as const;
    for (const [change, code] of cases) {
      const attr = ModelAttributeSchema.parse({ ...base, ...change });
      expect(attributeIssue(attr, ["source"])).toBe(code);
      const model = ModelCatalogueSchema.parse(observation());
      model.garments[0]!.attributes = [attr];
      expect(() => reconcileCatalogue(model, action())).toThrow(
        "UPSTREAM_FAILED",
      );
    }
  });
  it("accepts supported visible/label observations and genuinely unknown or omitted rows", () => {
    for (const row of [
      {
        name: "colour",
        evidence: "visual",
        value: "Blue",
        sourceIds: ["source"],
      },
      {
        name: "care",
        evidence: "label",
        value: "Label text",
        sourceIds: ["source"],
      },
      { name: "fit", evidence: "unknown", value: null, sourceIds: [] },
    ]) {
      const attr = ModelAttributeSchema.parse(row);
      expect(attributeIssue(attr, ["source"])).toBeNull();
      const model = ModelCatalogueSchema.parse(observation());
      model.garments[0]!.attributes = [attr];
      expect(reconcileCatalogue(model, action()).items).toHaveLength(1);
    }
    const model = observation();
    model.garments[0]!.attributes = [];
    expect(
      reconcileCatalogue(model, action()).items[0]!.product.attributes,
    ).toEqual([]);
  });
});
