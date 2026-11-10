import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { randomBytes } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { Storage } from "@google-cloud/storage";
import { SHOPIFY_LIMITS } from "@retailor/contracts/shopify";
import { deny } from "../security/errors.js";

export interface BlobSnapshot {
  version: string;
  bytes: Uint8Array | null;
}
export interface ShopifyStore {
  read(): Promise<BlobSnapshot>;
  replace(version: string, bytes: Uint8Array): Promise<void>;
  close(): Promise<void>;
}
const envelopeLimit = SHOPIFY_LIMITS.ledgerBytes + 4096;
/** Explicit simulation only; never selected for live credentials or a live failure. */
export class FixtureShopifyStore implements ShopifyStore {
  private bytes: Uint8Array | null = null;
  private version = 0;
  private closed = false;
  async read() {
    if (this.closed) return deny("UNAVAILABLE", 503);
    return {
      version: String(this.version),
      bytes: this.bytes?.slice() ?? null,
    };
  }
  async replace(version: string, bytes: Uint8Array) {
    if (this.closed) return deny("UNAVAILABLE", 503);
    if (version !== String(this.version)) return deny("STALE", 409);
    if (bytes.byteLength > envelopeLimit) return deny("TOO_LARGE", 413);
    this.bytes = bytes.slice();
    this.version++;
  }
  async close() {
    this.closed = true;
    this.bytes = null;
  }
}
function isCode(error: unknown, code: string | number) {
  return (
    !!error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === code
  );
}

/** Lazy, exclusive process owner. A separate local runner must wait for close. */
export class LocalShopifyStore implements ShopifyStore {
  private opening: Promise<void> | null = null;
  private database: DatabaseSync | null = null;
  private closed = false;
  constructor(private readonly directory: string) {}
  private async acquire() {
    if (this.closed) return deny("UNAVAILABLE", 503);
    if (!this.opening) this.opening = this.open();
    await this.opening;
  }
  private async open() {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const { DatabaseSync } = await import("node:sqlite");
    const database = new DatabaseSync(
      resolve(this.directory, "ledger.sqlite"),
      { timeout: 0 },
    );
    try {
      // One encrypted blob, no merchant tables. OS locks recover after a crash;
      // an advisory PID file cannot safely supply exclusive stale-lock takeover.
      database.exec(
        "PRAGMA locking_mode=EXCLUSIVE; PRAGMA synchronous=FULL; PRAGMA journal_mode=DELETE; BEGIN EXCLUSIVE; CREATE TABLE IF NOT EXISTS ledger (id INTEGER PRIMARY KEY CHECK(id=1), version TEXT NOT NULL, bytes BLOB NOT NULL); COMMIT;",
      );
      this.database = database;
    } catch (error) {
      database.close();
      if (
        error &&
        typeof error === "object" &&
        "errcode" in error &&
        error.errcode === 5
      )
        return deny("BUSY", 429);
      throw error;
    }
  }
  async read(): Promise<BlobSnapshot> {
    await this.acquire();
    const metadata = this.database!.prepare(
      "SELECT length(bytes) AS size FROM ledger WHERE id=1",
    ).get();
    if (
      metadata &&
      (typeof metadata.size !== "number" || metadata.size > envelopeLimit)
    )
      return deny("UNAVAILABLE", 503);
    const row = this.database!.prepare(
      "SELECT version, bytes, length(bytes) AS size FROM ledger WHERE id=1",
    ).get();
    if (!row) return { version: "0", bytes: null };
    if (
      typeof row.version !== "string" ||
      !(row.bytes instanceof Uint8Array) ||
      typeof row.size !== "number" ||
      row.size > envelopeLimit
    )
      return deny("UNAVAILABLE", 503);
    return { version: row.version, bytes: row.bytes };
  }
  async replace(version: string, bytes: Uint8Array) {
    await this.acquire();
    if (bytes.byteLength > envelopeLimit) return deny("TOO_LARGE", 413);
    const database = this.database!;
    database.exec("BEGIN IMMEDIATE");
    try {
      const current = database
        .prepare("SELECT version FROM ledger WHERE id=1")
        .get();
      if ((current?.version ?? "0") !== version) return deny("STALE", 409);
      database
        .prepare(
          "INSERT INTO ledger(id,version,bytes) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET version=excluded.version,bytes=excluded.bytes",
        )
        .run(randomBytes(32).toString("hex"), bytes);
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  }
  async close() {
    if (this.closed) return;
    this.closed = true;
    if (!this.opening) return;
    try {
      await this.opening;
    } catch {
      return;
    }
    this.database?.close();
    this.database = null;
  }
}

/** Construction performs no ADC/storage request; generations fence replicas. */
export class GcsShopifyStore implements ShopifyStore {
  private readonly storage: Storage;
  constructor(
    private readonly project: string,
    private readonly bucket: string,
  ) {
    this.storage = new Storage({
      projectId: project,
      timeout: 10_000,
      clientOptions: { transporterOptions: { timeout: 10_000, retry: false } },
      retryOptions: { autoRetry: false, maxRetries: 0 },
    });
  }
  async read(): Promise<BlobSnapshot> {
    const file = this.storage
      .bucket(this.bucket, { userProject: this.project })
      .file("shopify/v1/ledger.bin");
    try {
      const [metadata] = await file.getMetadata();
      const size = Number(metadata.size),
        generation = Number(metadata.generation);
      if (
        !Number.isSafeInteger(size) ||
        size < 1 ||
        size > envelopeLimit ||
        !Number.isSafeInteger(generation) ||
        generation < 1
      )
        return deny("UNAVAILABLE", 503);
      const [bytes] = await this.storage
        .bucket(this.bucket, { userProject: this.project })
        .file("shopify/v1/ledger.bin", { generation })
        .download({ validation: "crc32c" });
      if (bytes.length !== size) return deny("UNAVAILABLE", 503);
      return { version: String(generation), bytes };
    } catch (error) {
      if (isCode(error, 404)) return { version: "0", bytes: null };
      throw error;
    }
  }
  async replace(version: string, bytes: Uint8Array) {
    const generation = Number(version);
    if (
      !Number.isSafeInteger(generation) ||
      generation < 0 ||
      bytes.byteLength > envelopeLimit
    )
      return deny("UNAVAILABLE", 503);
    try {
      await this.storage
        .bucket(this.bucket, { userProject: this.project })
        .file("shopify/v1/ledger.bin")
        .save(Buffer.from(bytes), {
          resumable: false,
          validation: "crc32c",
          timeout: 10_000,
          preconditionOpts: { ifGenerationMatch: generation },
          metadata: {
            contentType: "application/octet-stream",
            cacheControl: "private,no-store",
          },
        });
    } catch (error) {
      if (isCode(error, 412)) return deny("STALE", 409);
      throw error;
    }
  }
  async close() {
    /* No owned socket/timer; ADC is resolved only on use. */
  }
}
