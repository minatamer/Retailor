import { afterEach, expect, it, vi } from "vitest";
import { decodePhoto } from "./decode";
import { PHOTO_LIMITS } from "@retailor/contracts/photos";
import { readFileSync } from "node:fs";
const original = () =>
  new Blob(
    [
      readFileSync(
        new URL("../../../public/sample/forme/F01.webp", import.meta.url),
      ),
    ],
    { type: "image/webp" },
  );
class WorkerDouble {
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  onerror: (() => void) | null = null;
  terminate = vi.fn();
  postMessage = vi.fn();
  constructor() {
    workers.push(this);
  }
}
const workers: WorkerDouble[] = [];
it("constructs only two actual decode workers, cancels a waiting third and releases capacity for the next selection", async () => {
  vi.stubGlobal("Worker", WorkerDouble);
  const controls = [
    new AbortController(),
    new AbortController(),
    new AbortController(),
  ];
  const pending = controls.map((owner, index) =>
    decodePhoto({ id: `photo_${index}`, original: original() }, owner.signal),
  );
  const results = Promise.allSettled(pending);
  await vi.waitFor(() => expect(workers).toHaveLength(2));
  controls[2]!.abort();
  controls[0]!.abort();
  controls[1]!.abort();
  expect((await results).every((result) => result.status === "rejected")).toBe(
    true,
  );
  expect(workers).toHaveLength(2);
  expect(
    workers.every((worker) => worker.terminate.mock.calls.length === 1),
  ).toBe(true);
  const next = new AbortController(),
    request = decodePhoto({ id: "next", original: original() }, next.signal),
    rejected = expect(request).rejects.toThrow();
  await vi.waitFor(() => expect(workers).toHaveLength(3));
  next.abort();
  await rejected;
});
afterEach(() => {
  workers.splice(0);
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it("terminates its owned worker on abort and removes the deadline", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("Worker", WorkerDouble);
  const control = new AbortController();
  const pending = decodePhoto(
    { id: "photo", original: original() },
    control.signal,
  );
  const rejected = expect(pending).rejects.toThrow();
  await vi.waitFor(() => expect(workers).toHaveLength(1));
  control.abort();
  await rejected;
  expect(workers[0]?.terminate).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
});
it("terminates a hung decode exactly at the bounded deadline", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("Worker", WorkerDouble);
  const pending = decodePhoto(
    { id: "photo", original: original() },
    new AbortController().signal,
  );
  const rejected = expect(pending).rejects.toThrow("too long");
  await vi.waitFor(() => expect(workers).toHaveLength(1));
  await vi.advanceTimersByTimeAsync(PHOTO_LIMITS.decodeMs);
  await rejected;
  expect(workers[0]?.terminate).toHaveBeenCalledTimes(1);
});
it("rejects huge originals without constructing a worker", async () => {
  vi.stubGlobal("Worker", WorkerDouble);
  await expect(
    decodePhoto(
      {
        id: "photo",
        original: new Blob([new Uint8Array(PHOTO_LIMITS.original + 1)]),
      },
      new AbortController().signal,
    ),
  ).rejects.toThrow("4 MiB");
  expect(workers).toHaveLength(0);
});
it("terminates a worker on a synchronous transfer/setup failure before releasing its resource slot", async () => {
  vi.useFakeTimers();
  class TransferFailure extends WorkerDouble {
    override postMessage = vi.fn(() => {
      throw new Error("transfer failed");
    });
  }
  vi.stubGlobal("Worker", TransferFailure);
  await expect(
    decodePhoto(
      { id: "photo", original: original() },
      new AbortController().signal,
    ),
  ).rejects.toThrow("transfer failed");
  expect(workers).toHaveLength(1);
  expect(workers[0]!.terminate).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
});
