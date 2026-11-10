import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { LocalShopifyStore } from "./storage.js";
import { ShopifyLedger } from "./ledger.js";
import { OperationFailure } from "../security/errors.js";
import { SHOPIFY_LIMITS } from "@retailor/contracts/shopify";

const roots: string[] = [],
  stores: LocalShopifyStore[] = [];
async function make() {
  const directory = await mkdtemp(join(tmpdir(), "retailor-shopify-"));
  roots.push(directory);
  const store = new LocalShopifyStore(directory);
  stores.push(store);
  return {
    directory,
    store,
    ledger: new ShopifyLedger(store, "a".repeat(64), "test-app"),
  };
}
afterEach(async () => {
  for (const store of stores.splice(0)) await store.close();
  for (const directory of roots.splice(0)) {
    expect(
      resolve(directory).startsWith(resolve(tmpdir(), "retailor-shopify-")),
    ).toBe(true);
    await rm(directory, { recursive: true, force: true });
  }
});
describe("encrypted durable Shopify ledger", () => {
  it("serializes admitted foreground changes, caps eight waiters and removes timed-out waiters", async () => {
    const { store, ledger } = await make();
    await ledger.transact((data) =>
      data.dispatches.push({
        kind: "user",
        owner: "e".repeat(64),
        expiresAt: 0,
      }),
    );
    let unblock: () => void = () => {},
      entered: () => void = () => {};
    const barrier = new Promise<void>((resolve) => {
        unblock = resolve;
      }),
      started = new Promise<void>((resolve) => {
        entered = resolve;
      });
    const original = store.read.bind(store);
    vi.spyOn(store, "read").mockImplementationOnce(async () => {
      entered();
      await barrier;
      return original();
    });
    const increment = () =>
      ledger.transact((data) => {
        data.dispatches[0]!.expiresAt++;
      });
    const first = increment();
    await started;
    const waiting = Array.from({ length: 8 }, increment);
    await expect(increment()).rejects.toMatchObject({ code: "BUSY" });
    unblock();
    await Promise.all([first, ...waiting]);
    expect(await ledger.inspect((data) => data.dispatches[0]!.expiresAt)).toBe(
      9,
    );

    let finish: () => void = () => {},
      held: () => void = () => {};
    const pause = new Promise<void>((resolve) => {
        finish = resolve;
      }),
      ready = new Promise<void>((resolve) => {
        held = resolve;
      });
    vi.spyOn(store, "read").mockImplementationOnce(async () => {
      held();
      await pause;
      return original();
    });
    const holder = increment();
    await ready;
    vi.useFakeTimers();
    try {
      const timeout = increment().catch((error: unknown) => error);
      await vi.advanceTimersByTimeAsync(5000);
      expect(await timeout).toMatchObject({ code: "BUSY" });
    } finally {
      vi.useRealTimers();
      finish();
      await holder;
    }
    expect(await ledger.inspect((data) => data.dispatches[0]!.expiresAt)).toBe(
      10,
    );
  });
  it("retries at most three confirmed CAS conflicts and never retries an uncertain storage write", async () => {
    const { store, ledger } = await make();
    await ledger.transact(() => undefined);
    const replace = vi
      .spyOn(store, "replace")
      .mockRejectedValue(new OperationFailure("STALE", 409));
    await expect(ledger.transact(() => undefined)).rejects.toMatchObject({
      code: "STALE",
    });
    expect(replace).toHaveBeenCalledTimes(3);
    replace.mockClear().mockRejectedValue(new Error("unknown-write-result"));
    await expect(ledger.transact(() => undefined)).rejects.toThrow(
      "unknown-write-result",
    );
    expect(replace).toHaveBeenCalledTimes(1);
  });
  it("enforces the opaque storage envelope at the byte limit without replacing it on overflow", async () => {
    const { store } = await make();
    const exact = new Uint8Array(SHOPIFY_LIMITS.ledgerBytes + 4096);
    await store.replace("0", exact);
    const snapshot = await store.read();
    expect(snapshot.bytes?.byteLength).toBe(exact.byteLength);
    await expect(
      store.replace(snapshot.version, new Uint8Array(exact.byteLength + 1)),
    ).rejects.toMatchObject({ code: "TOO_LARGE" });
    expect((await store.read()).version).toBe(snapshot.version);
  });
  it("persists ciphertext across reopen, rejects wrong keys and retains the last committed version", async () => {
    const { directory, store, ledger } = await make();
    await ledger.transact((data) => {
      data.dispatches.push({
        kind: "user",
        owner: "f".repeat(64),
        expiresAt: 123456789,
      });
    });
    const file = await readFile(join(directory, "ledger.sqlite"));
    expect(file.includes(Buffer.from("f".repeat(64)))).toBe(false);
    expect(file.includes(Buffer.from("dispatches"))).toBe(false);
    await store.close();
    const reopened = new LocalShopifyStore(directory);
    stores.push(reopened);
    expect(
      await new ShopifyLedger(reopened, "a".repeat(64), "test-app").inspect(
        (data) => data.dispatches[0]?.expiresAt,
      ),
    ).toBe(123456789);
    await expect(
      new ShopifyLedger(reopened, "b".repeat(64), "test-app").inspect(
        (data) => data,
      ),
    ).rejects.toMatchObject({ code: "UNAVAILABLE" });
    await expect(
      new ShopifyLedger(reopened, "a".repeat(64), "changed-app").inspect(
        (data) => data,
      ),
    ).rejects.toMatchObject({ code: "UNAVAILABLE" });
  });
  it("rejects a second live owner and stale CAS without losing the committed state", async () => {
    const { directory, store, ledger } = await make();
    await ledger.transact(() => undefined);
    const old = await store.read();
    const second = new LocalShopifyStore(directory);
    stores.push(second);
    await expect(second.read()).rejects.toMatchObject({ code: "BUSY" });
    await ledger.transact((data) =>
      data.dispatches.push({
        kind: "user",
        owner: "c".repeat(64),
        expiresAt: 4,
      }),
    );
    await expect(store.replace(old.version, old.bytes!)).rejects.toMatchObject({
      code: "STALE",
    });
    expect(await ledger.inspect((data) => data.dispatches.length)).toBe(1);
  });
  it("recovers OS ownership and rolls back an interrupted native write after process exit", async () => {
    const { directory, store, ledger } = await make();
    await ledger.transact((data) =>
      data.dispatches.push({
        kind: "user",
        owner: "d".repeat(64),
        expiresAt: 99,
      }),
    );
    await store.close();
    const child = spawnSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        "import {DatabaseSync} from 'node:sqlite'; const d=new DatabaseSync(process.argv[1]); d.exec(\"PRAGMA locking_mode=EXCLUSIVE; BEGIN EXCLUSIVE; UPDATE ledger SET bytes=x'00';\"); process.exit(17);",
        join(directory, "ledger.sqlite"),
      ],
      { encoding: "utf8", timeout: 5000 },
    );
    expect(child.status).toBe(17);
    const recovered = new LocalShopifyStore(directory);
    stores.push(recovered);
    expect(
      await new ShopifyLedger(recovered, "a".repeat(64), "test-app").inspect(
        (data) => data.dispatches[0]?.expiresAt,
      ),
    ).toBe(99);
  });
});
