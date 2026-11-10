import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { SHOPIFY_LIMITS } from "@retailor/contracts/shopify";
import { deny, OperationFailure } from "../security/errors.js";
import { LedgerSchema, emptyLedger } from "./model.js";
import type { LedgerData } from "./model.js";
import type { ShopifyStore } from "./storage.js";

/** One bounded transaction at a time locally; storage CAS fences other replicas. */
export class ShopifyLedger {
  private busy = false;
  private waiters: {
    resolve: () => void;
    reject: (error: unknown) => void;
    timer: ReturnType<typeof setTimeout>;
  }[] = [];
  private readonly key: Buffer;
  private readonly aad: Buffer;
  constructor(
    readonly store: ShopifyStore,
    key: string,
    appId: string,
  ) {
    if (!/^[a-f0-9]{64}$/u.test(key) || !appId) deny("UNAVAILABLE", 503);
    this.key = Buffer.from(key, "hex");
    this.aad = Buffer.from(`retailor:shopify:v1:${appId}`);
  }
  private decode(bytes: Uint8Array | null): LedgerData {
    if (!bytes) return emptyLedger();
    try {
      if (
        bytes.byteLength < 29 ||
        bytes.byteLength > SHOPIFY_LIMITS.ledgerBytes + 28
      )
        return deny("UNAVAILABLE", 503);
      const input = Buffer.from(bytes),
        decipher = createDecipheriv(
          "aes-256-gcm",
          this.key,
          input.subarray(0, 12),
        );
      decipher.setAAD(this.aad);
      decipher.setAuthTag(input.subarray(12, 28));
      const plain = Buffer.concat([
        decipher.update(input.subarray(28)),
        decipher.final(),
      ]);
      return LedgerSchema.parse(JSON.parse(plain.toString("utf8")));
    } catch {
      return deny("UNAVAILABLE", 503);
    }
  }
  private encode(data: LedgerData) {
    const plain = Buffer.from(JSON.stringify(LedgerSchema.parse(data)));
    if (plain.length > SHOPIFY_LIMITS.ledgerBytes)
      return deny("TOO_LARGE", 413);
    const iv = randomBytes(12),
      cipher = createCipheriv("aes-256-gcm", this.key, iv);
    cipher.setAAD(this.aad);
    const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
    return Buffer.concat([iv, cipher.getAuthTag(), encrypted]);
  }
  private async acquire() {
    if (!this.busy) {
      this.busy = true;
      return;
    }
    if (this.waiters.length >= 8) return deny("BUSY", 429);
    await new Promise<void>((resolve, reject) => {
      const waiter: (typeof this.waiters)[number] = {
        resolve,
        reject,
        timer: setTimeout(() => {
          const index = this.waiters.indexOf(waiter);
          if (index >= 0) this.waiters.splice(index, 1);
          reject(new OperationFailure("BUSY", 429));
        }, 5000),
      };
      this.waiters.push(waiter);
    });
  }
  private release() {
    const next = this.waiters.shift();
    if (next) {
      clearTimeout(next.timer);
      next.resolve();
    } else this.busy = false;
  }
  async transact<T>(change: (data: LedgerData) => T): Promise<T> {
    await this.acquire();
    try {
      // Only a confirmed conditional-write conflict replays this synchronous,
      // side-effect-free transform. Never retry HTTP or uncertain storage writes.
      for (let attempt = 0; attempt < 3; attempt++) {
        const snapshot = await this.store.read(),
          data = this.decode(snapshot.bytes);
        const result = change(data);
        if (result instanceof Promise) return deny("INVALID_INPUT", 400);
        try {
          await this.store.replace(snapshot.version, this.encode(data));
          return result;
        } catch (error) {
          if (!(
            error instanceof OperationFailure &&
            error.code === "STALE" &&
            attempt < 2
          ))
            throw error;
        }
      }
      return deny("STALE", 409);
    } finally {
      this.release();
    }
  }
  async inspect<T>(read: (data: LedgerData) => T): Promise<T> {
    await this.acquire();
    try {
      return read(this.decode((await this.store.read()).bytes));
    } finally {
      this.release();
    }
  }
  async close() {
    await this.acquire();
    try {
      await this.store.close();
    } finally {
      this.release();
    }
  }
}
