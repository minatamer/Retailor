import { describe, expect, it } from "vitest";
import { ILLUSTRATED_ITEMS, ILLUSTRATED_PHOTOS } from "../landing/illustration";
import { campaignPhotos } from "./campaign";

describe("campaigns use actual available clothing photographs", () => {
  it("honours each selected position, fills automatic gaps around pinned garments and never repeats a photo", () => {
    const first = ILLUSTRATED_PHOTOS.get("F01")!,
      second = ILLUSTRATED_PHOTOS.get("F07")!,
      third = ILLUSTRATED_PHOTOS.get("F12")!;
    const selected = [third, first, second];
    expect(
      campaignPhotos(ILLUSTRATED_ITEMS, ILLUSTRATED_PHOTOS, selected, 3).map(
        (tile) => tile.photo.id,
      ),
    ).toEqual(["F12", "F01", "F07"]);
    expect(
      campaignPhotos(ILLUSTRATED_ITEMS, ILLUSTRATED_PHOTOS, selected, 2).map(
        (tile) => tile.photo.id,
      ),
    ).toEqual(["F12", "F01"]);
    const automatic = campaignPhotos(
      ILLUSTRATED_ITEMS,
      ILLUSTRATED_PHOTOS,
      [undefined, third, undefined],
      3,
    );
    expect(automatic.map((tile) => tile.photo.id)).toEqual([
      "F01",
      "F12",
      "F07",
    ]);
    expect(automatic[1]!.item).toBe(ILLUSTRATED_ITEMS[2]);
    expect(
      campaignPhotos(
        ILLUSTRATED_ITEMS,
        ILLUSTRATED_PHOTOS,
        [first, first, third],
        3,
      ).map((tile) => tile.photo.id),
    ).toEqual(["F01", "F07", "F12"]);
    expect(selected).toEqual([third, first, second]);
  });
  it("retains honest slot numbering when only a selected later photo is available", () => {
    const photo = ILLUSTRATED_PHOTOS.get("F01")!;
    const result = campaignPhotos(
      [ILLUSTRATED_ITEMS[0]!],
      ILLUSTRATED_PHOTOS,
      [undefined, undefined, photo],
      3,
    );
    expect(result).toHaveLength(1);
    expect(result[0]!.photo.id).toBe("F01");
    expect(result[0]!.slot).toBe(2);
    expect(
      campaignPhotos([], new Map(), [undefined, undefined, undefined], 3),
    ).toEqual([]);
  });
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
