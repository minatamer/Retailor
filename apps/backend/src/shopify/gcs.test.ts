import { beforeEach, describe, expect, it, vi } from "vitest";
import { SHOPIFY_LIMITS } from "@retailor/contracts/shopify";
const io = vi.hoisted(() => ({
  metadata: vi.fn(),
  download: vi.fn(),
  save: vi.fn(),
  file: vi.fn(),
  bucket: vi.fn(),
  construct: vi.fn(),
}));
vi.mock("@google-cloud/storage", () => ({
  Storage: class {
    constructor(options: unknown) {
      io.construct(options);
    }
    bucket(name: string, options: unknown) {
      io.bucket(name, options);
      return {
        file: (name: string, options?: unknown) => {
          io.file(name, options);
          return {
            getMetadata: io.metadata,
            download: io.download,
            save: io.save,
          };
        },
      };
    }
  },
}));
import { GcsShopifyStore } from "./storage.js";
beforeEach(() => {
  io.metadata.mockResolvedValue([{ size: "3", generation: "7" }]);
  io.download.mockResolvedValue([Buffer.from([1, 2, 3])]);
  io.save.mockResolvedValue(undefined);
});
describe("private generation-fenced Shopify GCS adapter", () => {
  it("constructs inertly then pins a bounded read to the observed generation", async () => {
    const store = new GcsShopifyStore("test-project", "test-bucket");
    expect(io.metadata).not.toHaveBeenCalled();
    expect(io.download).not.toHaveBeenCalled();
    const snapshot = await store.read();
    expect(snapshot.version).toBe("7");
    expect([...snapshot.bytes!]).toEqual([1, 2, 3]);
    expect(io.file).toHaveBeenLastCalledWith("shopify/v1/ledger.bin", {
      generation: 7,
    });
    expect(io.bucket).toHaveBeenCalledWith("test-bucket", {
      userProject: "test-project",
    });
    expect(io.construct).toHaveBeenCalledWith(
      expect.objectContaining({
        retryOptions: { autoRetry: false, maxRetries: 0 },
      }),
    );
  });
  it("uses exact generation preconditions and distinguishes known conflicts from uncertain errors", async () => {
    const store = new GcsShopifyStore("test-project", "test-bucket");
    await store.replace("7", new Uint8Array([1]));
    expect(io.save).toHaveBeenCalledWith(
      Buffer.from([1]),
      expect.objectContaining({
        preconditionOpts: { ifGenerationMatch: 7 },
        resumable: false,
      }),
    );
    io.save.mockRejectedValueOnce({ code: 412 });
    await expect(store.replace("7", new Uint8Array([2]))).rejects.toMatchObject(
      { code: "STALE" },
    );
    io.save.mockRejectedValueOnce(new Error("unknown-storage-result"));
    await expect(store.replace("7", new Uint8Array([2]))).rejects.toThrow(
      "unknown-storage-result",
    );
    expect(io.save).toHaveBeenCalledTimes(3);
  });
  it("rejects oversized/invalid metadata before download and preserves absent-object semantics", async () => {
    const store = new GcsShopifyStore("test-project", "test-bucket");
    io.metadata.mockResolvedValueOnce([
      { size: String(SHOPIFY_LIMITS.ledgerBytes + 4097), generation: "7" },
    ]);
    await expect(store.read()).rejects.toMatchObject({ code: "UNAVAILABLE" });
    expect(io.download).not.toHaveBeenCalled();
    io.metadata.mockRejectedValueOnce({ code: 404 });
    expect(await store.read()).toEqual({ version: "0", bytes: null });
    await store.replace("0", new Uint8Array([1]));
    expect(io.save).toHaveBeenLastCalledWith(
      Buffer.from([1]),
      expect.objectContaining({ preconditionOpts: { ifGenerationMatch: 0 } }),
    );
  });
});
