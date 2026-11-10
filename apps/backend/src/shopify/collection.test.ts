import { afterEach, describe, expect, it, vi } from "vitest";
import { shopifyFixture } from "../../../../test/fixtures/shopify.js";
import { ShopifyCatalogue } from "./catalogue.js";
import { ShopifyCleanup } from "./cleanup.js";
import { InstallationSchema } from "./model.js";

const open: Awaited<ReturnType<typeof shopifyFixture>>[] = [];
async function setup() {
  const h = await shopifyFixture();
  open.push(h);
  const catalogue = new ShopifyCatalogue(h.auth, h.provider),
    cleanup = new ShopifyCleanup(h.auth, catalogue);
  const send = (input = h.input) =>
    catalogue.export(h.cookie, h.proof, input, false, h.signal());
  const current = () => h.ledger.inspect((data) => data.installations[0]!);
  const check = async () =>
    catalogue.check(
      h.cookie,
      h.proof,
      "workspace",
      (await current()).products[0]!.id,
      h.signal(),
    );
  const end = () => cleanup.request(h.cookie, h.proof, "workspace");
  return { ...h, catalogue, cleanup, send, current, check, end };
}
afterEach(async () => {
  await Promise.all(open.splice(0).map((h) => h.close()));
});

describe("Retailor collection ownership and lifecycle", () => {
  it("joins multiple photo-bearing drafts to one collection and removes it before app access", async () => {
    const h = await setup(),
      create = vi.spyOn(h.provider.collections, "create");
    const first = await h.send();
    expect(first.export.state).toBe("ready");
    const input = structuredClone(h.input);
    input.product.id = "second_tee";
    await h.send(input);
    expect(create).toHaveBeenCalledTimes(1);
    const current = await h.current();
    const ctx = {
      shop: h.shop,
      access: current.tokens!.access,
      signal: h.signal(),
      admit: async () => {},
    };
    const remote = await h.provider.collections.read(ctx, {
      id: current.collection!.remoteId!,
    });
    expect(remote!.products.nodes.map((row) => row.id)).toEqual(
      current.products.map((row) => row.remoteId),
    );
    expect(
      h.provider
        .snapshot(h.shop)
        .every(
          (row) => row.status === "DRAFT" && row.media.nodes[0]?.image?.url,
        ),
    ).toBe(true);
    const remove = vi.spyOn(h.provider.collections, "remove"),
      uninstall = vi.spyOn(h.provider, "uninstall");
    await h.end();
    await h.cleanup.sweep(h.signal());
    expect((await h.current()).state).toBe("cleaned");
    expect((await h.current()).collection!.removed).toBe(true);
    expect(remove.mock.invocationCallOrder[0]).toBeLessThan(
      uninstall.mock.invocationCallOrder[0]!,
    );
    expect(h.provider.snapshot(h.shop)).toEqual([]);
  });
  it("reconciles a committed collection create after losing its response without duplicating it", async () => {
    const h = await setup(),
      actual = h.provider.collections.create.bind(h.provider.collections);
    const create = vi
      .spyOn(h.provider.collections, "create")
      .mockImplementationOnce(async (...args) => {
        await actual(...args);
        throw new Error("lost response");
      });
    await expect(h.send()).rejects.toThrow("lost response");
    expect((await h.current()).collection).toMatchObject({
      dispatched: true,
      remoteId: null,
    });
    expect((await h.current()).products[0]!.createDispatched).toBe(false);
    expect((await h.send()).export.state).toBe("ready");
    expect(create).toHaveBeenCalledTimes(1);
  });
  it("retains an unknown missing collection and its credentials instead of retrying create or uninstalling", async () => {
    const h = await setup(),
      create = vi
        .spyOn(h.provider.collections, "create")
        .mockRejectedValue(new Error("unknown"));
    await expect(h.send()).rejects.toThrow("unknown");
    await expect(h.send()).rejects.toMatchObject({ code: "UPSTREAM_FAILED" });
    expect(create).toHaveBeenCalledTimes(1);
    const uninstall = vi.spyOn(h.provider, "uninstall");
    await h.end();
    await h.cleanup.sweep(h.signal());
    expect(uninstall).not.toHaveBeenCalled();
    expect((await h.current()).collection!.removed).toBe(false);
    expect((await h.current()).tokens).not.toBeNull();
  });
  it("allows a fresh explicit retry after a definite rejection and cleans a rejected-only attempt", async () => {
    const h = await setup(),
      create = vi
        .spyOn(h.provider.collections, "create")
        .mockResolvedValueOnce(null);
    await expect(h.send()).rejects.toMatchObject({ code: "UPSTREAM_FAILED" });
    expect((await h.current()).collection!.dispatched).toBe(false);
    expect((await h.send()).export.state).toBe("ready");
    expect(create).toHaveBeenCalledTimes(2);
    const rejected = await setup();
    vi.spyOn(rejected.provider.collections, "create").mockResolvedValue(null);
    await expect(rejected.send()).rejects.toMatchObject({
      code: "UPSTREAM_FAILED",
    });
    await rejected.end();
    await rejected.cleanup.sweep(rejected.signal());
    expect((await rejected.current()).state).toBe("cleaned");
  });
  it.each(["foreign marker", "foreign product", "more products"])(
    "preserves a collection with %s during cleanup",
    async (change) => {
      const h = await setup();
      await h.send();
      const actual = h.provider.collections.read.bind(h.provider.collections);
      vi.spyOn(h.provider.collections, "read").mockImplementation(
        async (...args) => {
          const row = await actual(...args);
          if (row) {
            if (change === "foreign marker")
              row.metafield = { value: "b".repeat(64) };
            if (change === "foreign product")
              row.products.nodes.push({ id: "gid://shopify/Product/999999" });
            if (change === "more products")
              row.products.pageInfo.hasNextPage = true;
          }
          return row;
        },
      );
      const remove = vi.spyOn(h.provider.collections, "remove"),
        uninstall = vi.spyOn(h.provider, "uninstall");
      await h.end();
      await h.cleanup.sweep(h.signal());
      expect(remove).not.toHaveBeenCalled();
      expect(uninstall).not.toHaveBeenCalled();
      expect((await h.current()).collection!.removed).toBe(false);
      expect((await h.current()).state).toBe("cleanup_pending");
    },
  );
  it("does not report ready when collection membership is missing or its verification fails", async () => {
    const h = await setup();
    await h.send();
    const actual = h.provider.collections.read.bind(h.provider.collections);
    vi.spyOn(h.provider.collections, "read").mockImplementation(
      async (...args) => {
        const row = await actual(...args);
        if (row) row.products.nodes = [];
        return row;
      },
    );
    expect((await h.check()).export.state).toBe("needs_attention");
    vi.spyOn(h.provider.collections, "read").mockRejectedValue(
      new Error("read unavailable"),
    );
    await expect(h.check()).rejects.toThrow("read unavailable");
    expect((await h.current()).products[0]!.state).toBe("checking_outcome");
  });
  it("settles a lost delete response by reading absence, then uninstalls", async () => {
    const h = await setup();
    await h.send();
    const actual = h.provider.collections.remove.bind(h.provider.collections);
    const remove = vi
      .spyOn(h.provider.collections, "remove")
      .mockImplementationOnce(async (...args) => {
        await actual(...args);
        throw new Error("lost delete");
      });
    await h.end();
    await h.cleanup.sweep(h.signal());
    expect((await h.current()).state).toBe("needs_attention");
    h.advance(600000);
    await h.cleanup.sweep(h.signal());
    expect((await h.current()).state).toBe("cleaned");
    expect(remove).toHaveBeenCalledTimes(1);
  });
  it("loads older installations without a collection record", async () => {
    const h = await setup();
    const legacy: Record<string, unknown> = await h.current();
    delete legacy.collection;
    expect(InstallationSchema.parse(legacy).collection).toBeNull();
    await h.end();
    await h.cleanup.sweep(h.signal());
    expect((await h.current()).state).toBe("cleaned");
  });
  it("can finish collection cleanup and uninstall on the final bounded maintenance attempt", async () => {
    const h = await setup();
    await h.send();
    await h.ledger.transact((data) => {
      data.installations[0]!.maintenanceAttempts = 7;
    });
    await h.end();
    await h.cleanup.sweep(h.signal());
    expect((await h.current()).state).toBe("cleaned");
    expect((await h.current()).maintenanceAttempts).toBe(8);
  });
});
