import { describe, expect, it, vi } from "vitest";
const sdk = vi.hoisted(() => ({
  save: vi.fn(async () => {}),
  getSignedUrl: vi.fn(async () => [
    "https://storage.googleapis.com/private/signed",
  ]),
  delete: vi.fn(async () => {}),
  file: vi.fn(),
}));
vi.mock("@google-cloud/storage", () => ({
  Storage: class {
    bucket() {
      return {
        file: (path: string) => {
          sdk.file(path);
          return sdk;
        },
      };
    }
  },
}));
import { checkoutImages } from "./storage.js";
describe("private checkout image identity", () => {
  it("accepts real 64-character upload IDs for both upload and cleanup", async () => {
    const adapter = checkoutImages("retailor-project", "private-bucket");
    const photo = "a".repeat(64);
    await adapter.put(
      "attempt",
      photo,
      new Uint8Array([1]),
      Date.now() + 60_000,
      new AbortController().signal,
    );
    await adapter.remove("attempt", [photo]);
    const path = sdk.file.mock.calls.at(-1)![0];
    expect(path).toMatch(
      new RegExp(`^checkout/[a-f0-9-]{36}/attempt/${photo}\\.webp$`, "u"),
    );
    expect(sdk.file.mock.calls.at(-2)![0]).toBe(path);
    expect(sdk.save).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.objectContaining({ preconditionOpts: { ifGenerationMatch: 0 } }),
    );
    expect(sdk.delete).toHaveBeenCalledWith({ ignoreNotFound: true });
    expect(sdk.getSignedUrl).toHaveBeenCalledWith(
      expect.objectContaining({ version: "v4", action: "read" }),
    );
  });
  it("rejects path traversal before reaching the SDK", async () => {
    const adapter = checkoutImages("retailor-project", "private-bucket");
    const before = sdk.file.mock.calls.length;
    await expect(
      adapter.put(
        "../other",
        "photo",
        new Uint8Array([1]),
        Date.now(),
        new AbortController().signal,
      ),
    ).rejects.toThrow();
    expect(sdk.file.mock.calls.length).toBe(before);
  });
  it("isolates cleanup across process instances even when caller IDs are reused", async () => {
    await checkoutImages("retailor-project", "private-bucket").remove(
      "reused",
      ["photo"],
    );
    const first = sdk.file.mock.calls.at(-1)![0];
    await checkoutImages("retailor-project", "private-bucket").remove(
      "reused",
      ["photo"],
    );
    expect(sdk.file.mock.calls.at(-1)![0]).not.toBe(first);
  });
});
