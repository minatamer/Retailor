import { afterEach, describe, expect, it, vi } from "vitest";
import { ShopifyStatusSchema } from "@retailor/contracts/shopify";
import type { ShopifyExportSummary } from "@retailor/contracts/shopify";
import { ProductSchema } from "@retailor/contracts/product";
import { ShopifyController, SHOPIFY_TAB_KEY } from "./controller";
import type { ShopifyRequester } from "./request";
import { environment, MemoryStorage, file } from "../../../test/workspace";
import { SESSION_KEY } from "../session/projection";
import { ApiRequestError } from "../../http/api-error";

const proof = "a".repeat(64),
  start = Date.parse("2026-10-11T18:00:00Z");
const product = ProductSchema.parse({
  id: "tee",
  title: "Ivory tee",
  description: "Cotton tee",
  category: "tees",
  imageIds: ["photo_a"],
  variants: [
    {
      id: "small",
      colour: "Ivory",
      size: "S",
      sku: "TEE-S",
      price: 2900,
      unitCost: 1000,
      openingStock: 5,
      openedAt: new Date(start).toISOString(),
      archived: false,
    },
  ],
  sizingSystemId: "alpha-demo",
  attributes: [],
  archived: false,
});
function requests(now = () => start) {
  const state = ShopifyStatusSchema.parse({
    schemaVersion: 1,
    available: true,
    simulated: true,
    state: "disconnected",
    shop: null,
    name: null,
    currency: null,
    expiresAt: now() + 7200000,
    productCount: 0,
    exports: [],
  });
  const port = {
    available: vi.fn(async () => true),
    session: vi.fn(
      async (input: Parameters<ShopifyRequester["session"]>[0]) => ({
        schemaVersion: 1 as const,
        tabProof: proof,
        expiresAt: input.createdAt + 7200000,
      }),
    ),
    status: vi.fn(async () => structuredClone(state)),
    connect: vi.fn(async () => {
      state.state = "authorizing";
      return {
        schemaVersion: 1 as const,
        authorizationUrl:
          "https://retailor-demo.myshopify.com/admin/oauth/authorize?state=private-state",
      };
    }),
    simulate: vi.fn(async (_workspace: string, approved: boolean) => {
      Object.assign(state, {
        state: approved ? "connected" : "disconnected",
        shop: approved ? "retailor-demo.myshopify.com" : null,
        name: approved ? "Simulated Shopify store" : null,
        currency: approved ? "USD" : null,
      });
      return {
        schemaVersion: 1 as const,
        outcome: approved ? ("connected" as const) : ("cancelled" as const),
        returnTo: "onboarding" as const,
      };
    }),
    products: vi.fn(async () => ({
      schemaVersion: 1 as const,
      products: [],
      nextCursor: null,
      page: 1,
      limited: false,
      currency: "USD",
    })),
    write: vi.fn(async (input: Parameters<ShopifyRequester["write"]>[0]) => {
      const entry: ShopifyExportSummary = {
        id: String(state.exports.length + 1).repeat(64),
        sourceProductId: input.product.id,
        revision: input.revision,
        state: "ready",
        remoteId: `gid://shopify/Product/${state.exports.length + 1}`,
        handle: "retailor-demo-owned",
      };
      state.exports.push(entry);
      state.productCount++;
      state.createIntents++;
      return { schemaVersion: 1 as const, export: entry };
    }),
    check: vi.fn(async (_workspace: string, id: string) => ({
      schemaVersion: 1 as const,
      export: state.exports.find((item) => item.id === id)!,
    })),
    remove: vi.fn(async () => structuredClone(state)),
    end: vi.fn(async () => {
      state.state = "cleanup_pending";
      return structuredClone(state);
    }),
  } satisfies ShopifyRequester;
  return { port, state };
}
const children: ShopifyController[] = [],
  environments: ReturnType<typeof environment>[] = [];
afterEach(() => {
  children.splice(0).forEach((child) => child.dispose());
  environments.splice(0).forEach((env) => env.dispose());
  vi.useRealTimers();
});
async function childSetup(connected = false) {
  let now = start,
    revision = 1;
  const storage = new MemoryStorage(),
    { port, state } = requests(() => now),
    changed = vi.fn(),
    navigate = vi.fn();
  if (connected)
    Object.assign(state, {
      state: "connected",
      shop: "retailor-demo.myshopify.com",
      currency: "USD",
      name: "Simulated store",
    });
  const context = {
    workspaceId: "workspace",
    createdAt: start,
    expiresAt: start + 7200000,
    revision: () => revision,
  };
  const child = new ShopifyController(
    context,
    port,
    changed,
    storage,
    navigate,
    () => now,
  );
  children.push(child);
  await child.initialize();
  return {
    child,
    storage,
    port,
    state,
    changed,
    navigate,
    context,
    advance: (ms: number) => {
      now += ms;
    },
    revise: () => {
      revision++;
    },
  };
}
const inputFor = async (value = product, revision = 1) => ({
  schemaVersion: 1 as const,
  workspaceId: "workspace",
  revision,
  product: value,
  photos: [
    {
      image: {
        id: "photo_a",
        hash: "b".repeat(64),
        mime: "image/webp" as const,
        width: 1,
        height: 1,
        bytes: 3,
      },
      base64: "YWJj",
    },
  ],
});

describe("bounded session-owned Shopify child", () => {
  it("dismisses failed simulated consent so feedback and Skip remain reachable", async () => {
    const h = await childSetup();
    await h.child.connect(
      "retailor-demo.myshopify.com",
      "onboarding",
      async () => true,
    );
    h.port.simulate.mockRejectedValueOnce(new ApiRequestError("FORBIDDEN"));
    await h.child.consent(true);
    expect(h.child.getSnapshot().consent).toBe(false);
    expect(h.child.getSnapshot().notice).toContain("could not be confirmed");
    expect(h.child.getSnapshot().verified).toBe(false);
  });
  it("requires verification before another reviewed write after rejected access", async () => {
    const h = await childSetup(true);
    h.port.products.mockRejectedValueOnce(new ApiRequestError("FORBIDDEN"));
    await h.child.browse();
    h.child.prepare([product], false);
    expect(h.child.getSnapshot().verified).toBe(false);
    expect(h.child.getSnapshot().review).toBeNull();
  });
  it("finishes the original bootstrap after Skip but does not run a queued connection", async () => {
    const { port } = requests();
    let available!: (value: boolean) => void;
    port.available.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          available = resolve;
        }),
    );
    const child = new ShopifyController(
      {
        workspaceId: "workspace",
        createdAt: start,
        expiresAt: start + 7200000,
        revision: () => 1,
      },
      port,
      vi.fn(),
      new MemoryStorage(),
      vi.fn(),
      () => start,
    );
    children.push(child);
    child.visible(true);
    const initializing = child.initialize();
    const connecting = child.connect(
      "retailor-demo.myshopify.com",
      "onboarding",
      async () => true,
    );
    child.visible(false);
    available(true);
    await initializing;
    await connecting;
    expect(child.getSnapshot().verified).toBe(true);
    expect(port.session).toHaveBeenCalledTimes(1);
    expect(port.connect).not.toHaveBeenCalled();
  });
  it("retains an original stored proof for a reset request even when availability is now off", async () => {
    const h = await childSetup();
    h.child.dispose();
    h.port.end.mockClear();
    h.port.available.mockResolvedValue(false);
    const child = new ShopifyController(
      h.context,
      h.port,
      h.changed,
      h.storage,
      h.navigate,
      () => start,
    );
    children.push(child);
    await child.initialize();
    await child.endAndDetach();
    expect(h.port.end).toHaveBeenCalledWith(
      "workspace",
      false,
      proof,
      expect.any(AbortSignal),
    );
  });
  it("keeps proof outside projections, requires fresh consent, and creates nothing on connect", async () => {
    const h = await childSetup();
    expect(JSON.parse(h.storage.getItem(SHOPIFY_TAB_KEY)!).proof).toBe(proof);
    expect(JSON.stringify(h.child.getSnapshot())).not.toContain(proof);
    await h.child.connect(
      "retailor-demo.myshopify.com",
      "onboarding",
      async () => true,
    );
    expect(h.child.getSnapshot().consent).toBe(true);
    expect(h.port.write).not.toHaveBeenCalled();
    await h.child.consent(false);
    expect(h.child.getSnapshot().status?.state).toBe("disconnected");
    await h.child.connect(
      "retailor-demo.myshopify.com",
      "onboarding",
      async () => true,
    );
    await h.child.consent(true);
    expect(h.child.getSnapshot().status?.state).toBe("connected");
    expect(h.port.write).not.toHaveBeenCalled();
    expect(h.navigate).not.toHaveBeenCalled();
  });
  it("blocks native departure when storage/photos cannot safely resume", async () => {
    const h = await childSetup();
    h.state.simulated = false;
    await h.child.refresh();
    await h.child.connect(
      "retailor-demo.myshopify.com",
      "connections",
      async () => false,
    );
    expect(h.port.connect).not.toHaveBeenCalled();
    expect(h.navigate).not.toHaveBeenCalled();
    expect(h.child.getSnapshot().notice).toContain("cannot safely resume");
  });
  it("freezes review, deduplicates confirmation, and fences a write after navigation", async () => {
    const h = await childSetup(true);
    h.child.prepare([product], false);
    let finish!: (
      result: Awaited<ReturnType<ShopifyRequester["write"]>>,
    ) => void;
    h.port.write.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const first = h.child.confirm(inputFor),
      second = h.child.confirm(inputFor);
    await vi.waitFor(() => expect(h.port.write).toHaveBeenCalledTimes(1));
    h.child.visible(true);
    h.child.visible(false);
    finish({
      schemaVersion: 1,
      export: {
        id: "1".repeat(64),
        sourceProductId: product.id,
        revision: 1,
        state: "ready",
        remoteId: "gid://shopify/Product/1",
        handle: "owned",
      },
    });
    await Promise.all([first, second]);
    expect(h.child.getSnapshot().status?.exports).toEqual([]);
    expect(h.child.getSnapshot().review).toBeNull();
  });
  it("invalidates changed reviews even when parent notifications reenter the child", async () => {
    const h = await childSetup(true);
    h.changed.mockImplementation(() => h.child.invalidate());
    h.child.prepare([product], false);
    h.revise();
    h.child.invalidate();
    expect(h.child.getSnapshot().review).toBeNull();
    expect(h.port.write).not.toHaveBeenCalled();
    expect(h.child.getSnapshot().notice).toContain("changed");
  });
  it("bounds reset independently of a transport that ignores abort and clears its tab key", async () => {
    const h = await childSetup(true);
    vi.useFakeTimers();
    h.port.end.mockImplementationOnce(() => new Promise(() => {}));
    const ending = h.child.endAndDetach();
    await vi.advanceTimersByTimeAsync(1000);
    expect(await ending).toBe(false);
    expect(h.storage.getItem(SHOPIFY_TAB_KEY)).toBeNull();
  });
  it("polls only the visible screen at bounded intervals and stops after twelve polls", async () => {
    const h = await childSetup(true);
    vi.useFakeTimers();
    h.child.visible(true);
    await vi.advanceTimersByTimeAsync(89999);
    expect(h.port.status).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(h.port.status).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(90000 * 20);
    expect(h.port.status).toHaveBeenCalledTimes(13);
    h.child.visible(false);
    await vi.advanceTimersByTimeAsync(90000);
    expect(h.port.status).toHaveBeenCalledTimes(13);
  });
  it("does not mint a new seal for an older or copied unsealed workspace", async () => {
    const h = await childSetup();
    h.child.dispose();
    h.storage.removeItem(SHOPIFY_TAB_KEY);
    h.advance(31000);
    h.port.session.mockClear();
    const restored = new ShopifyController(
      h.context,
      h.port,
      h.changed,
      h.storage,
      h.navigate,
      () => start + 31000,
    );
    children.push(restored);
    await restored.initialize();
    expect(h.port.session).not.toHaveBeenCalled();
    expect(restored.getSnapshot().verified).toBe(false);
    expect(restored.getSnapshot().notice).toContain("fresh demo");
  });
});

describe("real session integration", () => {
  it("shows the optional step before tour, keeps Skip free of integration actions, and does not repeat on Personalize", async () => {
    const env = environment();
    environments.push(env);
    const { port } = requests(env.clock),
      c = await env.open({ shopifyRequest: port });
    await c.photos.add([file("one")]);
    await c.draftCatalogue();
    c.publish();
    c.useCurrentLook();
    c.keepWordmark();
    c.acceptDesign();
    expect(c.getSnapshot().state.stage).toBe("connect");
    expect(c.getSnapshot().tour).toBeNull();
    expect(c.getSnapshot().state.hasAcceptedLook).toBe(true);
    c.continueFromConnection();
    expect(c.getSnapshot().state.stage).toBe("storefront");
    expect(c.getSnapshot().tour?.index).toBe(4);
    expect(port.connect).not.toHaveBeenCalled();
    expect(port.write).not.toHaveBeenCalled();
    c.finishTour();
    c.go("style");
    c.acceptDesign();
    expect(c.getSnapshot().state.stage).toBe("storefront");
    expect(c.getSnapshot().tour).toBeNull();
  });
  it("connects, reviews exact current photos, writes only explicitly, and restores authority separately", async () => {
    const env = environment();
    environments.push(env);
    const { port } = requests(env.clock),
      c = await env.open({ shopifyRequest: port });
    await vi.waitFor(() => expect(c.getSnapshot().shopify.verified).toBe(true));
    await c.photos.add([file("one")]);
    await c.draftCatalogue();
    c.publish();
    c.useCurrentLook();
    c.keepWordmark();
    c.acceptDesign();
    await c.connectShopify("retailor-demo.myshopify.com");
    await c.simulateShopify(true);
    c.continueFromConnection();
    c.go("dashboard");
    c.ownerNavigate("connections");
    const graph = c.getSnapshot().state.graph;
    c.reviewShopify([graph.products[0]!.id]);
    expect(port.write).not.toHaveBeenCalled();
    await c.confirmShopify();
    expect(port.write).toHaveBeenCalledTimes(1);
    expect(port.write.mock.calls[0]![0].photos).toHaveLength(1);
    expect(c.getSnapshot().state.graph).toBe(graph);
    expect(env.storage.getItem(SESSION_KEY)).not.toContain(proof);
    c.dispose();
    const originalStatus = port.status.getMockImplementation()!;
    let verify!: (
      value: Awaited<ReturnType<ShopifyRequester["status"]>>,
    ) => void;
    port.status.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          verify = resolve;
        }),
    );
    const resumed = await env.open({ shopifyRequest: port });
    expect(resumed.getSnapshot().shopify.verified).toBe(false);
    await vi.waitFor(() => expect(verify).toBeTypeOf("function"));
    verify(await originalStatus());
    await vi.waitFor(() =>
      expect(resumed.getSnapshot().shopify.verified).toBe(true),
    );
    expect(port.session).toHaveBeenCalledTimes(1);
    expect(port.write).toHaveBeenCalledTimes(1);
  });
});
