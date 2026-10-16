import { afterEach, describe, expect, it, vi } from "vitest";
import {
  environment,
  file,
  MemoryCache,
  MemoryStorage,
} from "../../../test/workspace";
import { CacheConflict } from "../photos/cache";
import { PhotoController } from "../photos/controller";
import {
  SESSION_KEY,
  restoreProjection,
  serializeProjection,
} from "./projection";
import type { CatalogueProcessor } from "./controller";
import { developmentDraft } from "../catalogue/development-fixture";
import { ApiRequestError } from "../../http/api-error";
const environments: ReturnType<typeof environment>[] = [];
afterEach(() => environments.splice(0).forEach((env) => env.dispose()));
const setup = () => {
  const env = environment();
  environments.push(env);
  return env;
};
describe("single workspace ownership and safe recovery", () => {
  it("clears an earlier catalogue failure during a deliberate retry and retains a new failure", async () => {
    const env = setup();
    let rejectRetry!: (error: Error) => void;
    const interpret = vi
      .fn<CatalogueProcessor["interpret"]>()
      .mockRejectedValueOnce(new ApiRequestError("FORBIDDEN"))
      .mockImplementationOnce(
        () =>
          new Promise((_resolve, reject) => {
            rejectRetry = reject;
          }),
      );
    const controller = await env.open({
      processor: { mode: "development-fixture", interpret },
    });
    await controller.photos.add([file("one")]);
    const selected = controller.getSnapshot().state.selectedIds;
    await controller.draftCatalogue();
    expect(controller.getSnapshot().state.stage).toBe("choose");
    expect(controller.getSnapshot().notice).toContain("valid approval");
    const pending = controller.draftCatalogue();
    expect(controller.getSnapshot().state.stage).toBe("process");
    expect(controller.getSnapshot().notice).toBe("");
    expect(interpret).toHaveBeenCalledTimes(2);
    rejectRetry(new ApiRequestError("UNAVAILABLE"));
    await pending;
    expect(controller.getSnapshot().state.stage).toBe("choose");
    expect(controller.getSnapshot().notice).toContain("unavailable");
    expect(controller.getSnapshot().notice).not.toContain("valid approval");
    expect(controller.getSnapshot().state.selectedIds).toEqual(selected);
    expect(interpret).toHaveBeenCalledTimes(2);
  });
  it("ignores a retiring exact-photo repair after reset, including its final notification", async () => {
    const env = setup(),
      controller = await env.open();
    await controller.photos.add([file("one")]);
    const expected = controller.getSnapshot().state.photos[0]!;
    controller.photos.reportUnavailable(expected.id);
    let finish!: () => void;
    vi.spyOn(controller.photos, "repair").mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const pending = controller.repair(expected.id, file("one"));
    await controller.reset();
    const identity = controller.getSnapshot().state.graph.workspaceId,
      changed = vi.fn();
    const unlisten = controller.subscribe(changed);
    finish();
    await pending;
    expect(changed).not.toHaveBeenCalled();
    expect(controller.getSnapshot().state.graph.workspaceId).toBe(identity);
    expect(controller.getSnapshot().missingPhotoIds).toEqual([]);
    unlisten();
  });
  it("opens the owner garment-review/add-photo path without replacing current commerce", async () => {
    const env = setup(),
      controller = await env.open();
    await controller.photos.add([file("one")]);
    await controller.draftCatalogue();
    controller.publish();
    controller.useCurrentLook();
    controller.keepWordmark();
    controller.acceptDesign();
    controller.go("dashboard");
    const graph = controller.getSnapshot().state.graph;
    controller.go("catalogue");
    expect(controller.getSnapshot().state.stage).toBe("catalogue");
    controller.go("choose");
    expect(controller.getSnapshot().state.stage).toBe("choose");
    expect(controller.getSnapshot().state.graph).toBe(graph);
    expect(controller.getSnapshot().state.draft?.items).toHaveLength(1);
  });
  it("preserves product, variant and filters through every look and same-tab recovery without touching commerce", async () => {
    const env = setup(),
      controller = await env.open();
    await controller.photos.add([file("one"), file("two")]);
    await controller.draftCatalogue();
    controller.publish();
    const state = controller.getSnapshot().state,
      product = state.graph.products[0]!;
    controller.browse({
      page: "product",
      productId: product.id,
      variantId: product.variants[1]!.id,
      filters: {
        ...state.browse.filters,
        category: "jeans",
        search: "Straight",
      },
      sort: "price-high",
    });
    const browse = controller.getSnapshot().state.browse;
    for (const template of ["studio", "pulse", "gallery"] as const) {
      controller.design({
        ...state.previewDesign,
        template,
        theme: "cobalt",
        typography: "modern",
      });
      expect(controller.getSnapshot().state.browse).toEqual(browse);
      expect(controller.getSnapshot().state.graph).toBe(state.graph);
    }
    controller.useCurrentLook();
    controller.keepWordmark();
    controller.acceptDesign();
    controller.go("dashboard");
    controller.go("storefront");
    const restored = await env.open();
    expect(restored.getSnapshot().state.browse).toEqual(browse);
    expect(restored.getSnapshot().state.graph).toEqual(state.graph);
    restored.browse({ variantId: state.graph.products[1]!.variants[0]!.id });
    expect(restored.getSnapshot().state.browse).toEqual(browse);
    restored.photos.reportUnavailable(product.imageIds[0]!);
    expect(restored.getSnapshot().state.stage).toBe("storefront");
    expect(restored.getSnapshot().missingPhotoIds).toContain(
      product.imageIds[0],
    );
    expect(restored.photos.availableIds().has(product.imageIds[0]!)).toBe(
      false,
    );
    await restored.repair(product.imageIds[0]!, file("one"));
    expect(restored.getSnapshot().missingPhotoIds).toEqual([]);
    expect(restored.getSnapshot().state.graph).toEqual(state.graph);
  });
  it("processes and publishes a full fifteen-photo collection using the batch and per-product envelopes", async () => {
    const env = setup(),
      controller = await env.open();
    await controller.photos.add(
      Array.from({ length: 15 }, (_, index) => file(`photo-${index}`)),
    );
    await controller.draftCatalogue();
    expect(controller.getSnapshot().state.stage).toBe("catalogue");
    expect(controller.getSnapshot().state.draft!.items).toHaveLength(15);
    controller.publish();
    expect(controller.getSnapshot().state.stage).toBe("style");
    expect(controller.getSnapshot().state.graph.products).toHaveLength(15);
  });
  it("preserves an edited completed draft when going back to unchanged inputs", async () => {
    const env = setup(),
      controller = await env.open();
    await controller.photos.add([file("one")]);
    await controller.draftCatalogue();
    const draft = controller.getSnapshot().state.draft!;
    controller.go("choose");
    controller.go("catalogue");
    expect(controller.getSnapshot().state.stage).toBe("catalogue");
    expect(controller.getSnapshot().state.draft).toBe(draft);
  });
  it("retries a finishing navigation release without forking and aborts pending ownership cleanly", async () => {
    const env = setup(),
      first = await env.open();
    await first.photos.add([file("one")]);
    const state = first.getSnapshot().state;
    class FinishingCache extends MemoryCache {
      attempts = 0;
      override async heartbeat() {
        if (++this.attempts === 1) throw new CacheConflict();
      }
    }
    const finishing = new FinishingCache();
    const next = await env.open({ cache: () => finishing });
    expect(next.getSnapshot().state.graph.workspaceId).toBe(
      state.graph.workspaceId,
    );
    expect(finishing.attempts).toBeGreaterThan(1);
    const signal = new AbortController();
    signal.abort();
    const cacheFactory = vi.fn(() => new MemoryCache());
    const closed = await env.open({
      signal: signal.signal,
      cache: cacheFactory,
    });
    expect(closed.getSnapshot().ready).toBe(false);
    expect(cacheFactory).not.toHaveBeenCalled();
  });
  it("publishes only available photo-backed garments, edits locally and changes perspectives without reseeding", async () => {
    const env = setup(),
      controller = await env.open();
    await controller.photos.add([file("one"), file("two")]);
    await controller.draftCatalogue();
    expect(controller.getSnapshot().state.stage).toBe("catalogue");
    const item = controller.getSnapshot().state.draft!.items[0]!;
    controller.edit(item.product.id, {
      ...item.product,
      title: "My own garment",
    });
    controller.publish();
    expect(controller.getSnapshot().state.stage).toBe("style");
    expect(controller.getSnapshot().state.graph.products[0]!.title).toBe(
      "My own garment",
    );
    const graph = controller.getSnapshot().state.graph;
    controller.useCurrentLook();
    controller.keepWordmark();
    controller.acceptDesign();
    controller.go("dashboard");
    controller.go("storefront");
    expect(controller.getSnapshot().state.graph).toBe(graph);
    expect(controller.getSnapshot().state.stage).toBe("storefront");
    const restored = await env.open();
    expect(restored.getSnapshot().state.stage).toBe("storefront");
    expect(restored.getSnapshot().state.graph).toEqual(graph);
    expect(restored.getSnapshot().missingPhotoIds).toEqual([]);
  });
  it("keeps saved catalogue metadata after cache loss and repairs only the exact original identity", async () => {
    const env = setup(),
      first = await env.open();
    await first.photos.add([file("original")]);
    await first.draftCatalogue();
    first.publish();
    const photo = first.getSnapshot().state.photos[0]!,
      graph = first.getSnapshot().state.graph;
    first.dispose();
    env.caches.get(graph.workspaceId)!.rows.clear();
    const restored = await env.open();
    expect(restored.getSnapshot().state.graph).toEqual(graph);
    expect(restored.getSnapshot().missingPhotoIds).toEqual([photo.id]);
    await restored.repair(photo.id, file("different"));
    expect(restored.getSnapshot().missingPhotoIds).toEqual([photo.id]);
    await restored.repair(photo.id, file("original"));
    expect(restored.getSnapshot().missingPhotoIds).toEqual([]);
    expect(restored.getSnapshot().state.graph).toEqual(graph);
    expect(restored.photos.view(photo.id)).toBeDefined();
  });
  it("refuses atomic publication when a included garment loses bytes", async () => {
    const env = setup(),
      controller = await env.open();
    await controller.photos.add([file("one")]);
    await controller.draftCatalogue();
    const graph = controller.getSnapshot().state.graph;
    vi.spyOn(controller.photos, "availableIds").mockReturnValue(new Set());
    controller.publish();
    expect(controller.getSnapshot().state.stage).toBe("catalogue");
    expect(controller.getSnapshot().state.graph).toBe(graph);
  });
  it("fences processing replies after reset and never resubmits interrupted work on restore", async () => {
    const env = setup();
    let release: (() => void) | undefined,
      calls = 0;
    const processor: CatalogueProcessor = {
      mode: "development-fixture",
      async interpret(input) {
        calls++;
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return developmentDraft(
          input.photos,
          input.operationId,
          input.inputRevision,
          env.id,
        );
      },
    };
    const controller = await env.open({ processor });
    await controller.photos.add([file("one")]);
    const pending = controller.draftCatalogue();
    expect(controller.getSnapshot().state.stage).toBe("process");
    const saved = env.storage.getItem(SESSION_KEY)!;
    await controller.reset();
    const replacementId = controller.getSnapshot().state.graph.workspaceId;
    release!();
    await pending;
    expect(controller.getSnapshot().state.graph.workspaceId).toBe(
      replacementId,
    );
    expect(controller.getSnapshot().state.stage).toBe("choose");
    env.storage.setItem(SESSION_KEY, saved);
    const restored = await env.open({ processor });
    expect(restored.getSnapshot().state.stage).toBe("choose");
    expect(restored.getSnapshot().notice).toContain("interrupted");
    expect(calls).toBe(1);
  });
  it("starts an independent workspace on a live duplicate-tab lease without clearing the original", async () => {
    const env = setup(),
      first = await env.open();
    await first.photos.add([file("one")]);
    const identity = first.getSnapshot().state.graph.workspaceId;
    class ConflictCache extends MemoryCache {
      override async heartbeat() {
        throw new CacheConflict();
      }
      override async clear() {
        throw new Error("Must not clear another owner");
      }
    }
    const duplicated = await env.open({
      cache: (workspace) =>
        workspace === identity ? new ConflictCache() : new MemoryCache(),
    });
    expect(duplicated.getSnapshot().state.graph.workspaceId).not.toBe(identity);
    expect(duplicated.getSnapshot().recoveryNotice).toContain("Another tab");
    expect(first.photos.availableIds().size).toBe(1);
  });
  it("does not subscribe or become ready after disposal during asynchronous photo recovery", async () => {
    const env = setup(),
      first = await env.open();
    await first.photos.add([file("one")]);
    first.dispose();
    let begin!: () => void,
      finish!: () => void,
      subscriptions = 0;
    const started = new Promise<void>((resolve) => {
        begin = resolve;
      }),
      waiting = new Promise<void>((resolve) => {
        finish = resolve;
      }),
      abort = new AbortController();
    const pending = env.open({
      signal: abort.signal,
      photos: (cache, expires) => {
        const child = new PhotoController({ cache, expires, clock: env.clock });
        vi.spyOn(child, "recover").mockImplementation(async () => {
          begin();
          await waiting;
        });
        const subscribe = child.subscribe;
        child.subscribe = (listener) => {
          subscriptions++;
          return subscribe(listener);
        };
        return child;
      },
    });
    await started;
    abort.abort();
    finish();
    const closed = await pending;
    expect(closed.getSnapshot().ready).toBe(false);
    expect(subscriptions).toBe(0);
  });
  it("keeps in-memory work usable when normalized storage is denied", async () => {
    const env = setup();
    class DeniedStorage extends MemoryStorage {
      override setItem() {
        throw new Error("Quota");
      }
    }
    const controller = await env.open({ storage: new DeniedStorage() });
    await controller.photos.add([file("one")]);
    await controller.draftCatalogue();
    controller.publish();
    expect(controller.getSnapshot().state.stage).toBe("style");
    expect(controller.getSnapshot().recoveryNotice).toContain("memory");
  });
  it("enforces a fixed lifetime and rejects future, corrupt and development projections in public mode", async () => {
    const env = setup(),
      controller = await env.open();
    await controller.photos.add([file("one")]);
    const state = controller.getSnapshot().state,
      encoded = serializeProjection(state, env.clock());
    expect(encoded).not.toMatch(
      /blob:|original|grant|token|signal|controller|base64/iu,
    );
    expect(() =>
      restoreProjection(JSON.parse(encoded), env.clock(), false),
    ).toThrow();
    expect(() =>
      restoreProjection(
        { ...JSON.parse(encoded), secret: "extra" },
        env.clock(),
        true,
      ),
    ).toThrow();
    expect(() =>
      restoreProjection(
        { ...JSON.parse(encoded), schemaVersion: 2 },
        env.clock(),
        true,
      ),
    ).toThrow();
    expect(() =>
      restoreProjection(
        {
          ...JSON.parse(encoded),
          graph: { ...state.graph, expiresAt: "2026-10-12T18:00:00.000Z" },
        },
        env.clock(),
        true,
      ),
    ).toThrow();
    expect(() =>
      restoreProjection(
        { ...JSON.parse(encoded), savedAt: "2026-10-12T00:00:00.000Z" },
        env.clock(),
        true,
      ),
    ).toThrow();
    env.advance(7_200_000);
    expect(() =>
      restoreProjection(JSON.parse(encoded), env.clock(), true),
    ).toThrow();
    controller.checkExpiry();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(controller.getSnapshot().state.graph.workspaceId).not.toBe(
      state.graph.workspaceId,
    );
    expect(controller.getSnapshot().state.graph.expiresAt).not.toBe(
      state.graph.expiresAt,
    );
    expect(controller.getSnapshot().notice).toContain("expired");
  });
  it("cannot resolve a development processor in public composition and preserves chosen photos", async () => {
    const env = setup(),
      controller = await env.open({ fixtureAllowed: false });
    await controller.photos.add([file("one")]);
    await controller.draftCatalogue();
    expect(controller.getSnapshot().state.stage).toBe("choose");
    expect(controller.getSnapshot().state.draft).toBeNull();
    expect(controller.photos.availableIds().size).toBe(1);
    expect(controller.getSnapshot().notice).toContain("unavailable");
  });
});
