import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { BrowserPhotoCache, CacheConflict } from "./cache";
import type { StoredPhoto } from "./cache";
import { PHOTO_LIMITS } from "@retailor/contracts/photos";
import type { StoredLogo } from "./cache";
function logos(prefix: string, bytes = 10): StoredLogo[] {
  return [1, 2, 3].map((index) => ({
    metadata: {
      id: `${prefix}_${index}`,
      hash: String(index).repeat(64),
      mime: "image/png",
      bytes,
      width: 10,
      height: 10,
      context: {
        name: "West",
        theme: "ink",
        typography: "inter",
        designRevision: 1,
        themeConfirmed: true,
        typographyConfirmed: true,
      },
      generatedAt: "2026-10-12T18:00:00.000Z",
      mode: "fake",
    },
    blob: new Blob([new Uint8Array(bytes)], { type: "image/png" }),
  }));
}
it("separates logo rows, atomically replaces three candidates, and clears only owned assets", async () => {
  const first = cache("first_workspace", "owner"),
    second = cache("second_workspace", "owner");
  await first.put(row("garment"));
  await first.putLogos(logos("first"));
  await second.putLogos(logos("second"));
  expect((await first.read()).photos.map((row) => row.photo.id)).toEqual([
    "garment",
  ]);
  await expect(first.putLogos(logos("partial").slice(0, 2))).rejects.toThrow(
    "three",
  );
  expect((await first.readLogos()).map((row) => row.metadata.id)).toEqual([
    "first_1",
    "first_2",
    "first_3",
  ]);
  await first.putLogos(logos("replacement"));
  expect((await first.readLogos()).map((row) => row.metadata.id)).toEqual([
    "replacement_1",
    "replacement_2",
    "replacement_3",
  ]);
  await first.clear();
  expect(await first.readLogos()).toEqual([]);
  expect((await second.readLogos()).map((row) => row.metadata.id)).toEqual([
    "second_1",
    "second_2",
    "second_3",
  ]);
});
it("includes logos in the shared 80-MiB origin envelope", async () => {
  const first = cache("first_workspace", "owner"),
    second = cache("second_workspace", "owner");
  for (let i = 0; i < 10; i++)
    await first.put(
      row(`first_${i}`, PHOTO_LIMITS.original, PHOTO_LIMITS.derivative),
    );
  for (let i = 0; i < 6; i++)
    await second.put(
      row(`second_${i}`, PHOTO_LIMITS.original, PHOTO_LIMITS.derivative),
    );
  await first.putLogos(logos("first", 1048576));
  await expect(second.putLogos(logos("second", 1048576))).rejects.toThrow(
    "full",
  );
  expect(await second.readLogos()).toEqual([]);
  expect(await first.readLogos()).toHaveLength(3);
});
const caches: BrowserPhotoCache[] = [];
async function alterCache(change: (tx: IDBTransaction) => Promise<void>) {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const opening = indexedDB.open("retailor-photos-v1");
    opening.onsuccess = () => resolve(opening.result);
    opening.onerror = () => reject(new Error("open"));
  });
  const tx = db.transaction(["photos", "workspaces"], "readwrite");
  const done = new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = tx.onabort = () => reject(new Error("transaction"));
  });
  await change(tx);
  await done;
  db.close();
}
it("preserves valid rows on corruption and refuses understated write counters", async () => {
  const owned = cache("workspace", "owner");
  await owned.put(row("good"));
  await owned.put(row("bad"));
  await alterCache(async (tx) => {
    tx.objectStore("photos").put({
      ...row("bad"),
      key: "workspace:bad",
      workspace: "workspace",
      original: new Blob(["lost"]),
    });
  });
  const recovered = await owned.read();
  expect(recovered.photos.map((photo) => photo.photo.id)).toEqual(["good"]);
  expect(recovered.missingIds).toEqual(["bad"]);
  await expect(owned.put(row("new"))).rejects.toThrow("Unavailable");
  await owned.clear();
  await owned.put(row("valid"));
  await alterCache(async (tx) => {
    const entry = await new Promise<unknown>((resolve) => {
      const get = tx.objectStore("workspaces").get("workspace");
      get.onsuccess = () => resolve(get.result);
    });
    if (!entry || typeof entry !== "object") throw new Error("No lease");
    tx.objectStore("workspaces").put({ ...entry, originals: 0 });
  });
  await expect(owned.put(row("extra"))).rejects.toThrow("counters");
  await expect(owned.remove("valid")).rejects.toThrow("counters");
});
beforeEach(() => {
  vi.stubGlobal("indexedDB", new IDBFactory());
  vi.stubGlobal("navigator", {});
});
afterEach(async () => {
  for (const cache of caches.splice(0)) await cache.close();
  vi.unstubAllGlobals();
});
function cache(
  workspace: string,
  owner: string,
  expires = 100_000,
  clock: () => number = () => 1000,
) {
  const value = new BrowserPhotoCache(workspace, owner, expires, clock);
  caches.push(value);
  return value;
}
function row(id: string, originalBytes = 10, derivativeBytes = 8): StoredPhoto {
  return {
    name: `${id}.jpg`,
    original: new Blob([new Uint8Array(originalBytes)]),
    derivative: new Blob([new Uint8Array(derivativeBytes)]),
    photo: {
      id,
      source: {
        id,
        hash: "a".repeat(64),
        mime: "image/jpeg",
        width: 10,
        height: 10,
        bytes: originalBytes,
      },
      derivative: {
        id,
        hash: "b".repeat(64),
        mime: "image/webp",
        width: 10,
        height: 10,
        bytes: derivativeBytes,
      },
    },
  };
}
it("atomically refuses a second writer and fences the old owner after lease takeover", async () => {
  let now = 1000;
  const first = cache("workspace", "first", 100_000, () => now);
  const second = cache("workspace", "second", 100_000, () => now);
  await first.put(row("one"));
  await expect(second.put(row("two"))).rejects.toBeInstanceOf(CacheConflict);
  now = 22_000;
  await second.put(row("two"));
  await expect(first.clear()).rejects.toBeInstanceOf(CacheConflict);
  await expect(first.heartbeat()).rejects.toBeInstanceOf(CacheConflict);
  expect((await second.read()).photos.map((item) => item.photo.id)).toEqual([
    "one",
    "two",
  ]);
});
it("removes only this workspace's bytes and preserves unrelated active workspaces", async () => {
  const first = cache("first_workspace", "owner"),
    second = cache("second_workspace", "owner");
  await first.put(row("one"));
  await second.put(row("two"));
  await first.clear();
  expect((await first.read()).photos).toEqual([]);
  expect((await second.read()).photos[0]?.photo.id).toBe("two");
});
it("queues ownership release immediately and prevents a closed runtime from renewing its lease", async () => {
  const first = cache("reload_workspace", "first"),
    second = cache("reload_workspace", "next_document");
  await first.put(row("retained"));
  const closing = first.close();
  await expect(first.heartbeat()).rejects.toThrow("closed");
  await second.heartbeat();
  await closing;
  expect((await second.read()).photos[0]?.photo.id).toBe("retained");
  await first.close();
  expect((await second.read()).photos).toHaveLength(1);
});
it("uses document locks to exclude a live duplicate and restore after a crashed document without waiting for TTL", async () => {
  const held = new Map<string, object>();
  let crash: (() => void) | undefined;
  vi.stubGlobal("navigator", {
    locks: {
      async request(
        name: string,
        _options: unknown,
        run: (lock: unknown) => Promise<void>,
      ) {
        if (held.has(name)) return run(null);
        const identity = {};
        held.set(name, identity);
        crash = () => held.delete(name);
        try {
          await run({ name });
        } finally {
          if (held.get(name) === identity) held.delete(name);
        }
      },
    },
  });
  const original = cache("locked_workspace", "first"),
    next = cache("locked_workspace", "next");
  await original.put(row("retained"));
  await expect(next.heartbeat()).rejects.toBeInstanceOf(CacheConflict);
  crash!();
  await next.heartbeat();
  expect((await next.read()).photos[0]?.photo.id).toBe("retained");
  await expect(original.clear()).rejects.toBeInstanceOf(CacheConflict);
  await original.close();
  expect((await next.read()).photos).toHaveLength(1);
  await expect(
    cache("locked_workspace", "third").heartbeat(),
  ).rejects.toBeInstanceOf(CacheConflict);
});
it("enforces original, count and origin budgets atomically", async () => {
  const first = cache("first_workspace", "owner"),
    second = cache("second_workspace", "owner");
  for (let i = 0; i < 10; i++)
    await first.put(
      row(`first_${i}`, PHOTO_LIMITS.original, PHOTO_LIMITS.derivative),
    );
  await expect(
    first.put(row("too_many_bytes", PHOTO_LIMITS.original)),
  ).rejects.toThrow("full");
  for (let i = 0; i < 6; i++)
    await second.put(
      row(`second_${i}`, PHOTO_LIMITS.original, PHOTO_LIMITS.derivative),
    );
  await expect(
    second.put(
      row("origin_overflow", PHOTO_LIMITS.original, PHOTO_LIMITS.derivative),
    ),
  ).rejects.toThrow("full");
  expect((await second.read()).photos).toHaveLength(6);
  const third = cache("third_workspace", "owner");
  for (let i = 0; i < 32; i++) await third.put(row(`small_${i}`));
  await expect(third.put(row("extra"))).rejects.toThrow("full");
});
it("sweeps expired owned data before allocating new cache bytes", async () => {
  let now = 1000;
  const old = cache("old_workspace", "owner", 2000, () => now);
  await old.put(row("old_photo"));
  now = 3000;
  const current = cache("new_workspace", "owner", 100_000, () => now);
  await current.put(row("new_photo"));
  await expect(old.read()).rejects.toThrow("expired");
  expect((await current.read()).photos[0]?.photo.id).toBe("new_photo");
});
