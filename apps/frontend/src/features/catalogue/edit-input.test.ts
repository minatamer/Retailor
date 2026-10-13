import { describe, expect, it } from "vitest";
import { readCatalogueEdit, catalogueEditNotice } from "./edit-input";
import { developmentDraft } from "./development-fixture";
import { decode, file } from "../../../test/workspace";
async function fixture() {
  const photo = (await decode({ id: "photo", original: file("one").blob }))
    .photo;
  const product = developmentDraft([photo], "operation", 0, () => "product")
    .items[0]!.product;
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
  return { product, form };
}
describe("catalogue form decoding and safe notices", () => {
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
