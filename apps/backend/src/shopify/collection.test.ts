import { afterEach, describe, expect, it, vi } from "vitest";
import { shopifyFixture } from "../../../../test/fixtures/shopify.js";
import { ShopifyCatalogue } from "./catalogue.js";
import { ShopifyCleanup } from "./cleanup.js";
import { InstallationSchema } from "./model.js";

const open: Awaited<ReturnType<typeof shopifyFixture>>[] = [];
async function setup(isolateImages = false) {
  const h = await shopifyFixture();
  open.push(h);
  const catalogue = new ShopifyCatalogue(
      h.auth,
      h.provider,
      undefined,
      // Logo tests exercise real ledger/provider coordination, not the native
      // decoder. Restrict this injected port to the fixed valid fixture bytes.
      isolateImages
        ? async (_manifest, files, signal) => {
            signal.throwIfAborted();
            if (
              files.size !== 1 ||
              !Buffer.from([...files.values()][0]!).equals(h.bytes)
            )
              throw new Error("Unexpected collection image fixture");
            return new Map(files);
          }
        : undefined,
    ),
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
  const update = () =>
    catalogue.export(
      h.cookie,
      h.proof,
      {
        ...h.input,
        revision: 2,
        product: { ...h.input.product, description: "Updated cotton" },
      },
      true,
      h.signal(),
    );
  const collection = async () => {
    const installation = await current();
    const ctx = {
      shop: h.shop,
      access: installation.tokens!.access,
      signal: h.signal(),
      admit: async () => {},
    };
    const remote = await h.provider.collections.read(ctx, {
      id: installation.collection!.remoteId!,
    });
    return { ctx, remote: remote! };
  };
  return {
    ...h,
    catalogue,
    cleanup,
    send,
    current,
    check,
    end,
    update,
    collection,
  };
}
afterEach(async () => {
  await Promise.all(open.splice(0).map((h) => h.close()));
});

describe("Retailor collection ownership and lifecycle", () => {
  it("does not resend an asynchronously processing image from collection creation", async () => {
    const h = await setup(true),
      actual = h.provider.collections.create.bind(h.provider.collections);
    vi.spyOn(h.provider.collections, "create").mockImplementationOnce(
      async (...args) => {
        const remote = await actual(...args);
        if (!remote) return remote;
        const processing = { ...remote, image: null };
        h.provider.seedCollection(h.shop, processing);
        return processing;
      },
    );
    const setImage = vi.spyOn(h.provider.collections, "setImage");
    expect((await h.send()).export.state).toBe("ready");
    expect((await h.current()).collection!.imageDispatched).toBe(true);
    const second = structuredClone(h.input);
    second.product.id = "second_tee";
    expect((await h.send(second)).export.state).toBe("ready");
    expect(setImage).not.toHaveBeenCalled();
    const { remote } = await h.collection();
    h.provider.seedCollection(h.shop, {
      ...remote,
      image: { id: "processed-image" },
    });
    await h.update();
    expect((await h.current()).collection!.imageDispatched).toBe(false);
    expect(setImage).not.toHaveBeenCalled();
  });
  it.each(["export", "update"])(
    "fills an existing empty collection image during reviewed %s and skips later non-null images",
    async (operation) => {
      const h = await setup(true);
      await h.send();
      const { remote } = await h.collection();
      expect(remote.image).not.toBeNull();
      h.provider.seedCollection(h.shop, { ...remote, image: null });
      const setImage = vi.spyOn(h.provider.collections, "setImage");
      const second = structuredClone(h.input);
      second.product.id = "second_tee";
      expect(
        (await (operation === "update" ? h.update() : h.send(second))).export
          .state,
      ).toBe("ready");
      expect(setImage).toHaveBeenCalledTimes(1);
      expect((await h.collection()).remote.image).not.toBeNull();
      expect((await h.current()).collection!.imageDispatched).toBe(false);
      const latest = (await h.collection()).remote;
      h.provider.seedCollection(h.shop, { ...latest, image: { id: null } });
      await h.update();
      expect(setImage).toHaveBeenCalledTimes(1);
      expect((await h.collection()).remote.image).toEqual({ id: null });
    },
  );
  it("preserves an image added between the initial lookup and the final pre-write check", async () => {
    const h = await setup(true);
    await h.send();
    const { remote } = await h.collection();
    h.provider.seedCollection(h.shop, { ...remote, image: null });
    const actual = h.provider.collections.read.bind(h.provider.collections);
    let reads = 0;
    vi.spyOn(h.provider.collections, "read").mockImplementation(
      async (...args) => {
        const result = await actual(...args);
        if (reads++ === 0)
          h.provider.seedCollection(h.shop, {
            ...remote,
            image: { id: "merchant-image" },
          });
        return result;
      },
    );
    const setImage = vi.spyOn(h.provider.collections, "setImage");
    expect((await h.update()).export.state).toBe("ready");
    expect(setImage).not.toHaveBeenCalled();
    expect((await h.collection()).remote.image).toEqual({
      id: "merchant-image",
    });
  });
  it("rechecks ownership before filling a blank collection image", async () => {
    const h = await setup(true);
    await h.send();
    const { remote } = await h.collection();
    h.provider.seedCollection(h.shop, { ...remote, image: null });
    const actual = h.provider.collections.read.bind(h.provider.collections);
    let reads = 0;
    vi.spyOn(h.provider.collections, "read").mockImplementation(
      async (...args) => {
        const result = await actual(...args);
        if (reads++ === 0)
          h.provider.seedCollection(h.shop, {
            ...remote,
            image: null,
            metafield: { value: "b".repeat(64) },
          });
        return result;
      },
    );
    const setImage = vi.spyOn(h.provider.collections, "setImage");
    await expect(h.update()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(setImage).not.toHaveBeenCalled();
  });
  it("reads an applied image after a lost response without repeating or replacing it", async () => {
    const h = await setup(true);
    await h.send();
    const { remote } = await h.collection();
    h.provider.seedCollection(h.shop, { ...remote, image: null });
    const actual = h.provider.collections.setImage.bind(h.provider.collections);
    const setImage = vi
      .spyOn(h.provider.collections, "setImage")
      .mockImplementationOnce(async (...args) => {
        await actual(...args);
        throw new Error("lost image response");
      });
    await expect(h.update()).rejects.toThrow("lost image response");
    expect((await h.current()).collection!.imageDispatched).toBe(true);
    h.provider.seedCollection(h.shop, {
      ...remote,
      image: { id: "merchant-image" },
    });
    expect((await h.update()).export.state).toBe("ready");
    expect(setImage).toHaveBeenCalledTimes(1);
    expect((await h.current()).collection!.imageDispatched).toBe(false);
    expect((await h.collection()).remote.image).toEqual({
      id: "merchant-image",
    });
  });
  it("does not blindly repeat an unknown image write while the image is still empty", async () => {
    const h = await setup(true);
    await h.send();
    const { remote } = await h.collection();
    h.provider.seedCollection(h.shop, { ...remote, image: null });
    const setImage = vi
      .spyOn(h.provider.collections, "setImage")
      .mockRejectedValueOnce(new Error("unknown image write"));
    await expect(h.update()).rejects.toThrow("unknown image write");
    expect((await h.current()).collection!.imageDispatched).toBe(true);
    expect((await h.update()).export.state).toBe("ready");
    expect(setImage).toHaveBeenCalledTimes(1);
    expect((await h.current()).collection!.imageDispatched).toBe(true);
  });
  it("allows a new explicit attempt after a definite image rejection", async () => {
    const h = await setup(true);
    await h.send();
    const { remote } = await h.collection();
    h.provider.seedCollection(h.shop, { ...remote, image: null });
    const setImage = vi
      .spyOn(h.provider.collections, "setImage")
      .mockResolvedValueOnce(null);
    await expect(h.update()).rejects.toMatchObject({ code: "UPSTREAM_FAILED" });
    expect((await h.current()).collection!.imageDispatched).toBe(false);
    expect((await h.update()).export.state).toBe("ready");
    expect(setImage).toHaveBeenCalledTimes(2);
  });
  it("can fill a later confirmed-empty image after a known successful write", async () => {
    const h = await setup(true);
    await h.send();
    const { remote } = await h.collection();
    h.provider.seedCollection(h.shop, { ...remote, image: null });
    const setImage = vi.spyOn(h.provider.collections, "setImage");
    expect((await h.update()).export.state).toBe("ready");
    expect((await h.current()).collection!.imageDispatched).toBe(false);
    const latest = (await h.collection()).remote;
    h.provider.seedCollection(h.shop, { ...latest, image: null });
    expect((await h.update()).export.state).toBe("ready");
    expect(setImage).toHaveBeenCalledTimes(2);
  });
  it("loads older collection state and keeps updates of exports without a collection compatible", async () => {
    const h = await setup(true);
    await h.send();
    const legacy = structuredClone(await h.current());
    delete (legacy.collection as Partial<NonNullable<typeof legacy.collection>>)
      .imageDispatched;
    expect(InstallationSchema.parse(legacy).collection!.imageDispatched).toBe(
      false,
    );
    await h.ledger.transact((data) => {
      data.installations[0]!.collection = null;
    });
    const create = vi.spyOn(h.provider.collections, "create"),
      setImage = vi.spyOn(h.provider.collections, "setImage");
    expect((await h.update()).export.state).toBe("ready");
    expect(create).not.toHaveBeenCalled();
    expect(setImage).not.toHaveBeenCalled();
  });
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
  it("allows a fresh explicit retry after a definite collection rejection", async () => {
    const h = await setup(),
      create = vi
        .spyOn(h.provider.collections, "create")
        .mockResolvedValueOnce(null);
    await expect(h.send()).rejects.toMatchObject({ code: "UPSTREAM_FAILED" });
    expect((await h.current()).collection!.dispatched).toBe(false);
    expect((await h.send()).export.state).toBe("ready");
    expect(create).toHaveBeenCalledTimes(2);
  });
  it("cleans a rejected-only collection attempt", async () => {
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
