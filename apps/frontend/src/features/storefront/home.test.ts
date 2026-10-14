import { describe, expect, it } from "vitest";
import { ILLUSTRATED_ITEMS, ILLUSTRATED_PHOTOS } from "../landing/illustration";
import { campaignPhotos } from "./campaign";

describe("campaigns use actual available clothing photographs", () => {
  it("skips unavailable and archived garments and completes an honest one-photo campaign", () => {
    const first = ILLUSTRATED_ITEMS[0]!;
    const second = ILLUSTRATED_ITEMS[1]!;
    const unavailable = { ...first, photoIds: ["unavailable"] };
    const archived = {
      ...second,
      product: { ...second.product, archived: true },
    };
    const result = campaignPhotos(
      [unavailable, archived, ILLUSTRATED_ITEMS[2]!],
      ILLUSTRATED_PHOTOS,
      undefined,
      3,
    );
    expect(result.map((view) => view.photo.id)).toEqual(["F12"]);
    expect(
      campaignPhotos([unavailable, archived], ILLUSTRATED_PHOTOS, undefined, 3),
    ).toEqual([]);
  });
  it("honours an available alternate hero without presenting its garment again", () => {
    const alternate = { ...ILLUSTRATED_PHOTOS.get("F01")!, id: "alternate" };
    const item = {
      ...ILLUSTRATED_ITEMS[0]!,
      product: {
        ...ILLUSTRATED_ITEMS[0]!.product,
        imageIds: ["F01", "alternate"],
      },
    };
    const result = campaignPhotos(
      [item, ...ILLUSTRATED_ITEMS.slice(1)],
      ILLUSTRATED_PHOTOS,
      alternate,
      3,
    );
    expect(result.map((view) => view.photo.id)).toEqual([
      "alternate",
      "F07",
      "F12",
    ]);
    expect(result[0]!.item).toBeUndefined();
  });
  it("prefers distinct categories, retains real garment identity and bounds the composition", () => {
    const first = ILLUSTRATED_ITEMS[0]!;
    const repeatCategory = {
      ...ILLUSTRATED_ITEMS[1]!,
      product: {
        ...ILLUSTRATED_ITEMS[1]!.product,
        category: first.product.category,
      },
    };
    const result = campaignPhotos(
      [first, repeatCategory, ILLUSTRATED_ITEMS[2]!],
      ILLUSTRATED_PHOTOS,
      undefined,
      2,
    );
    expect(result.map((view) => view.photo.id)).toEqual(["F01", "F12"]);
    expect(result[0]!.item).toBe(first);
    expect(
      campaignPhotos([first, first], ILLUSTRATED_PHOTOS, undefined, 3),
    ).toHaveLength(1);
  });
});
