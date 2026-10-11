import { z } from "zod";
import { IdSchema } from "@retailor/contracts/core";
import { PhotoSchema, PHOTO_LIMITS } from "@retailor/contracts/photos";
import type { ProcessedPhoto } from "./decode";
export interface StoredPhoto extends ProcessedPhoto {
  name: string;
}
export interface PhotoCache {
  put(value: StoredPhoto): Promise<void>;
  read(): Promise<{ photos: StoredPhoto[]; missingIds: string[] }>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
  heartbeat(): Promise<void>;
  close(): Promise<void>;
}
export class CacheConflict extends Error {
  constructor() {
    super(
      "Another tab owns these photos. Start a separate demo or retry after that tab closes.",
    );
  }
}
const LeaseSchema = z.strictObject({
  id: IdSchema,
  owner: IdSchema,
  browserLock: z.boolean().default(false),
  fence: z.number().int().positive(),
  until: z.number().nonnegative(),
  expires: z.number().nonnegative(),
  originals: z.number().int().nonnegative().max(PHOTO_LIMITS.originals),
  derivatives: z
    .number()
    .int()
    .nonnegative()
    .max(PHOTO_LIMITS.cachedDerivatives),
  count: z.number().int().nonnegative().max(PHOTO_LIMITS.sources),
});
type Lease = z.infer<typeof LeaseSchema>;
type Row = StoredPhoto & { key: string; workspace: string };
function request<T>(value: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    value.onsuccess = () => resolve(value.result);
    value.onerror = () =>
      reject(new Error("Temporary photo storage unavailable."));
  });
}
async function transaction<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  run: (tx: IDBTransaction) => Promise<T>,
) {
  const tx = db.transaction(["workspaces", "photos"], mode);
  const done = new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = tx.onabort = () =>
      reject(new Error("Temporary photo storage unavailable."));
  });
  try {
    const result = await run(tx);
    await done;
    return result;
  } catch (error) {
    try {
      tx.abort();
    } catch {
      /* already closed */
    }
    await done.catch(() => undefined);
    throw error;
  }
}
export class BrowserPhotoCache implements PhotoCache {
  private db: Promise<IDBDatabase> | undefined;
  private liveDb: IDBDatabase | undefined;
  private closing: Promise<void> | undefined;
  private lockHeld = false;
  private releaseLock: (() => void) | undefined;
  private fence: number | undefined;
  private queue: Promise<unknown> = Promise.resolve();
  constructor(
    private readonly workspace: string,
    private readonly owner: string,
    private readonly expires: number,
    private readonly clock = Date.now,
  ) {
    IdSchema.parse(workspace);
    IdSchema.parse(owner);
  }
  private serial<T>(run: () => Promise<T>): Promise<T> {
    const next = this.queue.then(() => {
      if (this.closing) throw new Error("This photo cache is closed.");
      return run();
    });
    this.queue = next.catch(() => undefined);
    return next;
  }
  private open(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    this.db = this.acquireLock()
      .then(
        () =>
          new Promise<IDBDatabase>((resolve, reject) => {
            const opening = indexedDB.open("retailor-photos-v1", 1);
            let settled = false;
            const deadline = setTimeout(() => {
              settled = true;
              reject(new Error("Temporary photo storage unavailable."));
            }, 3000);
            opening.onupgradeneeded = () => {
              const db = opening.result;
              db.createObjectStore("workspaces", { keyPath: "id" });
              db.createObjectStore("photos", { keyPath: "key" }).createIndex(
                "workspace",
                "workspace",
              );
            };
            opening.onblocked = opening.onerror = () => {
              clearTimeout(deadline);
              settled = true;
              reject(new Error("Temporary photo storage unavailable."));
            };
            opening.onsuccess = () => {
              clearTimeout(deadline);
              if (settled) return opening.result.close();
              settled = true;
              this.liveDb = opening.result;
              opening.result.onversionchange = () => opening.result.close();
              resolve(opening.result);
            };
          }),
      )
      .catch((error: unknown) => {
        this.db = undefined;
        this.releaseLock?.();
        this.releaseLock = undefined;
        throw error;
      });
    return this.db;
  }
  private acquireLock() {
    if (typeof navigator === "undefined" || !navigator.locks)
      return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      void navigator.locks
        .request(
          `retailor.photos.${this.workspace}`,
          { ifAvailable: true },
          async (lock) => {
            if (!lock) {
              reject(new CacheConflict());
              return;
            }
            if (this.closing) {
              reject(new Error("This photo cache is closed."));
              return;
            }
            this.lockHeld = true;
            const held = new Promise<void>((done) => {
              this.releaseLock = done;
            });
            resolve();
            await held;
            this.lockHeld = false;
          },
        )
        .catch(reject);
    });
  }
  private async owned(tx: IDBTransaction): Promise<Lease> {
    const store = tx.objectStore("workspaces");
    const all = await request(store.getAll(undefined, 65));
    if (all.length > 64) throw new Error("Temporary cache is full.");
    const now = this.clock();
    if (now >= this.expires)
      throw new Error("This photo workspace has expired.");
    for (const input of all) {
      const lease = LeaseSchema.parse(input);
      if (lease.expires <= now) {
        const keys = await request(
          tx.objectStore("photos").index("workspace").getAllKeys(lease.id),
        );
        for (const key of keys) tx.objectStore("photos").delete(key);
        store.delete(lease.id);
      }
    }
    const input = await request(store.get(this.workspace));
    const current = input === undefined ? undefined : LeaseSchema.parse(input);
    if (
      current &&
      ((current.owner !== this.owner &&
        current.until > now &&
        !(this.lockHeld && current.browserLock)) ||
        (this.fence !== undefined &&
          (current.owner !== this.owner || current.fence !== this.fence)))
    )
      throw new CacheConflict();
    const lease: Lease =
      current && current.owner === this.owner
        ? { ...current, until: now + 20_000 }
        : {
            id: this.workspace,
            owner: this.owner,
            browserLock: this.lockHeld,
            fence: (current?.fence ?? 0) + 1,
            until: now + 20_000,
            expires: this.expires,
            originals: current?.originals ?? 0,
            derivatives: current?.derivatives ?? 0,
            count: current?.count ?? 0,
          };
    this.fence = lease.fence;
    store.put(lease);
    return lease;
  }
  heartbeat() {
    return this.serial(async () => {
      await transaction(await this.open(), "readwrite", (tx) => this.owned(tx));
    });
  }
  private stored(row: Row): StoredPhoto {
    const photo = PhotoSchema.parse(row.photo);
    if (
      row.workspace !== this.workspace ||
      row.key !== `${this.workspace}:${photo.id}` ||
      !(row.original instanceof Blob) ||
      !(row.derivative instanceof Blob) ||
      row.original.size !== photo.source.bytes ||
      row.derivative.size !== photo.derivative.bytes ||
      typeof row.name !== "string" ||
      row.name.length > 120
    )
      throw new Error("Unavailable cached photo.");
    return {
      photo,
      original: row.original,
      derivative: row.derivative,
      name: row.name,
    };
  }
  private async assertTotals(tx: IDBTransaction, lease: Lease) {
    const rows: Row[] = await request(
      tx
        .objectStore("photos")
        .index("workspace")
        .getAll(this.workspace, PHOTO_LIMITS.sources + 1),
    );
    if (rows.length > PHOTO_LIMITS.sources || rows.length !== lease.count)
      throw new Error("Invalid cache counters.");
    const totals = rows
      .map((row) => this.stored(row))
      .reduce(
        (sum, row) => ({
          originals: sum.originals + row.original.size,
          derivatives: sum.derivatives + row.derivative.size,
        }),
        { originals: 0, derivatives: 0 },
      );
    if (
      totals.originals !== lease.originals ||
      totals.derivatives !== lease.derivatives
    )
      throw new Error("Invalid cache counters.");
  }
  put(value: StoredPhoto) {
    return this.serial(async () =>
      transaction(await this.open(), "readwrite", async (tx) => {
        const photo = PhotoSchema.parse(value.photo);
        if (
          !(value.original instanceof Blob) ||
          !(value.derivative instanceof Blob) ||
          value.original.size !== photo.source.bytes ||
          value.derivative.size !== photo.derivative.bytes
        )
          throw new Error("Invalid cache bytes.");
        const lease = await this.owned(tx);
        await this.assertTotals(tx, lease);
        const store = tx.objectStore("photos");
        const key = `${this.workspace}:${photo.id}`;
        const old: Row | undefined = await request(store.get(key));
        if (old) this.stored(old);
        const originals =
          lease.originals + value.original.size - (old?.original.size ?? 0);
        const derivatives =
          lease.derivatives +
          value.derivative.size -
          (old?.derivative.size ?? 0);
        const count = lease.count + (old ? 0 : 1);
        const leases: unknown[] = await request(
          tx.objectStore("workspaces").getAll(undefined, 65),
        );
        const others = leases
          .map((input) => LeaseSchema.parse(input))
          .filter((item) => item.id !== this.workspace)
          .reduce((sum, item) => sum + item.originals + item.derivatives, 0);
        if (
          originals > PHOTO_LIMITS.originals ||
          derivatives > PHOTO_LIMITS.cachedDerivatives ||
          count > PHOTO_LIMITS.sources ||
          others + originals + derivatives > PHOTO_LIMITS.originCache
        )
          throw new Error("Temporary cache is full.");
        store.put({
          key,
          workspace: this.workspace,
          photo,
          original: value.original,
          derivative: value.derivative,
          name: value.name.slice(0, 120),
        });
        tx.objectStore("workspaces").put(
          LeaseSchema.parse({
            ...lease,
            originals,
            derivatives,
            count,
          }),
        );
      }),
    );
  }
  read() {
    return this.serial(async () =>
      transaction(await this.open(), "readwrite", async (tx) => {
        await this.owned(tx);
        const rows: Row[] = await request(
          tx
            .objectStore("photos")
            .index("workspace")
            .getAll(this.workspace, PHOTO_LIMITS.sources + 1),
        );
        if (rows.length > PHOTO_LIMITS.sources)
          throw new Error("Invalid temporary cache.");
        const photos: StoredPhoto[] = [],
          missingIds: string[] = [];
        let originals = 0,
          derivatives = 0;
        for (const row of rows) {
          try {
            const stored = this.stored(row);
            if (
              originals + stored.original.size > PHOTO_LIMITS.originals ||
              derivatives + stored.derivative.size >
                PHOTO_LIMITS.cachedDerivatives
            )
              throw new Error("Invalid cache envelope.");
            originals += stored.original.size;
            derivatives += stored.derivative.size;
            photos.push(stored);
          } catch {
            missingIds.push(
              IdSchema.safeParse(row?.photo?.id).data ?? "unknown",
            );
          }
        }
        return { photos, missingIds };
      }),
    );
  }
  remove(id: string) {
    return this.serial(async () =>
      transaction(await this.open(), "readwrite", async (tx) => {
        const lease = await this.owned(tx);
        await this.assertTotals(tx, lease);
        const key = `${this.workspace}:${id}`;
        const row: Row | undefined = await request(
          tx.objectStore("photos").get(key),
        );
        if (!row) return;
        this.stored(row);
        tx.objectStore("photos").delete(key);
        tx.objectStore("workspaces").put(
          LeaseSchema.parse({
            ...lease,
            originals: lease.originals - row.original.size,
            derivatives: lease.derivatives - row.derivative.size,
            count: lease.count - 1,
          }),
        );
      }),
    );
  }
  clear() {
    return this.serial(async () =>
      transaction(await this.open(), "readwrite", async (tx) => {
        const input = await request(
          tx.objectStore("workspaces").get(this.workspace),
        );
        if (input === undefined) return;
        const lease = LeaseSchema.parse(input);
        if (lease.owner !== this.owner || lease.fence !== this.fence)
          throw new CacheConflict();
        const keys = await request(
          tx
            .objectStore("photos")
            .index("workspace")
            .getAllKeys(this.workspace),
        );
        for (const key of keys) tx.objectStore("photos").delete(key);
        tx.objectStore("workspaces").put({
          ...lease,
          originals: 0,
          derivatives: 0,
          count: 0,
        });
      }),
    );
  }
  close() {
    if (this.closing) return this.closing;
    // Enqueue the release transaction synchronously while pagehide still owns
    // a live document. A promise-only queue can be discarded during navigation.
    const release = (db: IDBDatabase) =>
      new Promise<void>((resolve, reject) => {
        let tx: IDBTransaction;
        try {
          tx = db.transaction("workspaces", "readwrite");
          const get = tx.objectStore("workspaces").get(this.workspace);
          get.onsuccess = () => {
            const parsed = LeaseSchema.safeParse(get.result);
            if (
              parsed.success &&
              parsed.data.owner === this.owner &&
              parsed.data.fence === this.fence
            )
              tx.objectStore("workspaces").put({ ...parsed.data, until: 0 });
          };
        } catch {
          db.close();
          reject(new Error("Temporary photo storage unavailable."));
          return;
        }
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onabort = tx.onerror = () => {
          db.close();
          reject(new Error("Temporary photo storage unavailable."));
        };
      });
    const closing = this.liveDb
      ? release(this.liveDb)
      : this.db
        ? this.db.then(release, () => undefined)
        : Promise.resolve();
    this.closing = closing.finally(() => {
      this.releaseLock?.();
      this.releaseLock = undefined;
    });
    return this.closing;
  }
}
