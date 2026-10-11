import { afterEach, expect, it, vi } from "vitest";
import { decodePhoto } from "./decode";
import { PHOTO_LIMITS } from "@retailor/contracts/photos";
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
    { id: "photo", original: new Blob(["input"]) },
    control.signal,
  );
  const rejected = expect(pending).rejects.toThrow();
  control.abort();
  await rejected;
  expect(workers[0]?.terminate).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
});
it("terminates a hung decode exactly at the bounded deadline", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("Worker", WorkerDouble);
  const pending = decodePhoto(
    { id: "photo", original: new Blob(["input"]) },
    new AbortController().signal,
  );
  const rejected = expect(pending).rejects.toThrow("too long");
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
