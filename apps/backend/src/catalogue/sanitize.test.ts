import sharp from "sharp";
import { createHash } from "node:crypto";
import { expect, it, vi } from "vitest";
import { prepareProviderImages, type ImageDecoder } from "./sanitize.js";
import { ImageCapacity, IMAGE_WORKER_LIMITS } from "./image-capacity.js";
async function batch(count = 3, prefix = "image") {
  const manifest = [],
    files = new Map<string, Uint8Array>();
  for (let index = 0; index < count; index++) {
    const bytes = await sharp({
        create: {
          width: 24,
          height: 32,
          channels: 3,
          background: { r: index * 50, g: 80, b: 120 },
        },
      })
        .jpeg()
        .toBuffer(),
      id = `${prefix}_${index}`;
    files.set(id, bytes);
    manifest.push({
      id,
      hash: createHash("sha256").update(bytes).digest("hex"),
      mime: "image/jpeg" as const,
      bytes: bytes.length,
      width: 24,
      height: 32,
    });
  }
  return { manifest, files };
}
function held() {
  const jobs: {
    signal: AbortSignal;
    resolve(bytes: Uint8Array): void;
    reject(error: Error): void;
  }[] = [];
  const decode = vi.fn<ImageDecoder>(
    (_bytes, _width, _height, signal) =>
      new Promise((resolve, reject) => {
        jobs.push({ signal, resolve, reject });
      }),
  );
  return { jobs, decode };
}
it("holds at most two prepared results and preserves approved order under reversed completion", async () => {
  const input = await batch(),
    capacity = new ImageCapacity(),
    { jobs, decode } = held();
  const pending = prepareProviderImages(
    input.manifest,
    input.files,
    new AbortController().signal,
    { capacity, decode, rss: () => 0 },
  );
  await vi.waitFor(() => expect(jobs).toHaveLength(2));
  jobs[1]!.resolve(new Uint8Array([2]));
  await Promise.resolve();
  expect(jobs).toHaveLength(2);
  jobs[0]!.resolve(new Uint8Array([1]));
  await vi.waitFor(() => expect(jobs).toHaveLength(3));
  jobs[2]!.resolve(new Uint8Array([3]));
  const result = await pending;
  expect([...result.keys()]).toEqual(input.manifest.map((image) => image.id));
  expect([...result.values()].map((bytes) => bytes[0])).toEqual([1, 2, 3]);
  expect(capacity.counters()).toEqual({ active: 0, waiting: 0 });
});
it("shares two native slots across requests and waits for canceled worker termination before releasing them", async () => {
  const a = await batch(4, "a"),
    b = await batch(2, "b"),
    capacity = new ImageCapacity(),
    { jobs, decode } = held(),
    cancel = new AbortController();
  const first = prepareProviderImages(a.manifest, a.files, cancel.signal, {
      capacity,
      decode,
      rss: () => 0,
    }),
    rejected = expect(first).rejects.toThrow();
  await vi.waitFor(() => expect(jobs).toHaveLength(2));
  const second = prepareProviderImages(
    b.manifest,
    b.files,
    new AbortController().signal,
    { capacity, decode, rss: () => 0 },
  );
  await vi.waitFor(() =>
    expect(capacity.counters()).toEqual({ active: 2, waiting: 2 }),
  );
  await expect(
    prepareProviderImages(b.manifest, b.files, new AbortController().signal, {
      capacity,
      decode,
      rss: () => 0,
    }),
  ).rejects.toThrow("BUSY");
  expect(jobs).toHaveLength(2);
  cancel.abort();
  expect(jobs.every((job) => job.signal.aborted)).toBe(true);
  expect(capacity.counters()).toEqual({ active: 2, waiting: 2 });
  jobs[0]!.reject(new Error("terminated"));
  await vi.waitFor(() => expect(jobs).toHaveLength(3));
  expect(jobs[2]!.signal.aborted).toBe(false);
  expect(capacity.counters()).toEqual({ active: 2, waiting: 1 });
  jobs[1]!.reject(new Error("terminated"));
  await rejected;
  await vi.waitFor(() => expect(jobs).toHaveLength(4));
  jobs[3]!.resolve(new Uint8Array([4]));
  jobs[2]!.resolve(new Uint8Array([3]));
  expect([...(await second).keys()]).toEqual(
    b.manifest.map((image) => image.id),
  );
  expect(capacity.counters()).toEqual({ active: 0, waiting: 0 });
});
it("preflights every hash/header before native work and rejects high RSS without a decode", async () => {
  const input = await batch(),
    capacity = new ImageCapacity(),
    { decode } = held();
  const invalid = input.manifest.map((image, index) =>
    index === 2 ? { ...image, hash: "f".repeat(64) } : image,
  );
  await expect(
    prepareProviderImages(invalid, input.files, new AbortController().signal, {
      capacity,
      decode,
      rss: () => 0,
    }),
  ).rejects.toThrow("byte mismatch");
  expect(decode).not.toHaveBeenCalled();
  await expect(
    prepareProviderImages(
      input.manifest,
      input.files,
      new AbortController().signal,
      { capacity, decode, rss: () => IMAGE_WORKER_LIMITS.rssBytes },
    ),
  ).rejects.toThrow("BUSY");
  expect(decode).not.toHaveBeenCalled();
  expect(capacity.counters()).toEqual({ active: 0, waiting: 0 });
});
it("a failed image aborts its sibling and waits for its stop before completing the failed batch", async () => {
  const input = await batch(),
    capacity = new ImageCapacity(),
    { jobs, decode } = held();
  const pending = prepareProviderImages(
      input.manifest,
      input.files,
      new AbortController().signal,
      { capacity, decode, rss: () => 0 },
    ),
    rejected = expect(pending).rejects.toThrow("bad pixels");
  await vi.waitFor(() => expect(jobs).toHaveLength(2));
  jobs[1]!.reject(new Error("bad pixels"));
  await vi.waitFor(() => expect(jobs[0]!.signal.aborted).toBe(true));
  expect(capacity.counters()).toEqual({ active: 1, waiting: 0 });
  expect(jobs).toHaveLength(2);
  jobs[0]!.reject(new Error("stopped"));
  await rejected;
  expect(capacity.counters()).toEqual({ active: 0, waiting: 0 });
});
