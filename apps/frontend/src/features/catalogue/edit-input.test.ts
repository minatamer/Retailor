import { describe, expect, it } from "vitest";
import { readCatalogueEdit, catalogueEditNotice } from "./edit-input";
import { developmentDraft } from "./development-fixture";
import { decode, file } from "../../../test/workspace";
import { sizeOptionFields, suggestSizeOption } from "./size-options";
import { reviseDraft } from "./draft";
async function fixture() {
  const photo = (await decode({ id: "photo", original: file("one").blob }))
    .photo;
  const draft = developmentDraft([photo], "operation", 0, () => "product");
  const product = draft.items[0]!.product;
  const form = new FormData();
  form.set("title", "Edited garment");
  form.set("description", "Edited description");
  form.set("category", product.category);
  form.set("primary", product.imageIds[0]!);
  product.variants.forEach((variant, index) => {
    form.set(`size_${index}`, variant.size);
    form.set(`colour_${index}`, variant.colour);
    form.set(`price_${index}`, "68.05");
    form.set(`cost_${index}`, "20.40");
    form.set(`stock_${index}`, "15");
  });
  return { product, form, draft };
}
describe("catalogue form decoding and safe notices", () => {
  it("saves removal of default sizes with the last size, exact edits and colour photos intact", async () => {
    const { product, form, draft } = await fixture();
    const original = {
      ...product,
      colourPhotos: [
        { colour: product.variants[0]!.colour, photoIds: product.imageIds },
      ],
    };
    draft.items[0]!.product = original;
    const survivor = original.variants.at(-1)!;
    const editing = { ...original, variants: [survivor] };
    form.set("size_0", survivor.size);
    form.set("colour_0", survivor.colour);
    const edited = readCatalogueEdit(editing, form);
    const accepted = reviseDraft(draft, product.id, edited);
    expect(accepted.items[0]!.product.variants).toEqual([
      { ...survivor, price: 6805, unitCost: 2040, openingStock: 15 },
    ]);
    expect(accepted.items[0]!.product.colourPhotos).toEqual(
      original.colourPhotos,
    );
    expect(accepted.items[0]!.product.imageIds).toEqual(original.imageIds);
    expect(accepted.corrections[0]!.before.variants).toEqual(original.variants);
    expect(draft.items[0]!.product.variants).toHaveLength(3);
  });
  it("saves a suggested extra size with exact edited values and rejects duplicate size/colour without changing the old draft", async () => {
    const { product, form, draft } = await fixture();
    const rows = product.variants.map((variant) => ({
      ...sizeOptionFields(variant),
      price: "68.05",
      cost: "20.40",
      stock: "15",
    }));
    const next = suggestSizeOption(
      rows,
      rows.at(-1)!.id,
      product.sizingSystemId,
      "new-size",
    )!;
    expect(next.size).toBe("34/32");
    const source = product.variants.at(-1)!;
    const editing = {
      ...product,
      variants: [
        ...product.variants,
        { ...source, id: next.id, sku: next.sku },
      ],
    };
    for (const name of ["size", "colour", "price", "cost", "stock"] as const)
      form.set(`${name}_3`, next[name]);
    const edited = readCatalogueEdit(editing, form);
    const accepted = reviseDraft(draft, product.id, edited);
    expect(accepted.items[0]!.product.variants.at(-1)).toMatchObject({
      id: "new-size",
      size: "34/32",
      price: 6805,
      unitCost: 2040,
      openingStock: 15,
    });
    expect(draft.items[0]!.product.variants).toHaveLength(3);
    expect(accepted.corrections[0]!.before.variants).toEqual(product.variants);
    form.set("size_3", source.size);
    expect(() =>
      reviseDraft(draft, product.id, readCatalogueEdit(editing, form)),
    ).toThrow();
    expect(draft.items[0]!.product.variants).toHaveLength(3);
  });
  it("keeps colour photo membership when original and newly added sizes are renamed together", async () => {
    const { product, form } = await fixture();
    const original = {
      ...product,
      variants: product.variants.map((row) => ({ ...row, colour: "Blue" })),
      colourPhotos: [{ colour: "Blue", photoIds: product.imageIds }],
    };
    const editing = {
      ...original,
      variants: [
        ...original.variants,
        { ...original.variants.at(-1)!, id: "new-size", sku: "NEW" },
      ],
    };
    editing.variants.forEach((row, index) => {
      form.set(`colour_${index}`, "Navy");
      form.set(`size_${index}`, index === 3 ? "34/32" : row.size);
      form.set(`price_${index}`, "68.05");
      form.set(`cost_${index}`, "20.40");
      form.set(`stock_${index}`, "15");
    });
    const edited = readCatalogueEdit(editing, form);
    expect(edited.colourPhotos).toEqual([
      { colour: "Navy", photoIds: product.imageIds },
    ]);
    expect(edited.variants.every((row) => row.colour === "Navy")).toBe(true);
  });
  it("keeps identities/options and exact USD conversion before canonical draft validation", async () => {
    const { product, form } = await fixture();
    const result = readCatalogueEdit(product, form);
    expect(result.id).toBe(product.id);
    expect(result.imageIds).toEqual(product.imageIds);
    expect(result.variants[0]).toMatchObject({
      id: product.variants[0]!.id,
      price: 6805,
      unitCost: 2040,
      openingStock: 15,
    });
    expect(product.title).not.toBe(result.title);
    expect(result.title).toBe("Edited garment");
  });
  it("retains helpful source-controlled money/stock messages while unknown exceptions are generic", async () => {
    const { product, form } = await fixture();
    form.set("price_0", "1.234");
    let failure;
    try {
      readCatalogueEdit(product, form);
    } catch (error) {
      failure = error;
    }
    expect(catalogueEditNotice(failure)).toContain("two decimal places");
    form.set("price_0", "68.05");
    form.set("stock_0", "10001");
    try {
      readCatalogueEdit(product, form);
    } catch (error) {
      failure = error;
    }
    expect(catalogueEditNotice(failure)).toContain("10,000");
    expect(
      catalogueEditNotice(new TypeError("PRIVATE_MARKER internal failure")),
    ).not.toContain("PRIVATE_MARKER");
    form.set("category", "PRIVATE_INVALID_CATEGORY");
    try {
      readCatalogueEdit(product, form);
    } catch (error) {
      failure = error;
    }
    expect(catalogueEditNotice(failure)).not.toContain(
      "PRIVATE_INVALID_CATEGORY",
    );
  });
});
