import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { environment, file, MemoryStorage } from "../../../test/workspace";
import * as sampleModule from "../photos/sample";
import type { NamedPhoto } from "../photos/controller";

const environments: ReturnType<typeof environment>[] = [];
afterEach(() => environments.splice(0).forEach((env) => env.dispose()));
function setup() {
  const env = environment();
  environments.push(env);
  return env;
}
function sampleFiles(): NamedPhoto[] {
  return sampleModule.SAMPLE.assets.map((asset) => ({
    name: `${asset.id}.webp`,
    blob: new Blob(
      [readFileSync(new URL(`../../../public${asset.path}`, import.meta.url))],
      { type: asset.image.mime },
    ),
  }));
}

describe("reset and deliberate sample selection", () => {
  it("previews partial/restored samples without grouping or processing and keeps later draft-review choices", async () => {
    vi.spyOn(sampleModule, "loadSample").mockResolvedValue(sampleFiles());
    const env = setup(),
      first = await env.open();
    const interpret = vi.spyOn(env.processor, "interpret");
    await first.photos.add(sampleFiles().slice(0, 16));
    expect(first.getSnapshot().state.photoLinksInitialized).toBe(false);
    first.dispose();
    const restored = await env.open();
    await restored.sample();
    expect(restored.photos.getSnapshot().items).toHaveLength(20);
    expect(restored.getSnapshot().state.photoLinks).toEqual([]);
    expect(restored.getSnapshot().state.photoLinksInitialized).toBe(false);
    expect(restored.getSnapshot().state.draft).toBeNull();
    expect(interpret).not.toHaveBeenCalled();
    await restored.draftCatalogue();
    expect(interpret).toHaveBeenCalledTimes(1);
    expect(restored.getSnapshot().state.draft!.items).toHaveLength(15);
    const grouped = restored
      .getSnapshot()
      .state.draft!.items.find((item) => item.product.imageIds.length > 1)!;
    expect(
      restored.split(grouped.product.id, grouped.product.imageIds[1]!),
    ).toBe(true);
    const reviewedLinks = restored.getSnapshot().state.photoLinks;
    restored.go("choose");
    restored.dispose();
    const chosen = await env.open();
    await chosen.sample();
    expect(chosen.getSnapshot().state.photoLinks).toEqual(reviewedLinks);
    expect(chosen.getSnapshot().state.photoLinksInitialized).toBe(true);
    expect(interpret).toHaveBeenCalledTimes(1);
    await chosen.reset();
    expect(chosen.getSnapshot().state.photoLinksInitialized).toBe(false);
  });
  it("cannot restore a retiring collection when the document closes during cache cleanup", async () => {
    const env = setup(),
      first = await env.open();
    await first.photos.add([file("old garment")]);
    await first.draftCatalogue();
    const identity = first.getSnapshot().state.graph.workspaceId,
      cache = env.caches.get(identity)!;
    let release!: () => void;
    const clear = cache.clear.bind(cache);
    vi.spyOn(cache, "clear").mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          release = () => void clear().then(resolve);
        }),
    );
    env.advance(30_000);
    const resetting = first.reset();
    first.dispose();
    try {
      const restored = await env.open();
      expect(restored.getSnapshot().state.graph.workspaceId).not.toBe(identity);
      expect(restored.getSnapshot().state.draft).toBeNull();
      expect(restored.getSnapshot().state.selectedIds).toEqual([]);
      expect(restored.photos.getSnapshot().items).toEqual([]);
      expect(restored.getSnapshot().state.graph.createdAt).toBe(
        new Date(env.clock()).toISOString(),
      );
      expect(
        Date.parse(restored.getSnapshot().state.graph.expiresAt) - env.clock(),
      ).toBe(7_200_000);
    } finally {
      release();
      await resetting;
    }
  });

  it("reuses the sample without warnings or replacing photos, including a full selection", async () => {
    vi.spyOn(sampleModule, "loadSample").mockResolvedValue(sampleFiles());
    const env = setup(),
      controller = await env.open();
    await controller.sample();
    const ids = controller.getSnapshot().state.selectedIds;
    expect(controller.photos.getSnapshot().links).toEqual([]);
    const chosenLinks = controller.getSnapshot().state.photoLinks;
    await controller.sample();
    expect(controller.getSnapshot().state.selectedIds).toEqual(ids);
    expect(controller.getSnapshot().state.photoLinks).toEqual(chosenLinks);
    expect(controller.photos.getSnapshot().items).toHaveLength(20);
    expect(controller.photos.getSnapshot().issues).toEqual([]);
    expect(
      env.caches.get(controller.getSnapshot().state.graph.workspaceId)!.rows
        .size,
    ).toBe(20);
    await controller.photos.add([sampleFiles()[0]!]);
    expect(
      controller.photos.getSnapshot().issues.map((issue) => issue.message),
    ).toEqual(["These exact photo bytes are already here. Kept one copy."]);
    await controller.photos.add(
      Array.from({ length: 6 }, (_, index) => file(`own garment ${index}`)),
    );
    const fullSelection = controller.getSnapshot().state.selectedIds;
    await controller.sample();
    expect(controller.getSnapshot().state.selectedIds).toEqual(fullSelection);
    expect(controller.photos.getSnapshot().items).toHaveLength(24);
    expect(controller.photos.getSnapshot().issues).toEqual([]);
  });

  it("reuses a cached unselected sample photo and preserves a visitor's own photo", async () => {
    const files = sampleFiles();
    vi.spyOn(sampleModule, "loadSample").mockResolvedValue(files);
    const env = setup(),
      controller = await env.open(),
      [cached] = await controller.photos.add([files[0]!], undefined, false),
      [own] = await controller.photos.add([file("my own garment")]);
    await controller.sample();
    expect(controller.getSnapshot().state.selectedIds).toEqual(
      expect.arrayContaining([cached, own]),
    );
    expect(controller.photos.getSnapshot().items).toHaveLength(21);
    expect(controller.photos.getSnapshot().issues).toEqual([]);
    expect(
      env.caches.get(controller.getSnapshot().state.graph.workspaceId)!.rows
        .size,
    ).toBe(21);
  });

  it("starts clean across three sample, draft, reset and recovery cycles", async () => {
    vi.spyOn(sampleModule, "loadSample").mockResolvedValue(sampleFiles());
    const env = setup();
    let controller = await env.open();
    for (let cycle = 0; cycle < 3; cycle++) {
      const identity = controller.getSnapshot().state.graph.workspaceId;
      await controller.sample();
      expect(controller.photos.getSnapshot().items).toHaveLength(20);
      expect(controller.photos.getSnapshot().issues).toEqual([]);
      expect(controller.getSnapshot().state.photoLinks).toEqual([]);
      await controller.draftCatalogue();
      expect(controller.getSnapshot().state.draft?.items).toHaveLength(15);
      expect(controller.getSnapshot().state.photoLinks).toHaveLength(4);
      controller.publish();
      expect(controller.getSnapshot().state.graph.products).toHaveLength(15);
      await controller.reset();
      expect(controller.getSnapshot().state.graph.workspaceId).not.toBe(
        identity,
      );
      expect(controller.getSnapshot().state.graph.products).toEqual([]);
      expect(controller.getSnapshot().state.draft).toBeNull();
      expect(controller.photos.getSnapshot().items).toEqual([]);
      expect(controller.photos.getSnapshot().issues).toEqual([]);
      expect(controller.getSnapshot().state.photoLinks).toEqual([]);
      expect(env.caches.get(identity)!.rows.size).toBe(0);
      controller.dispose();
      controller = await env.open();
      expect(controller.getSnapshot().state.stage).toBe("choose");
      expect(controller.getSnapshot().state.selectedIds).toEqual([]);
      expect(controller.getSnapshot().missingPhotoIds).toEqual([]);
    }
  });

  it("ignores a retiring sample fetch after a new sample has completed", async () => {
    const files = sampleFiles();
    let release!: (files: NamedPhoto[]) => void, retiredSignal!: AbortSignal;
    vi.spyOn(sampleModule, "loadSample")
      .mockImplementationOnce((signal) => {
        retiredSignal = signal;
        return new Promise((resolve) => {
          release = resolve;
        });
      })
      .mockResolvedValue(files);
    const env = setup(),
      controller = await env.open(),
      retired = controller.sample();
    await controller.reset();
    expect(retiredSignal.aborted).toBe(true);
    await controller.sample();
    const ids = controller.getSnapshot().state.selectedIds;
    release(files);
    await retired;
    expect(controller.getSnapshot().state.selectedIds).toEqual(ids);
    expect(controller.photos.getSnapshot().items).toHaveLength(20);
    expect(controller.photos.getSnapshot().issues).toEqual([]);
    expect(controller.getSnapshot().sampleBusy).toBe(false);
  });

  it("keeps other workspaces and reports failed cleanup without reusing its old photos", async () => {
    vi.spyOn(sampleModule, "loadSample").mockResolvedValue(sampleFiles());
    const env = setup(),
      controller = await env.open(),
      other = await env.open({ storage: new MemoryStorage() });
    await other.photos.add([file("other tab")]);
    await controller.sample();
    const oldIdentity = controller.getSnapshot().state.graph.workspaceId,
      oldCache = env.caches.get(oldIdentity)!;
    vi.spyOn(oldCache, "clear").mockRejectedValue(
      new Error("PRIVATE_CACHE_MARKER"),
    );
    await controller.reset();
    expect(controller.getSnapshot().state.graph.workspaceId).not.toBe(
      oldIdentity,
    );
    expect(controller.getSnapshot().recoveryNotice).toContain(
      "could not be removed",
    );
    expect(controller.getSnapshot().recoveryNotice).not.toContain("PRIVATE_");
    expect(oldCache.rows.size).toBe(20);
    expect(other.photos.getSnapshot().items).toHaveLength(1);
    await controller.sample();
    expect(controller.photos.getSnapshot().items).toHaveLength(20);
    expect(controller.photos.getSnapshot().issues).toEqual([]);
    expect(other.photos.getSnapshot().items).toHaveLength(1);
  });

  it("retains both cleanup warnings when replacement metadata also cannot be saved", async () => {
    const env = setup(),
      controller = await env.open();
    await controller.photos.add([file("old garment")]);
    const oldIdentity = controller.getSnapshot().state.graph.workspaceId;
    vi.spyOn(env.storage, "removeItem").mockImplementation(() => {
      throw new Error("PRIVATE_STORAGE_MARKER");
    });
    vi.spyOn(env.storage, "setItem").mockImplementation(() => {
      throw new Error("PRIVATE_STORAGE_MARKER");
    });
    vi.spyOn(env.caches.get(oldIdentity)!, "clear").mockRejectedValue(
      new Error("PRIVATE_CACHE_MARKER"),
    );
    await controller.reset();
    expect(controller.getSnapshot().ready).toBe(true);
    expect(controller.photos.getSnapshot().items).toEqual([]);
    expect(controller.getSnapshot().state.graph.workspaceId).not.toBe(
      oldIdentity,
    );
    expect(controller.getSnapshot().recoveryNotice).toContain(
      "Saved metadata could not be cleared",
    );
    expect(controller.getSnapshot().recoveryNotice).toContain(
      "Earlier cached bytes could not be removed",
    );
    expect(controller.getSnapshot().recoveryNotice).toContain(
      "Browser storage is unavailable",
    );
    expect(controller.getSnapshot().recoveryNotice).not.toContain("PRIVATE_");
  });

  it("does not treat an unavailable duplicate sample photo as usable provider input", async () => {
    vi.spyOn(sampleModule, "loadSample").mockResolvedValue(sampleFiles());
    const env = setup(),
      interpret = vi.spyOn(env.processor, "interpret"),
      controller = await env.open();
    await controller.sample();
    const id = controller.getSnapshot().state.selectedIds[0]!;
    controller.photos.reportUnavailable(id);
    await controller.sample();
    expect(controller.photos.availableIds().has(id)).toBe(false);
    expect(controller.getSnapshot().missingPhotoIds).toContain(id);
    expect(controller.photos.getSnapshot().issues).toHaveLength(1);
    await controller.draftCatalogue();
    expect(interpret).not.toHaveBeenCalled();
    expect(controller.getSnapshot().state.stage).toBe("choose");
    expect(controller.getSnapshot().state.draft).toBeNull();
  });
});
