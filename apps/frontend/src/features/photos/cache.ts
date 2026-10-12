import { z } from "zod";
import { IdSchema } from "@retailor/contracts/core";
import { PhotoSchema, PHOTO_LIMITS } from "@retailor/contracts/photos";
import type { ProcessedPhoto } from "./decode";
import { LOGO_LIMITS, LogoMetadataSchema } from "@retailor/contracts/brand";
import type { LogoMetadata } from "@retailor/contracts/brand";
export interface StoredLogo {
  metadata: LogoMetadata;
  blob: Blob;
}
export interface LogoCache {
  putLogos(values: readonly StoredLogo[]): Promise<void>;
  readLogos(): Promise<StoredLogo[]>;
}
export interface StoredPhoto extends ProcessedPhoto {
  name: string;
}
export interface PhotoCache {
  putLogos?: LogoCache["putLogos"];
  readLogos?: LogoCache["readLogos"];
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
  logoBytes: z
    .number()
    .int()
    .nonnegative()
    .max(LOGO_LIMITS.cacheBytes)
    .default(0),
  logoCount: z.number().int().nonnegative().max(3).default(0),
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
  const tx = db.transaction(["workspaces", "photos", "logos"], mode);
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
            const opening = indexedDB.open("retailor-photos-v1", 2);
            let settled = false;
            const deadline = setTimeout(() => {
              settled = true;
              reject(new Error("Temporary photo storage unavailable."));
            }, 3000);
            opening.onupgradeneeded = () => {
              const db = opening.result;
              if (!db.objectStoreNames.contains("workspaces"))
                db.createObjectStore("workspaces", { keyPath: "id" });
              if (!db.objectStoreNames.contains("photos"))
                db.createObjectStore("photos", { keyPath: "key" }).createIndex(
                  "workspace",
                  "workspace",
                );
              if (!db.objectStoreNames.contains("logos"))
                db.createObjectStore("logos", { keyPath: "key" }).createIndex(
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
        const logoKeys = await request(
          tx.objectStore("logos").index("workspace").getAllKeys(lease.id),
        );
        for (const key of logoKeys) tx.objectStore("logos").delete(key);
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
            logoBytes: current?.logoBytes ?? 0,
            logoCount: current?.logoCount ?? 0,
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
    const logoRows: unknown[] = await request(
      tx.objectStore("logos").index("workspace").getAll(this.workspace, 4),
    );
    if (
      logoRows.length !== lease.logoCount ||
      logoRows.length > 3 ||
      logoRows
        .map((row) => this.storedLogo(row))
        .reduce((sum, row) => sum + row.blob.size, 0) !== lease.logoBytes
    )
      throw new Error("Invalid logo cache counters.");
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
          .reduce(
            (sum, item) =>
              sum + item.originals + item.derivatives + item.logoBytes,
            0,
          );
        if (
          originals > PHOTO_LIMITS.originals ||
          derivatives > PHOTO_LIMITS.cachedDerivatives ||
          count > PHOTO_LIMITS.sources ||
          others + originals + derivatives + lease.logoBytes >
            PHOTO_LIMITS.originCache
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
        const logoKeys = await request(
          tx.objectStore("logos").index("workspace").getAllKeys(this.workspace),
        );
        for (const key of logoKeys) tx.objectStore("logos").delete(key);
        tx.objectStore("workspaces").put({
          ...lease,
          originals: 0,
          derivatives: 0,
          count: 0,
          logoBytes: 0,
          logoCount: 0,
        });
      }),
    );
  }
  private storedLogo(input: unknown): StoredLogo {
    if (
      !input ||
      typeof input !== "object" ||
      !("metadata" in input) ||
      !("blob" in input) ||
      !("workspace" in input) ||
      !("key" in input)
    )
      throw new Error("Unavailable cached logo.");
    const metadata = LogoMetadataSchema.parse(input.metadata);
    if (
      input.workspace !== this.workspace ||
      input.key !== `${this.workspace}:${metadata.id}` ||
      !(input.blob instanceof Blob) ||
      input.blob.type !== "image/png" ||
      input.blob.size !== metadata.bytes
    )
      throw new Error("Unavailable cached logo.");
    return { metadata, blob: input.blob };
  }
  readLogos() {
    return this.serial(async () =>
      transaction(await this.open(), "readwrite", async (tx) => {
        const lease = await this.owned(tx),
          store = tx.objectStore("logos");
        const rows: unknown[] = await request(
          store.index("workspace").getAll(this.workspace, 4),
        );
        const logos: StoredLogo[] = [];
        for (const row of rows) {
          try {
            logos.push(this.storedLogo(row));
          } catch {
            /* A damaged optional set falls back as a whole. */
          }
        }
        const valid =
          logos.length === 3 &&
          rows.length === 3 &&
          new Set(logos.map((row) => row.metadata.id)).size === 3 &&
          new Set(logos.map((row) => row.metadata.hash)).size === 3;
        if (!valid) {
          const keys = await request(
            store.index("workspace").getAllKeys(this.workspace),
          );
          for (const key of keys) store.delete(key);
        }
        tx.objectStore("workspaces").put({
          ...lease,
          logoCount: valid ? 3 : 0,
          logoBytes: valid
            ? logos.reduce((sum, row) => sum + row.blob.size, 0)
            : 0,
        });
        return valid ? logos : [];
      }),
    );
  }
  putLogos(values: readonly StoredLogo[]) {
    return this.serial(async () =>
      transaction(await this.open(), "readwrite", async (tx) => {
        if (
          values.length !== 3 ||
          new Set(values.map((row) => row.metadata.id)).size !== 3 ||
          new Set(values.map((row) => row.metadata.hash)).size !== 3
        )
          throw new Error("A logo set needs three distinct candidates.");
        const normalized = values.map((row) =>
          this.storedLogo({
            ...row,
            workspace: this.workspace,
            key: `${this.workspace}:${row.metadata.id}`,
          }),
        );
        const bytes = normalized.reduce((sum, row) => sum + row.blob.size, 0),
          lease = await this.owned(tx);
        await this.assertTotals(tx, lease);
        const leases: unknown[] = await request(
          tx.objectStore("workspaces").getAll(undefined, 65),
        );
        const others = leases
          .map((row) => LeaseSchema.parse(row))
          .filter((row) => row.id !== this.workspace)
          .reduce(
            (sum, row) => sum + row.originals + row.derivatives + row.logoBytes,
            0,
          );
        if (
          bytes > LOGO_LIMITS.cacheBytes ||
          others + lease.originals + lease.derivatives + bytes >
            PHOTO_LIMITS.originCache
        )
          throw new Error("Temporary cache is full.");
        const store = tx.objectStore("logos"),
          keys = await request(
            store.index("workspace").getAllKeys(this.workspace),
          );
        for (const key of keys) store.delete(key);
        for (const row of normalized)
          store.put({
            ...row,
            workspace: this.workspace,
            key: `${this.workspace}:${row.metadata.id}`,
          });
        tx.objectStore("workspaces").put({
          ...lease,
          logoCount: 3,
          logoBytes: bytes,
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
