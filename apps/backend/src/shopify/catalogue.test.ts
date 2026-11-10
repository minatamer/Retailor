import { afterEach, describe, expect, it, vi } from "vitest";
import { shopifyFixture } from "../../../../test/fixtures/shopify.js";
import { ShopifyCatalogue } from "./catalogue.js";
import request from "supertest";
import { createApp } from "../http/app.js";
import { composeRuntime } from "../runtime/compose.js";
import { parseEnvironment } from "../config/environment.js";
import { ShopifyExportInputSchema } from "@retailor/contracts/shopify";

type Harness = Awaited<ReturnType<typeof shopifyFixture>>;
const open: Harness[] = [];
async function setup() {
  const h = await shopifyFixture();
  open.push(h);
  const catalogue = new ShopifyCatalogue(h.auth, h.provider);
  const send = (input = h.input, update = false) =>
    catalogue.export(h.cookie, h.proof, input, update, h.signal());
  const check = (id: string) =>
    catalogue.check(h.cookie, h.proof, h.input.workspaceId, id, h.signal());
  return { ...h, catalogue, send, check };
}
afterEach(async () => {
  await Promise.all(open.splice(0).map((h) => h.close()));
});

describe("owned Shopify draft products", () => {
  it("rejects oversized invalid variant arrays without accumulating per-element validation work", async () => {
    const h = await setup();
    const result = ShopifyExportInputSchema.safeParse({
      ...h.input,
      product: { ...h.input.product, variants: Array(1024).fill(null) },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeLessThanOrEqual(2);
      expect(
        result.error.issues.some((issue) => issue.code === "too_big"),
      ).toBe(true);
    }
  });
  it("reads current store currency instead of labelling new prices with the original currency", async () => {
    const h = await setup();
    await h.send();
    const identity = h.provider.identity.bind(h.provider);
    vi.spyOn(h.provider, "identity").mockImplementation(async (...args) => ({
      ...(await identity(...args)),
      currency: "EUR",
    }));
    const result = await h.catalogue.list(
      h.cookie,
      h.proof,
      "workspace",
      null,
      h.signal(),
    );
    expect(result.currency).toBe("EUR");
    expect((await h.auth.status(h.cookie, h.proof, "workspace")).currency).toBe(
      "EUR",
    );
  });
  it("reaches fixed guarded HTTP operations with schema and browser/tab checks", async () => {
    const h = await setup();
    const app = createApp(
      {
        ...composeRuntime(parseEnvironment({}), () => "req_products"),
        shopify: h.auth,
        shopifyCatalogue: h.catalogue,
      },
      () => {},
    );
    expect(
      (await request(app).post("/v1/shopify/export").send(h.input)).status,
    ).toBe(403);
    const post = (operation: string, body: object, proof = h.proof) =>
      request(app)
        .post(`/v1/shopify/${operation}`)
        .set("Origin", "http://127.0.0.1:4310")
        .set("Cookie", `retailor_shopify=${h.cookie}`)
        .set("x-retailor-shopify-tab", proof)
        .send(body);
    expect((await post("export", h.input, "a".repeat(64))).status).toBe(403);
    expect(
      (await post("export", { ...h.input, graphql: "arbitrary" })).status,
    ).toBe(400);
    const result = await post("export", h.input);
    expect(result.status).toBe(200);
    expect(result.body.export.state).toBe("ready");
    const list = await post("products", {
      schemaVersion: 1,
      workspaceId: "workspace",
      cursor: null,
    });
    expect(list.status).toBe(200);
    expect(list.body.products).toHaveLength(1);
    expect(
      (
        await post("check", {
          schemaVersion: 1,
          workspaceId: "workspace",
          exportId: result.body.export.id,
        })
      ).body.export.state,
    ).toBe("ready");
  });
  it("caps browsing at five pages, rejects invented cursors, and preserves foreign products", async () => {
    const h = await setup();
    expect(
      (await h.catalogue.list(h.cookie, h.proof, "workspace", null, h.signal()))
        .products,
    ).toEqual([]);
    await h.send();
    const template = h.provider.snapshot(h.shop)[0]!;
    for (let n = 100; n < 201; n++)
      h.provider.seed(h.shop, {
        ...template,
        id: `gid://shopify/Product/${n}`,
        handle: `foreign-${n}`,
        metafield: null,
        status: "ACTIVE",
      });
    await expect(
      h.catalogue.list(h.cookie, h.proof, "workspace", "invented", h.signal()),
    ).rejects.toMatchObject({ code: "STALE" });
    let cursor: string | null = null;
    for (let page = 1; page <= 5; page++) {
      const result = await h.catalogue.list(
        h.cookie,
        h.proof,
        "workspace",
        cursor,
        h.signal(),
      );
      expect(result.page).toBe(page);
      expect(result.products).toHaveLength(20);
      expect(result.products.filter((p) => p.owned).length).toBe(
        page === 1 ? 1 : 0,
      );
      cursor = result.nextCursor;
      expect(result.limited).toBe(page === 5);
    }
    expect(cursor).toBeNull();
    expect(h.provider.snapshot(h.shop)).toHaveLength(102);
  });

  it("counts removed intents toward the lifetime cap and removes only the ledger-owned product", async () => {
    const h = await setup();
    await h.send();
    const template = h.provider.snapshot(h.shop)[0]!;
    h.provider.seed(h.shop, {
      ...template,
      id: "gid://shopify/Product/9999",
      handle: "sentinel",
      metafield: null,
    });
    await h.auth.withConnection(
      h.cookie,
      h.proof,
      "workspace",
      h.signal(),
      async (shop, tokens, scope) => {
        const intent = await scope.update((installation) =>
          structuredClone(installation.products[0]!),
        );
        const removed = await h.catalogue.removeOwned(
          {
            shop: shop.shop,
            access: tokens.access,
            signal: h.signal(),
            admit: scope.admit,
          },
          intent,
          (change) =>
            scope.update((installation) => change(installation.products[0]!)),
        );
        expect(removed).toBe(true);
      },
    );
    expect(h.provider.snapshot(h.shop).map((p) => p.id)).toEqual([
      "gid://shopify/Product/9999",
    ]);
    for (let n = 1; n < 10; n++) {
      const input = structuredClone(h.input);
      input.product.id = `tee_${n}`;
      await h.send(input);
    }
    const extra = structuredClone(h.input);
    extra.product.id = "eleventh";
    const create = vi.spyOn(h.provider, "create");
    await expect(h.send(extra)).rejects.toMatchObject({ code: "BUSY" });
    expect(create).not.toHaveBeenCalled();
  }, 15000);
  it("sanitizes actual bytes, reads back exact prices and variants, and deduplicates", async () => {
    const h = await setup();
    const create = vi.spyOn(h.provider, "create");
    const result = await h.send();
    expect(result.export.state).toBe("ready");
    expect(result.export.remoteId).toMatch(/^gid:\/\/shopify\/Product\//);
    const remote = h.provider.snapshot(h.shop)[0]!;
    expect(remote.status).toBe("DRAFT");
    expect(remote.title).toBe("Retailor demo — Ivory Tee");
    expect(remote.variants.nodes.map((v) => [v.sku, v.price])).toEqual([
      ["TEE-S", "29.00"],
      ["TEE-M", "31.00"],
    ]);
    expect(remote.media.nodes[0]?.status).toBe("READY");
    expect((await h.send()).export.id).toBe(result.export.id);
    expect(create).toHaveBeenCalledTimes(1);
    const list = await h.catalogue.list(
      h.cookie,
      h.proof,
      "workspace",
      null,
      h.signal(),
    );
    expect(list.products[0]?.owned).toBe(true);
    const ledger = await h.ledger.inspect(
      (state) => state.installations[0]!.products[0]!,
    );
    expect(ledger.variants.every((v) => !!v.remoteId)).toBe(true);
  });

  it("recovers a create that completed before the response was lost without creating twice", async () => {
    const h = await setup();
    const original = h.provider.create.bind(h.provider);
    const create = vi
      .spyOn(h.provider, "create")
      .mockImplementationOnce(async (...args) => {
        await original(...args);
        throw new Error("lost response");
      });
    await expect(h.send()).rejects.toThrow("lost response");
    const status = await h.auth.status(h.cookie, h.proof, "workspace");
    expect(status.exports[0]?.state).toBe("checking_outcome");
    expect((await h.check(status.exports[0]!.id)).export.remoteId).toBeTruthy();
    expect((await h.send()).export.state).toBe("ready");
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("reserves unknown creates and never treats an early absent lookup as safe to retry", async () => {
    const h = await setup();
    const create = vi
      .spyOn(h.provider, "create")
      .mockRejectedValueOnce(new Error("unknown"));
    await expect(h.send()).rejects.toThrow("unknown");
    expect((await h.send()).export.state).toBe("checking_outcome");
    expect(create).toHaveBeenCalledTimes(1);
    expect(h.provider.snapshot(h.shop)).toHaveLength(0);
  });

  it("preserves mapped variant IDs on explicit update and refuses stale export changes", async () => {
    const h = await setup();
    const first = await h.send();
    const ids = h.provider.snapshot(h.shop)[0]!.variants.nodes.map((v) => v.id);
    const changed = structuredClone(h.input);
    changed.revision++;
    changed.product.title = "Revised Tee";
    changed.product.variants[0]!.price = 2999;
    await expect(h.send(changed)).rejects.toMatchObject({ code: "STALE" });
    expect((await h.send(changed, true)).export.id).toBe(first.export.id);
    const remote = h.provider.snapshot(h.shop)[0]!;
    expect(remote.variants.nodes.map((v) => v.id)).toEqual(ids);
    expect(remote.variants.nodes[0]?.price).toBe("29.99");
    expect(remote.title).toBe("Retailor demo — Revised Tee");
  });

  it("read and duplicate export preserve remote edits, while reviewed Update restores them", async () => {
    const h = await setup();
    const first = await h.send();
    const remote = h.provider.snapshot(h.shop)[0]!;
    remote.title = "Merchant edited";
    h.provider.seed(h.shop, remote);
    const configure = vi.spyOn(h.provider, "configure");
    expect((await h.check(first.export.id)).export.state).toBe(
      "needs_attention",
    );
    expect((await h.send()).export.state).toBe("needs_attention");
    expect(configure).not.toHaveBeenCalled();
    expect((await h.send(h.input, true)).export.state).toBe("ready");
    expect(configure).toHaveBeenCalledTimes(1);
  });

  it("blocks activated or forged-ownership products before updates and deletions", async () => {
    const h = await setup();
    await h.send();
    const remote = h.provider.snapshot(h.shop)[0]!;
    remote.status = "ACTIVE";
    h.provider.seed(h.shop, remote);
    const configure = vi.spyOn(h.provider, "configure");
    await expect(h.send(h.input, true)).rejects.toMatchObject({
      code: "STALE",
    });
    expect(configure).not.toHaveBeenCalled();
    remote.status = "DRAFT";
    remote.metafield = { value: "0".repeat(64) };
    h.provider.seed(h.shop, remote);
    await expect(h.send(h.input, true)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    const intent = await h.ledger.inspect(
      (state) => state.installations[0]!.products[0]!,
    );
    const remove = vi.spyOn(h.provider, "remove");
    await h.auth.withConnection(
      h.cookie,
      h.proof,
      "workspace",
      h.signal(),
      async (shop, token, scope) => {
        await expect(
          h.catalogue.removeOwned(
            {
              shop: shop.shop,
              access: token.access,
              signal: h.signal(),
              admit: scope.admit,
            },
            intent,
            async () => {},
          ),
        ).rejects.toMatchObject({ code: "FORBIDDEN" });
      },
    );
    expect(remove).not.toHaveBeenCalled();
  });

  it("rejects invalid hashes, duplicate options and changed currency before product mutation", async () => {
    const h = await setup();
    const stage = vi.spyOn(h.provider, "stage");
    const bad = structuredClone(h.input);
    bad.photos[0]!.image.hash = "a".repeat(64);
    await expect(h.send(bad)).rejects.toBeDefined();
    const duplicate = structuredClone(h.input);
    duplicate.product.variants[1]!.size = "S";
    await expect(h.send(duplicate)).rejects.toMatchObject({
      code: "INVALID_INPUT",
    });
    const identity = h.provider.identity.bind(h.provider);
    vi.spyOn(h.provider, "identity").mockImplementation(async (...args) => ({
      ...(await identity(...args)),
      currency: "EUR",
    }));
    await expect(h.send()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(stage).not.toHaveBeenCalled();
    expect(h.provider.snapshot(h.shop)).toHaveLength(0);
  });

  it("keeps live writes unavailable until cleanup is composed", async () => {
    const h = await setup();
    Object.defineProperty(h.provider, "simulated", { value: false });
    const create = vi.spyOn(h.provider, "create");
    await expect(h.send()).rejects.toMatchObject({ code: "UNAVAILABLE" });
    expect(create).not.toHaveBeenCalled();
  });

  it("enforces original expiry before a provider write and retains a late remote ID", async () => {
    const h = await setup();
    const create = h.provider.create.bind(h.provider);
    vi.spyOn(h.provider, "create").mockImplementationOnce(async (...args) => {
      const result = await create(...args);
      h.advance(7_200_001);
      return result;
    });
    await expect(h.send()).rejects.toMatchObject({ code: "STALE" });
    const intent = await h.ledger.inspect(
      (state) => state.installations[0]!.products[0]!,
    );
    expect(intent.remoteId).toBe(h.provider.snapshot(h.shop)[0]!.id);
    expect(intent.state).toBe("checking_outcome");
  });
});
