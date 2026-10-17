import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { developmentDraft } from "./development-fixture";
import { automaticLinkPolicy, applyPhotoLinks, splitDraft } from "./draft";
import { readCatalogueEdit } from "./edit-input";
import { decode, file } from "../../../test/workspace";
import { SAMPLE } from "../photos/sample";
async function fixture(names = ["F01", "F16", "F19"]) {
  let count = 0;
  const id = () => `local${++count}`;
  const photos = await Promise.all(
    names.map(async (name) => {
      const asset = SAMPLE.assets.find((row) => row.id === name)!;
      const original = {
        name,
        blob: new Blob(
          [
            readFileSync(
              new URL(`../../../public${asset.path}`, import.meta.url),
            ),
          ],
          { type: asset.image.mime },
        ),
      };
      return (await decode({ id: name, original: original.blob })).photo;
    }),
  );
  return { draft: developmentDraft(photos, "operation", 0, id), id };
}
describe("source-backed fixture grouping and reversible colour edits", () => {
  it("leaves different jeans cuts separate instead of matching merely by category", async () => {
    expect((await fixture(["F01", "F02"])).draft.items).toHaveLength(2);
  });
  it("maps the exact white/black tee colourway to one authored product while keeping the blue tee separate", async () => {
    const { draft } = await fixture(["F05", "F06", "F20"]);
    expect(draft.items).toHaveLength(2);
    const tee = draft.items.find((item) =>
      item.product.imageIds.includes("F05"),
    )!.product;
    expect(tee.imageIds).toEqual(["F05", "F20"]);
    expect(tee.colourPhotos).toEqual([
      { colour: "White", photoIds: ["F05"] },
      { colour: "Black", photoIds: ["F20"] },
    ]);
    expect(
      tee.variants.map((variant) => [variant.colour, variant.size]),
    ).toEqual(
      ["White", "Black"].flatMap((colour) =>
        ["S", "M", "L"].map((size) => [colour, size]),
      ),
    );
    expect(
      draft.items.find((item) => item.product.imageIds.includes("F06"))!.product
        .imageIds,
    ).toEqual(["F06"]);
  });
  it("holds oversized opt-out expansion for review instead of exceeding twenty products", async () => {
    const { draft, id } = await fixture();
    const extra = await Promise.all(
      Array.from(
        { length: 18 },
        async (_, index) =>
          (
            await decode({
              id: `extra${index}`,
              original: file(`extra${index}`).blob,
            })
          ).photo,
      ),
    );
    const others = developmentDraft(
      extra,
      draft.operationId,
      draft.inputRevision,
      id,
    );
    const held = automaticLinkPolicy(
      {
        ...draft,
        photos: [...draft.photos, ...others.photos],
        items: [...draft.items, ...others.items],
        dispositions: [...draft.dispositions, ...others.dispositions],
      },
      false,
      id,
    );
    expect(held.items).toHaveLength(19);
    expect(held.items[0]!.included).toBe(false);
    expect(
      held.dispositions.filter((row) => row.kind === "review"),
    ).toHaveLength(3);
    expect(held.items.filter((item) => item.included)).toHaveLength(18);
  });
  it("simulates exact sample matches and preserves stock/options under deliberate opt-out and manual links", async () => {
    const { draft, id } = await fixture();
    expect(draft.items).toHaveLength(1);
    expect(draft.items[0]!.linkOrigin).toBe("development-fixture");
    expect(draft.items[0]!.product.variants).toHaveLength(6);
    const separated = automaticLinkPolicy(draft, false, id);
    expect(separated.items).toHaveLength(3);
    const manual = applyPhotoLinks(separated, [["F01", "F16"]]);
    expect(manual.items).toHaveLength(2);
    expect(
      manual.items.find((item) => item.product.imageIds.includes("F01"))!
        .product.variants,
    ).toHaveLength(3);
    expect(draft.items).toHaveLength(1);
  });
  it("unlinks the black view with its colour options and holds the new draft for review", async () => {
    const { draft } = await fixture();
    const split = splitDraft(
      draft,
      draft.items[0]!.product.id,
      "F19",
      "separate",
    );
    const original = split.items[0]!.product,
      other = split.items[1]!;
    expect(original.colourPhotos).toEqual([
      { colour: "Blue", photoIds: ["F01", "F16"] },
    ]);
    expect(
      original.variants.every((variant) => variant.colour === "Blue"),
    ).toBe(true);
    expect(
      other.product.variants.every((variant) => variant.colour === "Black"),
    ).toBe(true);
    expect(other.product.imageIds).toEqual(["F19"]);
    expect(other.included).toBe(false);
    expect(other.confirmedClothing).toBe(false);
  });
  it("renames one colour across its size rows without changing photo associations or exact amounts", async () => {
    const { draft } = await fixture();
    const product = draft.items[0]!.product,
      form = new FormData();
    for (const key of ["title", "category", "description"] as const)
      form.set(key, product[key]);
    form.set("primary", "F01");
    product.variants.forEach((variant, index) => {
      form.set(`size_${index}`, variant.size);
      form.set(
        `colour_${index}`,
        variant.colour === "Blue" ? "Indigo" : variant.colour,
      );
      form.set(`price_${index}`, "68.05");
      form.set(`cost_${index}`, "30.60");
      form.set(`stock_${index}`, "10");
    });
    const edited = readCatalogueEdit(product, form);
    expect(edited.colourPhotos?.[0]).toEqual({
      colour: "Indigo",
      photoIds: ["F01", "F16"],
    });
    expect(
      edited.variants.every(
        (variant) => variant.price === 6805 && variant.openingStock === 10,
      ),
    ).toBe(true);
    form.set("colour_0", "Navy");
    expect(() => readCatalogueEdit(product, form)).toThrow(
      "one distinct colour",
    );
  });
});
