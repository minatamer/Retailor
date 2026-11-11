import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ShopifyStatusSchema,
  ShopifyImportResultSchema,
} from "@retailor/contracts/shopify";
import { importCandidate } from "./import-model";
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
          "https://admin.shopify.com/oauth/install?client_id=fixture",
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
    products: vi.fn<ShopifyRequester["products"]>(async () => ({
      schemaVersion: 1 as const,
      products: [],
      nextCursor: null,
      page: 1,
      limited: false,
      currency: "USD",
    })),
    collections: vi.fn<ShopifyRequester["collections"]>(async () => ({
      schemaVersion: 1,
      collections: [],
      nextCursor: null,
      page: 1,
    })),
    importProduct: vi.fn<ShopifyRequester["importProduct"]>(async () => {
      throw new Error("No import fixture");
    }),
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
      state.ended = true;
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
async function childSetup(connected = false, discard = vi.fn()) {
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
    discard,
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
    discard,
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
  it("reads once per catalogue visit, deduplicates visibility/status updates, and leaves onboarding read-free", async () => {
    const h = await childSetup(true);
    h.child.visible(true);
    await h.child.refresh();
    expect(h.port.products).not.toHaveBeenCalled();
    h.child.visible(true, true);
    await vi.waitFor(() =>
      expect(h.child.getSnapshot().catalogue?.page).toBe(1),
    );
    h.child.visible(true, true);
    await h.child.refresh();
    expect(h.port.products).toHaveBeenCalledTimes(1);
    h.child.visible(false);
    expect(h.child.getSnapshot().catalogue).toBeNull();
    h.child.visible(true, true);
    await vi.waitFor(() => expect(h.port.products).toHaveBeenCalledTimes(2));
    expect(h.port.write).not.toHaveBeenCalled();
    expect(h.port.end).not.toHaveBeenCalled();
  });
  it("waits for bootstrap verification when the catalogue is already visible", async () => {
    const h = await childSetup(true);
    h.child.dispose();
    let verified!: (value: typeof h.state) => void;
    h.port.status.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          verified = resolve;
        }),
    );
    const child = new ShopifyController(
      h.context,
      h.port,
      h.changed,
      h.storage,
      h.navigate,
      () => start,
    );
    children.push(child);
    child.visible(true, true);
    const opening = child.initialize();
    await vi.waitFor(() => expect(verified).toBeTypeOf("function"));
    expect(h.port.products).not.toHaveBeenCalled();
    verified(structuredClone(h.state));
    await opening;
    await vi.waitFor(() => expect(h.port.products).toHaveBeenCalledTimes(1));
  });
  it("does not read a disconnected store and starts after visible connection verification", async () => {
    const h = await childSetup();
    h.child.visible(true, true);
    await h.child.refresh();
    expect(h.port.products).not.toHaveBeenCalled();
    Object.assign(h.state, {
      state: "connected",
      shop: "retailor-demo.myshopify.com",
      currency: "USD",
    });
    await h.child.refresh();
    await vi.waitFor(() => expect(h.port.products).toHaveBeenCalledTimes(1));
  });
  it("deduplicates a rapid mount-cleanup-remount and refuses expired auto reads", async () => {
    const h = await childSetup(true);
    h.child.visible(true, true);
    h.child.visible(false);
    h.child.visible(true, true);
    await vi.waitFor(() => expect(h.port.products).toHaveBeenCalledTimes(1));
    h.child.visible(false);
    h.advance(7200001);
    h.child.visible(true, true);
    await Promise.resolve();
    expect(h.port.products).toHaveBeenCalledTimes(1);
  });
  it("fences a late initial read after navigation and loads a fresh first page on re-entry", async () => {
    const h = await childSetup(true);
    let finish!: (
      value: Awaited<ReturnType<ShopifyRequester["products"]>>,
    ) => void;
    h.port.products.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    h.child.visible(true, true);
    await vi.waitFor(() => expect(h.port.products).toHaveBeenCalledTimes(1));
    const firstSignal = h.port.products.mock.calls[0]![3];
    h.child.visible(false);
    expect(firstSignal.aborted).toBe(true);
    h.child.visible(true, true);
    await vi.waitFor(() =>
      expect(h.child.getSnapshot().catalogue?.currency).toBe("USD"),
    );
    finish({
      schemaVersion: 1,
      products: [],
      nextCursor: null,
      page: 2,
      limited: false,
      currency: "EUR",
    });
    await Promise.resolve();
    expect(h.child.getSnapshot().catalogue).toMatchObject({
      page: 1,
      currency: "USD",
    });
    expect(h.port.products).toHaveBeenCalledTimes(2);
  });
  it("does not silently retry a failed initial read on status polls and preserves manual refresh", async () => {
    const h = await childSetup(true);
    h.port.products.mockRejectedValueOnce(new Error("Provider unavailable"));
    vi.useFakeTimers();
    h.child.visible(true, true);
    await vi.advanceTimersByTimeAsync(0);
    expect(h.port.products).toHaveBeenCalledTimes(1);
    expect(h.child.getSnapshot().notice).toContain("could not be read");
    await vi.advanceTimersByTimeAsync(90000);
    expect(h.port.products).toHaveBeenCalledTimes(1);
    await h.child.browse();
    expect(h.port.products).toHaveBeenCalledTimes(2);
  });
  it("keeps pagination explicit after the automatic first page", async () => {
    const h = await childSetup(true);
    h.port.products.mockResolvedValueOnce({
      schemaVersion: 1,
      products: [],
      nextCursor: "next_page",
      page: 1,
      limited: false,
      currency: "USD",
    });
    h.child.visible(true, true);
    await vi.waitFor(() =>
      expect(h.child.getSnapshot().catalogue?.nextCursor).toBe("next_page"),
    );
    expect(h.port.products).toHaveBeenCalledTimes(1);
    await h.child.browse(true);
    expect(h.port.products).toHaveBeenLastCalledWith(
      "workspace",
      "next_page",
      proof,
      expect.any(AbortSignal),
    );
    expect(h.port.products).toHaveBeenCalledTimes(2);
  });
  it("dismisses failed simulated consent so feedback and Skip remain reachable", async () => {
    const h = await childSetup();
    await h.child.connect("onboarding", async () => true);
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
    const connecting = child.connect("onboarding", async () => true);
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
    await h.child.connect("onboarding", async () => true);
    expect(h.child.getSnapshot().consent).toBe(true);
    expect(h.port.write).not.toHaveBeenCalled();
    await h.child.consent(false);
    expect(h.child.getSnapshot().status?.state).toBe("disconnected");
    await h.child.connect("onboarding", async () => true);
    await h.child.consent(true);
    expect(h.child.getSnapshot().status?.state).toBe("connected");
    expect(h.port.write).not.toHaveBeenCalled();
    expect(h.navigate).not.toHaveBeenCalled();
  });
  it("blocks native departure when storage/photos cannot safely resume", async () => {
    const h = await childSetup();
    h.state.simulated = false;
    await h.child.refresh();
    await h.child.connect("connections", async () => false);
    expect(h.port.connect).not.toHaveBeenCalled();
    expect(h.navigate).not.toHaveBeenCalled();
    expect(h.child.getSnapshot().notice).toContain("cannot safely resume");
  });
  it("opens Shopify's picker after saving recovery, without sending a store address", async () => {
    const h = await childSetup();
    h.state.simulated = false;
    await h.child.refresh();
    const save = vi.fn(async () => true);
    await h.child.connect("connections", save);
    expect(save).toHaveBeenCalledTimes(1);
    expect(h.port.connect).toHaveBeenCalledWith(
      { schemaVersion: 1, workspaceId: "workspace", returnTo: "connections" },
      proof,
      expect.any(AbortSignal),
    );
    expect(h.navigate).toHaveBeenCalledWith(
      "https://admin.shopify.com/oauth/install?client_id=fixture",
    );
    expect(h.port.write).not.toHaveBeenCalled();
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
  it("shows the acknowledged ended state, checks removal promptly and stops after confirmed cleanup", async () => {
    const h = await childSetup(true);
    vi.useFakeTimers();
    h.child.visible(true);
    await h.child.disconnect();
    expect(h.child.getSnapshot()).toMatchObject({
      verified: true,
      status: { ended: true, state: "cleanup_pending" },
      notice: "",
    });
    await vi.advanceTimersByTimeAsync(4999);
    expect(h.port.status).toHaveBeenCalledTimes(1);
    h.state.state = "cleaned";
    await vi.advanceTimersByTimeAsync(1);
    expect(h.child.getSnapshot()).toMatchObject({
      verified: true,
      status: { ended: true, state: "cleaned" },
      notice: "",
    });
    expect(h.port.status).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(90000 * 20);
    expect(h.port.status).toHaveBeenCalledTimes(2);
  });
  it("keeps removal polling bounded, slows after six initial checks and cancels when hidden", async () => {
    const h = await childSetup(true);
    vi.useFakeTimers();
    h.child.visible(true);
    await h.child.disconnect();
    await vi.advanceTimersByTimeAsync(30000);
    expect(h.port.status).toHaveBeenCalledTimes(7);
    await vi.advanceTimersByTimeAsync(89999);
    expect(h.port.status).toHaveBeenCalledTimes(7);
    await vi.advanceTimersByTimeAsync(1 + 90000 * 20);
    expect(h.port.status).toHaveBeenCalledTimes(13);
    h.child.visible(false);
    await vi.advanceTimersByTimeAsync(90000);
    expect(h.port.status).toHaveBeenCalledTimes(13);
  });
  it("does not claim an acknowledged disconnect when the request fails, and can verify the real outcome", async () => {
    const h = await childSetup(true);
    h.port.end.mockRejectedValueOnce(new Error("lost disconnect response"));
    await h.child.disconnect();
    expect(h.child.getSnapshot()).toMatchObject({
      verified: false,
      status: { ended: false, state: "checking_outcome" },
      notice: expect.stringContaining("not confirmed"),
    });
    await h.child.refresh();
    expect(h.child.getSnapshot()).toMatchObject({
      verified: true,
      status: { ended: false, state: "connected" },
    });
  });
  it("honors Retry-After during removal and never turns a failed check into cleanup completion", async () => {
    const h = await childSetup(true);
    vi.useFakeTimers();
    h.child.visible(true);
    await h.child.disconnect();
    h.port.status.mockRejectedValueOnce(
      new ApiRequestError("BUSY", "req_check", 20000),
    );
    h.advance(5000);
    await vi.advanceTimersByTimeAsync(5000);
    expect(h.child.getSnapshot()).toMatchObject({
      verified: false,
      status: { ended: true, state: "cleanup_pending" },
      notice: expect.stringContaining("could not be checked"),
    });
    expect(h.port.status).toHaveBeenCalledTimes(2);
    h.advance(19999);
    await vi.advanceTimersByTimeAsync(19999);
    expect(h.port.status).toHaveBeenCalledTimes(2);
    h.advance(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(h.port.status).toHaveBeenCalledTimes(3);
    expect(h.child.getSnapshot()).toMatchObject({
      verified: true,
      status: { ended: true, state: "cleanup_pending" },
      notice: "",
    });
    h.child.visible(false);
    await vi.advanceTimersByTimeAsync(90000);
    expect(h.port.status).toHaveBeenCalledTimes(3);
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
  it("still ends the old workspace on reset without a global banner when Shopify acknowledgement fails", async () => {
    const env = environment();
    environments.push(env);
    const { port } = requests(env.clock),
      c = await env.open({ shopifyRequest: port });
    await vi.waitFor(() => expect(c.getSnapshot().shopify.verified).toBe(true));
    const oldWorkspace = c.getSnapshot().state.graph.workspaceId;
    port.end.mockRejectedValueOnce(new Error("PRIVATE_END_MARKER"));
    await c.reset();
    expect(port.end).toHaveBeenCalledTimes(1);
    expect(port.end).toHaveBeenCalledWith(
      oldWorkspace,
      false,
      proof,
      expect.any(AbortSignal),
    );
    expect(c.getSnapshot().ready).toBe(true);
    expect(c.getSnapshot().state.graph.workspaceId).not.toBe(oldWorkspace);
    expect(c.getSnapshot().recoveryNotice).toBe("");
  });
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
    await c.connectShopify();
    await c.simulateShopify(true);
    c.continueFromConnection();
    c.go("dashboard");
    c.ownerNavigate("connections");
    const graph = c.getSnapshot().state.graph;
    c.shopifyVisible(true, true);
    await vi.waitFor(() =>
      expect(c.getSnapshot().shopify.catalogue?.page).toBe(1),
    );
    expect(port.products).toHaveBeenCalledTimes(1);
    expect(c.getSnapshot().state.graph).toBe(graph);
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

function importSource(id = "gid://shopify/Product/123") {
  const bytes = Buffer.from("shopify-import-photo");
  return ShopifyImportResultSchema.parse({
    schemaVersion: 1,
    currency: "USD",
    product: {
      id,
      title: "Imported cotton tee",
      description: "Cotton from Shopify.",
      productType: "tees",
      status: "ACTIVE",
      owned: false,
      variantsTruncated: false,
      mediaTruncated: false,
      images: [{ url: "https://cdn.shopify.com/test.webp", alt: null }],
      variants: [
        {
          id: "gid://shopify/ProductVariant/456",
          title: "Ivory / S",
          price: "29.99",
          sku: `IMPORTED-${id.split("/").at(-1)}`,
          options: [
            { name: "Color", value: "Ivory" },
            { name: "Size", value: "S" },
          ],
        },
      ],
    },
    photos: [
      {
        image: {
          id: "incoming",
          mime: "image/webp",
          hash: "c".repeat(64),
          width: 100,
          height: 125,
          bytes: bytes.length,
        },
        base64: bytes.toString("base64"),
      },
    ],
  });
}
describe("collection import controller", () => {
  it("excludes gift cards from mixed and gift-only browse pages, refresh and collection changes without hidden requests", async () => {
    const h = await childSetup(true),
      clothing = {
        ...importSource().product,
        title: "Gift Cardigan",
        giftCard: false,
      },
      legacy = importSource("gid://shopify/Product/124").product,
      gift = {
        ...importSource("gid://shopify/Product/900").product,
        title: "Gift Card",
        giftCard: true,
      };
    h.port.products
      .mockResolvedValueOnce({
        schemaVersion: 1,
        products: [gift, clothing, legacy],
        nextCursor: "second_page",
        page: 1,
        limited: false,
        currency: "USD",
      })
      .mockResolvedValueOnce({
        schemaVersion: 1,
        products: [gift],
        nextCursor: "third_page",
        page: 2,
        limited: false,
        currency: "USD",
      })
      .mockResolvedValueOnce({
        schemaVersion: 1,
        products: [{ ...clothing, giftCard: true }],
        nextCursor: null,
        page: 3,
        limited: true,
        currency: "USD",
      });
    await h.child.browse();
    expect(h.child.getSnapshot().catalogue?.products).toEqual([
      clothing,
      legacy,
    ]);
    expect(h.port.products).toHaveBeenCalledTimes(1);
    await h.child.browse(true);
    expect(h.child.getSnapshot().catalogue).toMatchObject({
      products: [clothing, legacy],
      page: 2,
      nextCursor: "third_page",
      limited: false,
    });
    expect(h.port.products).toHaveBeenCalledTimes(2);
    await h.child.browse(true);
    expect(h.child.getSnapshot().catalogue).toMatchObject({
      products: [legacy],
      page: 3,
      nextCursor: null,
      limited: true,
    });
    expect(h.port.products).toHaveBeenCalledTimes(3);
    h.port.products.mockResolvedValueOnce({
      schemaVersion: 1,
      products: [gift],
      nextCursor: "gift_only_next",
      page: 1,
      limited: false,
      currency: "USD",
    });
    await h.child.browse();
    expect(h.child.getSnapshot().catalogue).toMatchObject({
      products: [],
      nextCursor: "gift_only_next",
      page: 1,
    });
    expect(h.port.products).toHaveBeenCalledTimes(4);
    h.port.products.mockResolvedValueOnce({
      schemaVersion: 1,
      products: [gift, clothing],
      nextCursor: null,
      page: 1,
      limited: false,
      currency: "USD",
    });
    await h.child.chooseCollection("gid://shopify/Collection/12");
    expect(h.child.getSnapshot().catalogue?.products).toEqual([clothing]);
    expect(h.port.products).toHaveBeenLastCalledWith(
      "workspace",
      null,
      proof,
      expect.any(AbortSignal),
      "gid://shopify/Collection/12",
    );
    expect(h.port.products).toHaveBeenCalledTimes(5);
    expect(h.port.importProduct).not.toHaveBeenCalled();
    expect(h.port.write).not.toHaveBeenCalled();
  });
  it("aborts a pending commit and releases its review photos on cancellation", async () => {
    const h = await childSetup(true);
    h.port.importProduct.mockResolvedValue(importSource());
    const candidate = importCandidate(importSource().product, "imported", [
      "photo",
    ]);
    await h.child.prepareImport(
      [importSource().product.id],
      async () => candidate,
      5,
    );
    let finish!: () => void;
    let committing: AbortSignal | undefined;
    const pending = h.child.confirmImport(
      async (_products, _revision, signal) => {
        committing = signal;
        await new Promise<void>((resolve) => {
          finish = resolve;
        });
      },
    );
    await vi.waitFor(() => expect(committing).toBeDefined());
    h.child.cancelImport();
    expect(committing!.aborted).toBe(true);
    finish();
    await pending;
    expect(h.child.getSnapshot().importReview).toBeNull();
    expect(h.child.getSnapshot().busy).toBeNull();
    expect(h.child.getSnapshot().notice).not.toContain("Imported");
    expect(h.discard).toHaveBeenCalledWith([candidate]);
  });
  it("uses the selected collection, loads collection choices once, and separates preparation from explicit commit", async () => {
    const h = await childSetup(true);
    await h.child.chooseCollection("gid://shopify/Collection/12");
    expect(h.port.products.mock.calls[0]![4]).toBe(
      "gid://shopify/Collection/12",
    );
    expect(h.port.collections).toHaveBeenCalledTimes(1);
    h.port.importProduct.mockResolvedValue(importSource());
    const candidate = importCandidate(importSource().product, "imported", [
        "photo",
      ]),
      stage = vi.fn(async () => candidate),
      commit = vi.fn(async () => {});
    await h.child.prepareImport([importSource().product.id], stage, 5);
    expect(h.child.getSnapshot().importReview?.products).toEqual([candidate]);
    expect(h.port.write).not.toHaveBeenCalled();
    expect(commit).not.toHaveBeenCalled();
    await h.child.confirmImport(commit);
    expect(commit).toHaveBeenCalledTimes(1);
    expect(h.child.getSnapshot().importReview).toBeNull();
  });
  it("releases a prepared partial batch after failure and rejects a batch exceeding available capacity before HTTP", async () => {
    const h = await childSetup(true);
    h.port.importProduct
      .mockResolvedValueOnce(importSource())
      .mockRejectedValueOnce(new Error("private marker"));
    const candidate = importCandidate(importSource().product, "imported", [
      "photo",
    ]);
    await h.child.prepareImport(
      [importSource().product.id, "gid://shopify/Product/124"],
      async () => candidate,
      5,
    );
    expect(h.child.getSnapshot().importReview).toBeNull();
    expect(h.discard).toHaveBeenCalledWith([candidate]);
    expect(h.child.getSnapshot().notice).not.toContain("private marker");
    h.port.importProduct.mockClear();
    await h.child.prepareImport(
      [importSource().product.id],
      async () => candidate,
      0,
    );
    expect(h.port.importProduct).not.toHaveBeenCalled();
  });
  it("fences a late preparation after cancellation and a review after expiry", async () => {
    const h = await childSetup(true);
    let finish!: (value: ReturnType<typeof importSource>) => void;
    h.port.importProduct.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const candidate = importCandidate(importSource().product, "imported", [
        "photo",
      ]),
      stage = vi.fn(async () => candidate);
    const pending = h.child.prepareImport(
      [importSource().product.id],
      stage,
      5,
    );
    await vi.waitFor(() => expect(finish).toBeTypeOf("function"));
    h.child.cancelImport();
    finish(importSource());
    await pending;
    expect(stage).not.toHaveBeenCalled();
    expect(h.child.getSnapshot().importReview).toBeNull();
    await h.child.refresh();
    h.port.importProduct.mockResolvedValue(importSource());
    await h.child.prepareImport([importSource().product.id], stage, 5);
    h.advance(7200001);
    const commit = vi.fn(async () => {});
    await h.child.confirmImport(commit);
    expect(commit).not.toHaveBeenCalled();
  });
});
async function importSession() {
  const env = environment();
  environments.push(env);
  const { port, state } = requests(env.clock);
  Object.assign(state, {
    state: "connected",
    shop: "test.myshopify.com",
    currency: "USD",
    name: "Test store",
  });
  port.importProduct.mockResolvedValue(importSource());
  const c = await env.open({ shopifyRequest: port });
  await vi.waitFor(() => expect(c.getSnapshot().shopify.verified).toBe(true));
  await c.photos.add([file("original")]);
  await c.draftCatalogue();
  c.publish();
  c.useCurrentLook();
  c.keepWordmark();
  c.acceptDesign();
  c.continueFromConnection();
  c.finishTour();
  c.go("dashboard");
  c.ownerNavigate("connections");
  return { env, port, c };
}
describe("atomic import into the actual session", () => {
  it("rolls back the whole batch when a later product violates commerce rules", async () => {
    const { c, port } = await importSession(),
      before = c.getSnapshot().state.graph;
    const second = importSource("gid://shopify/Product/124");
    second.product.variants.push({
      ...second.product.variants[0]!,
      id: "gid://shopify/ProductVariant/457",
      sku: "DUPLICATE-OPTIONS",
    });
    port.importProduct
      .mockResolvedValueOnce(importSource())
      .mockResolvedValueOnce(second);
    await c.prepareShopifyImport([
      importSource().product.id,
      second.product.id,
    ]);
    expect(c.getSnapshot().shopify.importReview?.products).toHaveLength(2);
    await c.confirmShopifyImport(4, true, {});
    expect(c.getSnapshot().state.graph).toBe(before);
    expect(c.getSnapshot().shopify.importReview).not.toBeNull();
    c.cancelShopifyImport();
  });

  it("preserves current products and activity, imports photos and exact prices, and rejects duplicate imports", async () => {
    const { c, port } = await importSession(),
      before = c.getSnapshot().state.graph;
    await c.prepareShopifyImport([importSource().product.id]);
    expect(c.getSnapshot().state.graph).toBe(before);
    expect(c.getSnapshot().shopify.importReview?.products).toHaveLength(1);
    await c.confirmShopifyImport(4, true, {});
    const graph = c.getSnapshot().state.graph;
    expect(graph.products).toHaveLength(before.products.length + 1);
    const added = graph.products.at(-1)!;
    expect(added).toMatchObject({
      title: "Imported cotton tee",
      description: "Cotton from Shopify.",
      variants: [{ price: 2999, openingStock: 4, unitCost: 0 }],
    });
    expect(c.photos.availableIds().has(added.imageIds[0]!)).toBe(true);
    expect(graph.orders).toEqual(before.orders);
    expect(graph.products[0]).toEqual(before.products[0]);
    expect(port.write).not.toHaveBeenCalled();
    await c.prepareShopifyImport([importSource().product.id]);
    expect(c.getSnapshot().shopify.importReview).toBeNull();
    expect(c.getSnapshot().state.graph).toBe(graph);
  });
  it("discards uncommitted photos on Cancel and refuses confirmation without clothing review", async () => {
    const { c } = await importSession(),
      before = c.getSnapshot().state.graph,
      photos = c.photos.availableIds();
    await c.prepareShopifyImport([importSource().product.id]);
    expect(c.photos.availableIds().size).toBeGreaterThan(photos.size);
    await c.confirmShopifyImport(4, false, {});
    expect(c.getSnapshot().state.graph).toBe(before);
    c.cancelShopifyImport();
    await vi.waitFor(() => expect(c.photos.availableIds()).toEqual(photos));
    expect(c.getSnapshot().state.graph).toBe(before);
  });
});
