import { afterEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { PhotoController } from "./controller";
import { CacheConflict } from "./cache";
import type { PhotoCache, StoredPhoto } from "./cache";
import type { DecodeTask, PhotoDecoder, ProcessedPhoto } from "./decode";
import { PHOTO_LIMITS } from "@retailor/contracts/photos";
class MemoryCache implements PhotoCache {
  rows = new Map<string, StoredPhoto>();
  async put(row: StoredPhoto) {
    this.rows.set(row.photo.id, row);
  }
  async read() {
    return { photos: [...this.rows.values()], missingIds: [] };
  }
  async remove(id: string) {
    this.rows.delete(id);
  }
  async clear() {
    this.rows.clear();
  }
  async heartbeat() {}
  async close() {}
}
async function processed(task: DecodeTask): Promise<ProcessedPhoto> {
  if (task.existing) return task.existing;
  const content = Buffer.from(await task.original.arrayBuffer());
  const hash = createHash("sha256").update(content).digest("hex");
  const derivative = new Blob([hash], { type: "image/webp" });
  return {
    original: task.original,
    derivative,
    photo: {
      id: task.id,
      source: {
        id: task.id,
        hash,
        mime: "image/jpeg",
        width: 100,
        height: 200,
        bytes: task.original.size,
      },
      derivative: {
        id: task.id,
        hash: createHash("sha256")
          .update(Buffer.from(await derivative.arrayBuffer()))
          .digest("hex"),
        mime: "image/webp",
        width: 100,
        height: 200,
        bytes: derivative.size,
      },
    },
  };
}
const controllers: PhotoController[] = [];
afterEach(() => {
  for (const controller of controllers.splice(0)) controller.dispose();
  vi.useRealTimers();
});
function setup(
  decode: PhotoDecoder = processed,
  cache: PhotoCache = new MemoryCache(),
) {
  const revoked: string[] = [],
    created: string[] = [];
  let next = 0;
  const controller = new PhotoController({
    cache,
    expires: Date.now() + 7_200_000,
    decode,
    id: () => `photo_${++next}`,
    urls: {
      create: () => {
        const url = `blob:test-${created.length + 1}`;
        created.push(url);
        return url;
      },
      revoke: (url) => {
        revoked.push(url);
      },
    },
  });
  controller.activate();
  controllers.push(controller);
  return { controller, cache, created, revoked };
}
const named = (value: string) => ({
  name: `${value}.jpg`,
  blob: new Blob([value], { type: "image/jpeg" }),
});
describe("linked photo organization", () => {
  it("links, reorders and replaces photos without copying resources, and prunes links on remove/reset", async () => {
    const decode = vi.fn(processed),
      { controller, created, revoked } = setup(decode);
    await controller.add([named("front"), named("back"), named("side")]);
    const ids = controller.getSnapshot().items.map((item) => item.photo.id);
    expect(controller.link(ids)).toBe(true);
    expect(controller.getSnapshot().links).toEqual([ids]);
    controller.cover(ids[1]!);
    controller.moveLinked(ids[2]!, -1);
    expect(controller.getSnapshot().links).toEqual([[ids[1], ids[2], ids[0]]]);
    expect(decode).toHaveBeenCalledTimes(3);
    expect(created).toHaveLength(3);
    expect(revoked).toEqual([]);
    await controller.add([named("replacement")], ids[1]);
    expect(controller.getSnapshot().links[0]![0]).toBe(ids[1]);
    controller.unlink(ids[2]!);
    expect(controller.getSnapshot().links).toEqual([[ids[1], ids[0]]]);
    await controller.remove(ids[0]!);
    expect(controller.getSnapshot().links).toEqual([]);
    expect(controller.link([ids[1]!, ids[2]!])).toBe(true);
    await controller.reset();
    expect(controller.getSnapshot().links).toEqual([]);
    expect(created).toHaveLength(revoked.length);
  });
  it("refuses unavailable, repeated or excessive members without invalidating accepted input", async () => {
    const { controller } = setup();
    await controller.add(
      Array.from({ length: 9 }, (_, index) => named(`angle${index}`)),
    );
    const ids = controller.getSnapshot().items.map((item) => item.photo.id),
      revision = controller.getSnapshot().revision;
    for (const invalid of [[ids[0]!, ids[0]!], [ids[0]!, "missing"], ids])
      expect(controller.link(invalid)).toBe(false);
    controller.unlink("missing");
    controller.cover("missing");
    expect(controller.getSnapshot().revision).toBe(revision);
    expect(controller.link(ids.slice(0, 8))).toBe(true);
    expect(controller.link([ids[0]!, ids[8]!])).toBe(false);
    expect(controller.getSnapshot().links).toEqual([ids.slice(0, 8)]);
    controller.reportUnavailable(ids[0]!);
    expect(controller.link([ids[0]!, ids[8]!])).toBe(false);
  });
});
describe("owned photo selection and partial recovery", () => {
  it("keeps accepted photos while hiding unknown decoder diagnostics", async () => {
    const decode: PhotoDecoder = async (task) => {
      if ((await task.original.text()) === "bad")
        throw new TypeError("PRIVATE_MARKER worker detail");
      return processed(task);
    };
    const { controller, revoked } = setup(decode);
    await controller.add([named("good")]);
    const prior = controller.getSnapshot().items[0]!;
    await controller.add([named("bad")]);
    expect(controller.getSnapshot().items).toEqual([prior]);
    expect(controller.getSnapshot().issues[0]?.message).toBe(
      "Unable to read this photo.",
    );
    expect(JSON.stringify(controller.getSnapshot())).not.toContain(
      "PRIVATE_MARKER",
    );
    expect(revoked).toEqual([]);
  });
  it("overlaps cached verification while restoring only ordered current rows", async () => {
    const cache = new MemoryCache(),
      seed = setup(processed, cache).controller;
    await seed.add([named("one"), named("two"), named("three")]);
    const expected = seed.descriptors();
    seed.dispose();
    const jobs: { task: DecodeTask; resolve(value: ProcessedPhoto): void }[] =
      [];
    const { controller } = setup(
      (task) =>
        new Promise((resolve) => {
          jobs.push({ task, resolve });
        }),
      cache,
    );
    const recovery = controller.recover(
      expected.map((photo) => photo.id),
      expected,
    );
    await vi.waitFor(() => expect(jobs).toHaveLength(2));
    jobs[1]!.resolve(await processed(jobs[1]!.task));
    await Promise.resolve();
    expect(controller.availableIds().size).toBe(0);
    expect(jobs).toHaveLength(2);
    jobs[0]!.resolve(await processed(jobs[0]!.task));
    await vi.waitFor(() => expect(jobs).toHaveLength(3));
    expect([...controller.availableIds()]).toEqual(["photo_1", "photo_2"]);
    jobs[2]!.resolve(await processed(jobs[2]!.task));
    await recovery;
    expect(controller.getSnapshot().items.map((item) => item.name)).toEqual([
      "one.jpg",
      "two.jpg",
      "three.jpg",
    ]);
    expect(controller.getSnapshot().notice).toContain(
      "No processing request was repeated",
    );
  });
  it("overlaps two decodes, commits reversed completions in selection order and does not buffer queued photos", async () => {
    const jobs: {
      task: DecodeTask;
      signal: AbortSignal;
      resolve(value: ProcessedPhoto): void;
    }[] = [];
    const decode: PhotoDecoder = (task, signal) =>
      new Promise((resolve) => {
        jobs.push({ task, signal, resolve });
      });
    const { controller } = setup(decode),
      pending = controller.add([named("one"), named("two"), named("three")]);
    await vi.waitFor(() => expect(jobs).toHaveLength(2));
    jobs[1]!.resolve(await processed(jobs[1]!.task));
    await Promise.resolve();
    expect(controller.getSnapshot().items).toEqual([]);
    expect(jobs).toHaveLength(2);
    jobs[0]!.resolve(await processed(jobs[0]!.task));
    await vi.waitFor(() => expect(jobs).toHaveLength(3));
    expect(controller.getSnapshot().items.map((item) => item.name)).toEqual([
      "one.jpg",
      "two.jpg",
    ]);
    jobs[2]!.resolve(await processed(jobs[2]!.task));
    await pending;
    expect(controller.getSnapshot().items.map((item) => item.name)).toEqual([
      "one.jpg",
      "two.jpg",
      "three.jpg",
    ]);
    expect(controller.getSnapshot()).toMatchObject({
      progress: 3,
      total: 3,
      busy: false,
    });
  });
  it("preserves the first duplicate identity even when the later duplicate finishes first", async () => {
    const jobs: { task: DecodeTask; resolve(value: ProcessedPhoto): void }[] =
      [];
    const { controller, created } = setup(
      (task) =>
        new Promise((resolve) => {
          jobs.push({ task, resolve });
        }),
    );
    const pending = controller.add([named("same"), named("same")]);
    await vi.waitFor(() => expect(jobs).toHaveLength(2));
    jobs[1]!.resolve(await processed(jobs[1]!.task));
    jobs[0]!.resolve(await processed(jobs[0]!.task));
    expect(await pending).toEqual(["photo_1", "photo_1"]);
    expect(controller.getSnapshot().items.map((item) => item.photo.id)).toEqual(
      ["photo_1"],
    );
    expect(created).toHaveLength(1);
  });
  it("cancels all pending slots, retains a committed photo and never starts queued work", async () => {
    const jobs: {
      task: DecodeTask;
      signal: AbortSignal;
      resolve(value: ProcessedPhoto): void;
    }[] = [];
    const { controller, created, cache } = setup(
      (task, signal) =>
        new Promise((resolve) => {
          jobs.push({ task, signal, resolve });
        }),
    );
    const pending = controller.add([
      named("one"),
      named("two"),
      named("three"),
      named("four"),
      named("five"),
    ]);
    await vi.waitFor(() => expect(jobs).toHaveLength(2));
    jobs[0]!.resolve(await processed(jobs[0]!.task));
    await vi.waitFor(() => expect(jobs).toHaveLength(3));
    controller.cancel();
    expect(jobs.slice(1).every((job) => job.signal.aborted)).toBe(true);
    for (const job of jobs.slice(1)) job.resolve(await processed(job.task));
    expect(await pending).toEqual([]);
    expect(jobs).toHaveLength(3);
    expect(created).toHaveLength(1);
    expect(controller.getSnapshot().items.map((item) => item.name)).toEqual([
      "one.jpg",
    ]);
    expect((await cache.read()).photos).toHaveLength(1);
  });
  it("waits for a failed source reservation before decoding the later photo that fits the exact remaining original budget", async () => {
    let seeding = true;
    const jobs: {
      task: DecodeTask;
      resolve(value: ProcessedPhoto): void;
      reject(error: Error): void;
    }[] = [];
    const { controller } = setup((task) =>
      seeding
        ? processed(task)
        : new Promise((resolve, reject) => {
            jobs.push({ task, resolve, reject });
          }),
    );
    const large = (size: number, index: number) => ({
      name: `fill_${index}.jpg`,
      blob: new Blob([new Uint8Array(size - 1), String(index)]),
    });
    await controller.add(
      Array.from({ length: 10 }, (_, index) =>
        large(index === 9 ? 2 * 1024 * 1024 : PHOTO_LIMITS.original, index),
      ),
    );
    expect(
      controller
        .descriptors()
        .reduce((sum, photo) => sum + photo.source.bytes, 0),
    ).toBe(38 * 1024 * 1024);
    seeding = false;
    const pending = controller.add([
      large(2 * 1024 * 1024, 1),
      large(2 * 1024 * 1024, 2),
    ]);
    await vi.waitFor(() => expect(jobs).toHaveLength(1));
    jobs[0]!.reject(new Error("Invalid source pixels"));
    await vi.waitFor(() => expect(jobs).toHaveLength(2));
    jobs[1]!.resolve(await processed(jobs[1]!.task));
    await pending;
    expect(
      controller
        .descriptors()
        .reduce((sum, photo) => sum + photo.source.bytes, 0),
    ).toBe(PHOTO_LIMITS.originals);
    expect(
      controller.getSnapshot().issues.map((issue) => issue.message),
    ).toEqual(["Unable to read this photo."]);
  });
  it("reports failed reset cleanup honestly and ignores late remove notices", async () => {
    const cache = new MemoryCache(),
      first = setup(processed, cache).controller;
    await first.add([named("one")]);
    cache.clear = async () => {
      throw new Error("Storage denied");
    };
    await first.reset();
    expect(first.getSnapshot().notice).toContain(
      "storage cleanup is unavailable",
    );
    expect((await cache.read()).photos).toHaveLength(1);
    const secondCache = new MemoryCache(),
      second = setup(processed, secondCache).controller;
    const [id] = await second.add([named("two")]);
    let fail: ((error: Error) => void) | undefined;
    secondCache.remove = () =>
      new Promise((_resolve, reject) => {
        fail = reject;
      });
    const pending = second.remove(id!);
    await second.reset("A newer reset completed.");
    fail!(new Error("Late storage failure"));
    await pending;
    expect(second.getSnapshot().notice).toBe("A newer reset completed.");
  });
  it("rejects old cached bytes after a replacement cache write failed", async () => {
    const cache = new MemoryCache(),
      first = setup(processed, cache).controller;
    const [id] = await first.add([named("original")]);
    cache.put = async () => {
      throw new Error("Quota denied");
    };
    await first.add([named("replacement")], id);
    const restored = setup(processed, cache).controller;
    await restored.recover([id!], first.descriptors());
    expect(restored.availableIds().size).toBe(0);
    expect(() => restored.require([id!])).toThrow();
    expect(restored.getSnapshot().notice).toContain(
      "Missing photos need repair",
    );
  });
  it("keeps a recovery union within 32 sources while preserving memory-only work", async () => {
    const cache = new MemoryCache();
    for (let index = 0; index < 32; index++)
      await cache.put({
        ...(await processed({
          id: `cached_${index}`,
          original: named(`cached-${index}`).blob,
        })),
        name: `cached-${index}`,
      });
    const { controller } = setup(processed, cache);
    await controller.recover(["cached_0"]);
    cache.remove = async () => {
      throw new Error("Storage unavailable");
    };
    await controller.remove("cached_31");
    cache.put = async () => {
      throw new Error("Storage unavailable");
    };
    const [newId] = await controller.add(
      [named("memory-only")],
      undefined,
      false,
    );
    expect(controller.availableIds().size).toBe(32);
    await controller.recover(["cached_0", newId!]);
    expect(controller.availableIds().size).toBe(32);
    expect(controller.view(newId!)?.name).toBe("memory-only.jpg");
    expect(controller.availableIds().has("cached_31")).toBe(false);
  });
  it("rejects available-byte claims immediately on expiry before the next heartbeat", async () => {
    vi.useFakeTimers();
    const { controller } = setup();
    const [id] = await controller.add([named("one")]);
    vi.setSystemTime(Date.now() + 7_200_001);
    expect(controller.availableIds().size).toBe(0);
    expect(() => controller.require([id!])).toThrow();
  });
  it("keeps valid inputs when one decoder fails; exact duplicates retain one URL", async () => {
    const decode = vi.fn<PhotoDecoder>(async (task) => {
      if ((await task.original.text()) === "bad")
        throw new Error("Corrupt image");
      return processed(task);
    });
    const { controller, created } = setup(decode);
    await controller.add([
      named("one"),
      named("bad"),
      named("one"),
      named("two"),
    ]);
    expect(controller.getSnapshot().items.map((item) => item.name)).toEqual([
      "one.jpg",
      "two.jpg",
    ]);
    expect(
      controller.getSnapshot().issues.map((issue) => issue.message),
    ).toEqual([
      "Unable to read this photo.",
      "These exact photo bytes are already here. Kept one copy.",
    ]);
    expect(created).toHaveLength(2);
    expect(controller.manifest()).toHaveLength(2);
  });
  it("ignores late output after reset even when the decoder ignores abort", async () => {
    let finish: ((value: ProcessedPhoto) => void) | undefined;
    let captured: DecodeTask | undefined;
    const decode: PhotoDecoder = (task) => {
      captured = task;
      return new Promise((resolve) => {
        finish = resolve;
      });
    };
    const { controller, cache, created } = setup(decode);
    const pending = controller.add([named("one")]);
    await vi.waitFor(() => expect(captured).toBeDefined());
    await controller.reset();
    finish!(await processed(captured!));
    expect(await pending).toEqual([]);
    expect(controller.getSnapshot().items).toEqual([]);
    expect(controller.getSnapshot().busy).toBe(false);
    expect(created).toHaveLength(0);
    expect((await cache.read()).photos).toEqual([]);
  });
  it("enforces byte and selection caps before invoking the decoder", async () => {
    const decode = vi.fn<PhotoDecoder>(processed);
    const { controller } = setup(decode);
    await controller.add([
      {
        name: "huge",
        blob: new Blob([new Uint8Array(PHOTO_LIMITS.original + 1)]),
      },
    ]);
    expect(decode).not.toHaveBeenCalled();
    await controller.add(
      Array.from({ length: 25 }, (_, index) => named(`unique-${index}`)),
    );
    expect(decode).toHaveBeenCalledTimes(24);
    expect(controller.getSnapshot().items).toHaveLength(24);
    await controller.add([named("extra")]);
    expect(decode).toHaveBeenCalledTimes(24);
  });
  it("enforces aggregate original bytes before the eleventh four-MiB decode", async () => {
    const decode = vi.fn<PhotoDecoder>(processed);
    const { controller } = setup(decode);
    const files = Array.from({ length: 11 }, (_, index) => {
      const bytes = new Uint8Array(PHOTO_LIMITS.original);
      bytes[0] = index + 1;
      return { name: `large-${index}.jpg`, blob: new Blob([bytes]) };
    });
    await controller.add(files);
    expect(decode).toHaveBeenCalledTimes(10);
    expect(controller.getSnapshot().items).toHaveLength(10);
    expect(controller.getSnapshot().issues[0]?.message).toContain("40 MiB");
  });
  it("accepts an owner-form photo outside a full recognition selection", async () => {
    const { controller } = setup();
    await controller.add(
      Array.from({ length: 24 }, (_, index) => named(`selected-${index}`)),
    );
    const [id] = await controller.add(
      [named("owner-addition")],
      undefined,
      false,
    );
    expect(controller.getSnapshot().items).toHaveLength(24);
    expect(controller.availableIds().size).toBe(25);
    expect(controller.view(id!)?.name).toBe("owner-addition.jpg");
    expect(() => controller.require([id!])).not.toThrow();
  });
  it("keeps memory work after quota denial but rejects another tab's lease", async () => {
    const quota = new MemoryCache();
    quota.put = async () => {
      throw new Error("QuotaExceededError");
    };
    const memory = setup(processed, quota).controller;
    const [id] = await memory.add([named("one")]);
    expect(memory.getSnapshot().notice).toContain("refreshing may lose");
    expect(() => memory.require([id!])).not.toThrow();
    expect(() => memory.require(["missing"])).toThrow();
    const conflict = new MemoryCache();
    conflict.put = async () => {
      throw new CacheConflict();
    };
    const other = setup(processed, conflict).controller;
    await other.add([named("two")]);
    expect(other.getSnapshot().items).toHaveLength(0);
    expect(other.getSnapshot().issues[0]?.message).toContain("Another tab");
  });
  it("revokes replaced, removed and disposed object URLs; protects used photos", async () => {
    const { controller, revoked, created } = setup();
    const [id] = await controller.add([named("one")]);
    await controller.add([named("two")], id);
    expect(revoked).toEqual([created[0]]);
    controller.protect([id!]);
    await controller.remove(id!);
    expect(controller.getSnapshot().items).toHaveLength(1);
    controller.protect([]);
    await controller.remove(id!);
    expect(revoked).toEqual(created);
    await controller.add([named("three")]);
    controller.dispose();
    expect(new Set(revoked).size).toBe(created.length);
  });
  it("restores valid photos while requiring repair for lost or corrupt bytes", async () => {
    const cache = new MemoryCache();
    const good = await processed({ id: "good", original: named("good").blob });
    const bad = await processed({ id: "bad", original: named("bad").blob });
    await cache.put({ ...good, name: "good.jpg" });
    await cache.put({ ...bad, name: "bad.jpg" });
    const decode: PhotoDecoder = async (task) => {
      if (task.id === "bad") throw new Error("Decode loss");
      return processed(task);
    };
    const { controller } = setup(decode, cache);
    await controller.recover(["good", "bad", "missing"]);
    expect(controller.getSnapshot().items.map((item) => item.photo.id)).toEqual(
      ["good"],
    );
    expect(controller.getSnapshot().notice).toContain(
      "Missing photos need repair",
    );
    expect(controller.getSnapshot().issues).toHaveLength(2);
    expect(() => controller.require(["bad"])).toThrow();
  });
  it("rejects an addition after recovering 32 cached sources before decode", async () => {
    const cache = new MemoryCache();
    for (let index = 0; index < 32; index++)
      await cache.put({
        ...(await processed({
          id: `cached_${index}`,
          original: named(`cached-${index}`).blob,
        })),
        name: `cached-${index}`,
      });
    const decode = vi.fn<PhotoDecoder>(processed);
    const { controller } = setup(decode, cache);
    await controller.recover(["cached_0"]);
    decode.mockClear();
    await controller.add([named("extra")]);
    expect(decode).not.toHaveBeenCalled();
    expect(controller.getSnapshot().issues[0]?.message).toContain("32 cached");
  });
});
