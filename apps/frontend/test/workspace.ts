import { createHash } from "node:crypto";
import type { PhotoCache, StoredPhoto } from "../src/features/photos/cache";
import { PhotoController } from "../src/features/photos/controller";
import type { DecodeTask, ProcessedPhoto } from "../src/features/photos/decode";
import { SessionController } from "../src/features/session/controller";
import type { CatalogueProcessor } from "../src/features/session/controller";
import { developmentDraft } from "../src/features/catalogue/development-fixture";
export class MemoryCache implements PhotoCache {
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
export class MemoryStorage {
  values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
}
export const file = (content: string) => ({
  name: `${content}.jpg`,
  blob: new Blob([content], { type: "image/jpeg" }),
});
const hash = async (blob: Blob) =>
  createHash("sha256")
    .update(Buffer.from(await blob.arrayBuffer()))
    .digest("hex");
export async function decode(task: DecodeTask): Promise<ProcessedPhoto> {
  if (task.existing) return task.existing;
  const sourceHash = await hash(task.original),
    derivative = new Blob([sourceHash], { type: "image/webp" });
  return {
    original: task.original,
    derivative,
    photo: {
      id: task.id,
      source: {
        id: task.id,
        hash: sourceHash,
        mime: "image/jpeg",
        width: 100,
        height: 125,
        bytes: task.original.size,
      },
      derivative: {
        id: task.id,
        hash: await hash(derivative),
        mime: "image/webp",
        width: 100,
        height: 125,
        bytes: derivative.size,
      },
    },
  };
}
export function environment() {
  let sequence = 0,
    now = Date.parse("2026-10-11T18:00:00.000Z");
  const id = () => `id_${++sequence}`,
    caches = new Map<string, MemoryCache>(),
    storage = new MemoryStorage(),
    controllers: SessionController[] = [];
  const processor: CatalogueProcessor = {
    mode: "development-fixture",
    async interpret(input) {
      return developmentDraft(
        input.photos,
        input.operationId,
        input.inputRevision,
        id,
      );
    },
  };
  async function open(
    overrides: Partial<Parameters<typeof SessionController.open>[0]> = {},
  ) {
    const controller = await SessionController.open({
      fixtureAllowed: true,
      processor,
      storage,
      clock: () => now,
      id,
      cache: (workspace) => {
        let cache = caches.get(workspace);
        if (!cache) {
          cache = new MemoryCache();
          caches.set(workspace, cache);
        }
        return cache;
      },
      photos: (cache, expires) =>
        new PhotoController({
          cache,
          expires,
          clock: () => now,
          decode,
          id,
          urls: { create: () => `blob:owned-${id()}`, revoke: () => undefined },
        }),
      ...overrides,
    });
    controllers.push(controller);
    return controller;
  }
  return {
    open,
    processor,
    storage,
    caches,
    controllers,
    id,
    clock: () => now,
    advance: (ms: number) => {
      now += ms;
    },
    dispose: () => controllers.forEach((controller) => controller.dispose()),
  };
}
