import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { shopifyFixture } from "../../../../test/fixtures/shopify.js";
import { ShopifyCatalogue } from "./catalogue.js";
import { importPhotos } from "./import.js";
import { ShopifyImportResultSchema } from "@retailor/contracts/shopify";
import { createApp } from "../http/app.js";
import { composeRuntime } from "../runtime/compose.js";
import { parseEnvironment } from "../config/environment.js";
import sharp from "sharp";
import { inspectRaster } from "@retailor/contracts/raster";
import { createHash } from "node:crypto";
import { prepareProviderImages } from "../catalogue/sanitize.js";
const open: Awaited<ReturnType<typeof shopifyFixture>>[] = [];
async function setup() {
  const h = await shopifyFixture();
  open.push(h);
  const catalogue = new ShopifyCatalogue(h.auth, h.provider);
  await catalogue.export(h.cookie, h.proof, h.input, false, h.signal());
  const product = h.provider.snapshot(h.shop)[0]!;
  const installation = await h.ledger.inspect((data) => data.installations[0]!);
  const context = {
    shop: h.shop,
    access: installation.tokens!.access,
    signal: h.signal(),
    admit: vi.fn(async () => {}),
  };
  return { ...h, catalogue, product, context, installation };
}
afterEach(async () => {
  await Promise.all(open.splice(0).map((h) => h.close()));
});
describe("authenticated Shopify collection imports", () => {
  it("strips imported EXIF through the bounded native worker while existing upload manifests still reject it", async () => {
    const h = await setup();
    const bytes = await sharp({
      create: { width: 24, height: 32, channels: 3, background: "red" },
    })
      .withExif({ IFD0: { Artist: "Private test marker" } })
      .jpeg()
      .toBuffer();
    expect(inspectRaster(bytes).privateMetadata).toBe(true);
    const shape = inspectRaster(bytes),
      image = {
        id: "metadata",
        hash: createHash("sha256").update(bytes).digest("hex"),
        mime: shape.mime,
        width: shape.width,
        height: shape.height,
        bytes: bytes.length,
      };
    await expect(
      prepareProviderImages([image], new Map([[image.id, bytes]]), h.signal()),
    ).rejects.toThrow("Image manifest mismatch");
    const imported = await importPhotos(
      h.context,
      h.product,
      async () => new Response(bytes),
    );
    expect(
      inspectRaster(Buffer.from(imported[0]!.base64, "base64")).privateMetadata,
    ).toBe(false);
  });
  it("browses the authenticated collection and returns full fields plus sanitized photo bytes without any Shopify write", async () => {
    const h = await setup();
    const create = vi.spyOn(h.provider, "create"),
      remove = vi.spyOn(h.provider, "remove");
    const groups = await h.catalogue.collections(
      h.cookie,
      h.proof,
      "workspace",
      null,
      h.signal(),
    );
    expect(groups.collections).toEqual([
      { id: h.installation.collection!.remoteId, title: "Retailor" },
    ]);
    const page = await h.catalogue.list(
      h.cookie,
      h.proof,
      "workspace",
      null,
      h.signal(),
      groups.collections[0]!.id,
    );
    expect(page.products[0]!.id).toBe(h.product.id);
    const result = await h.catalogue.importProduct(
      h.cookie,
      h.proof,
      "workspace",
      h.product.id,
      h.signal(),
    );
    expect(ShopifyImportResultSchema.safeParse(result).success).toBe(true);
    expect(result.product.variants).toHaveLength(2);
    expect(result.photos).toHaveLength(1);
    expect(Buffer.from(result.photos[0]!.base64, "base64").length).toBe(
      result.photos[0]!.image.bytes,
    );
    expect(create).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
    await expect(
      h.catalogue.collections(
        h.cookie,
        h.proof,
        "workspace",
        "invented",
        h.signal(),
      ),
    ).rejects.toMatchObject({ code: "STALE" });
  });
  it("guards fixed import operations against missing proof, arbitrary URLs, foreign IDs and expired authority", async () => {
    const h = await setup();
    const app = createApp(
      {
        ...composeRuntime(parseEnvironment({}), () => "req_import"),
        shopify: h.auth,
        shopifyCatalogue: h.catalogue,
      },
      () => {},
    );
    const body = {
      schemaVersion: 1,
      workspaceId: "workspace",
      productId: h.product.id,
    };
    const post = (payload: object, proof = h.proof) =>
      request(app)
        .post("/v1/shopify/import")
        .set("Origin", "http://127.0.0.1:4310")
        .set("Cookie", `retailor_shopify=${h.cookie}`)
        .set("x-retailor-shopify-tab", proof)
        .send(payload);
    expect((await post(body, "a".repeat(64))).status).toBe(403);
    expect(
      (await post({ ...body, url: "https://127.0.0.1/private" })).status,
    ).toBe(400);
    expect(
      (await post({ ...body, productId: "gid://shopify/Product/999999" }))
        .status,
    ).toBe(404);
    expect((await post(body)).status).toBe(200);
    h.advance(7200001);
    expect((await post(body)).status).not.toBe(200);
  });
  it("refuses gift cards, oversized variants and non-USD stores before downloading images", async () => {
    const h = await setup(),
      photos = vi.spyOn(h.provider, "importPhotos");
    h.provider.seed(h.shop, { ...h.product, isGiftCard: true });
    await expect(
      h.catalogue.importProduct(
        h.cookie,
        h.proof,
        "workspace",
        h.product.id,
        h.signal(),
      ),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
    expect(photos).not.toHaveBeenCalled();
    h.provider.seed(h.shop, {
      ...h.product,
      variants: {
        nodes: Array.from({ length: 25 }, (_, n) => ({
          ...h.product.variants.nodes[0]!,
          id: `gid://shopify/ProductVariant/${n + 100}`,
        })),
        pageInfo: { hasNextPage: false },
      },
    });
    await expect(
      h.catalogue.importProduct(
        h.cookie,
        h.proof,
        "workspace",
        h.product.id,
        h.signal(),
      ),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
    const identity = h.provider.identity.bind(h.provider);
    vi.spyOn(h.provider, "identity").mockImplementation(async (...args) => ({
      ...(await identity(...args)),
      currency: "EUR",
    }));
    await expect(
      h.catalogue.importProduct(
        h.cookie,
        h.proof,
        "workspace",
        h.product.id,
        h.signal(),
      ),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
    expect(photos).not.toHaveBeenCalled();
  });
  it("downloads only exact Shopify CDN bytes without tokens, cookies, redirects or an unlimited body", async () => {
    const h = await setup(),
      http = vi.fn<typeof fetch>(async () => new Response(h.bytes));
    const result = await importPhotos(h.context, h.product, http);
    expect(result).toHaveLength(1);
    const init = http.mock.calls[0]![1]!;
    expect(init).toMatchObject({
      redirect: "error",
      credentials: "omit",
      referrerPolicy: "no-referrer",
    });
    expect(init.headers).toBeUndefined();
    expect(h.context.admit).toHaveBeenCalledTimes(1);
    const foreign = structuredClone(h.product);
    foreign.media.nodes[0]!.image = {
      url: "https://cdn.shopify.com.evil.example/photo.webp",
    };
    await expect(importPhotos(h.context, foreign, http)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(http).toHaveBeenCalledTimes(1);
    http.mockResolvedValueOnce(new Response(new Uint8Array(768 * 1024 + 1)));
    await expect(
      importPhotos(h.context, h.product, http),
    ).rejects.toBeDefined();
    http.mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: { location: "http://127.0.0.1" },
      }),
    );
    await expect(
      importPhotos(h.context, h.product, http),
    ).rejects.toMatchObject({ code: "UPSTREAM_FAILED" });
    const abort = new AbortController();
    abort.abort();
    http.mockClear();
    await expect(
      importPhotos({ ...h.context, signal: abort.signal }, h.product, http),
    ).rejects.toBeDefined();
    expect(http).not.toHaveBeenCalled();
  });
});
