import { describe, expect, it } from "vitest";
import { parseCatalogueAction, ModelCatalogueSchema } from "./recognition.js";
import { action, observation } from "../../../test/fixtures/recognition.js";
describe("strict bounded recognition contracts", () => {
  it("binds a fixed lifetime, unique inputs and aggregate original/derivative limits", () => {
    const value = action();
    expect(parseCatalogueAction(value)).toEqual(value);
    for (const invalid of [
      { ...value, expiresAt: value.createdAt },
      { ...value, mode: "fake" },
      { ...value, disclosureVersion: "unknown" },
      { ...value, photos: [value.photos[0], value.photos[0]] },
      { ...value, arbitrary: true },
    ])
      expect(() => parseCatalogueAction(invalid)).toThrow();
    const photos = Array.from({ length: 24 }, (_, i) => {
      const derivative = {
        ...value.photos[0]!.derivative,
        id: `input${i}`,
        hash: i.toString(16).padStart(64, "0"),
        bytes: 768 * 1024,
      };
      return { id: derivative.id, derivative, source: derivative };
    });
    expect(parseCatalogueAction({ ...value, photos }).photos.length).toBe(24);
    expect(() =>
      parseCatalogueAction({
        ...value,
        photos: photos.map((photo) => ({
          ...photo,
          source: { ...photo.source, bytes: 4 * 1024 * 1024 },
        })),
      }),
    ).toThrow();
  });
  it("forbids model financial/ID authority and requires explicit nullable uncertainty", () => {
    expect(ModelCatalogueSchema.parse(observation()).garments.length).toBe(1);
    expect(() =>
      ModelCatalogueSchema.parse({
        ...observation(),
        garments: [{ ...observation().garments[0], unitCost: 99 }],
      }),
    ).toThrow();
    const ambiguous = {
      ...observation().garments[0],
      category: null,
      attributes: [
        { name: "fit", value: null, sourceIds: [], evidence: "unknown" },
      ],
    };
    expect(
      ModelCatalogueSchema.parse({ ...observation(), garments: [ambiguous] })
        .garments[0]!.category,
    ).toBeNull();
  });
});
