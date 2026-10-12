import { readFileSync } from "node:fs";
import { expect, it, vi } from "vitest";
import { loadSample, SAMPLE } from "./sample";
function bytes(path: string) {
  return readFileSync(new URL(`../../../public${path}`, import.meta.url));
}
function heldFetch() {
  const calls: {
    path: string;
    signal: AbortSignal;
    resolve(response: Response): void;
  }[] = [];
  const fetcher = vi.fn<typeof fetch>(async (path, init) => {
    expect(init?.redirect).toBe("error");
    const signal = init?.signal;
    if (!signal) throw new Error("Missing owned signal");
    if (calls.length >= 2) return new Response(bytes(String(path)));
    return new Promise((resolve, reject) => {
      calls.push({ path: String(path), signal, resolve });
      signal.addEventListener("abort", () => reject(new Error("cancelled")), {
        once: true,
      });
    });
  });
  return { fetcher, calls };
}
it("rejects an already-cancelled sample operation without fetching or returning an empty success", async () => {
  const fetcher = vi.fn<typeof fetch>(async () => new Response());
  await expect(loadSample(AbortSignal.abort(), fetcher)).rejects.toThrow();
  expect(fetcher).not.toHaveBeenCalled();
});
it("loads two actual release photos at once and preserves the full fifteen-photo manifest order", async () => {
  const { fetcher, calls } = heldFetch(),
    pending = loadSample(new AbortController().signal, fetcher);
  await vi.waitFor(() => expect(calls).toHaveLength(2));
  const second = new Response(bytes(calls[1]!.path));
  calls[1]!.resolve(second);
  await vi.waitFor(() => expect(second.bodyUsed).toBe(true));
  expect(fetcher).toHaveBeenCalledTimes(2);
  calls[0]!.resolve(new Response(bytes(calls[0]!.path)));
  const result = await pending;
  expect(result.map((file) => file.name)).toEqual(
    SAMPLE.assets.map((asset) => `${asset.id}.webp`),
  );
  expect(result.map((file) => file.blob.size)).toEqual(
    SAMPLE.assets.map((asset) => asset.image.bytes),
  );
  expect(fetcher).toHaveBeenCalledTimes(15);
});
it("cancels both active sample transfers and never starts queued paths", async () => {
  const { fetcher, calls } = heldFetch(),
    owner = new AbortController(),
    pending = loadSample(owner.signal, fetcher),
    rejected = expect(pending).rejects.toThrow();
  await vi.waitFor(() => expect(calls).toHaveLength(2));
  owner.abort();
  await rejected;
  expect(calls.every((call) => call.signal.aborted)).toBe(true);
  expect(fetcher).toHaveBeenCalledTimes(2);
});
it("a corrupt sample stops the batch, cancels its sibling and makes no repair request", async () => {
  const { fetcher, calls } = heldFetch(),
    pending = loadSample(new AbortController().signal, fetcher),
    rejected = expect(pending).rejects.toThrow("incomplete");
  await vi.waitFor(() => expect(calls).toHaveLength(2));
  calls[0]!.resolve(new Response("corrupt"));
  await rejected;
  expect(calls[1]!.signal.aborted).toBe(true);
  expect(fetcher).toHaveBeenCalledTimes(2);
});
it("a later corrupt response cancels the earlier stalled fetch immediately", async () => {
  const { fetcher, calls } = heldFetch(),
    pending = loadSample(new AbortController().signal, fetcher),
    rejected = expect(pending).rejects.toThrow("incomplete");
  await vi.waitFor(() => expect(calls).toHaveLength(2));
  calls[1]!.resolve(new Response("corrupt"));
  await rejected;
  expect(calls[0]!.signal.aborted).toBe(true);
  expect(fetcher).toHaveBeenCalledTimes(2);
});
