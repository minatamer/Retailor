import { expect, it } from "vitest";
import { DecodeCapacity } from "./decode-capacity";
import { PHOTO_LIMITS } from "@retailor/contracts/photos";
it("limits two active decodes and two waiters, removes aborted waiters and releases each slot once", async () => {
  const capacity = new DecodeCapacity(),
    signal = new AbortController().signal;
  const first = await capacity.enter(1000, signal),
    second = await capacity.enter(1000, signal),
    cancel = new AbortController();
  const rejected = expect(capacity.enter(1000, cancel.signal)).rejects.toThrow(
    "cancelled",
  );
  let entered = false;
  const next = capacity.enter(1000, signal).then((release) => {
    entered = true;
    return release;
  });
  await expect(capacity.enter(1000, signal)).rejects.toThrow("busy");
  cancel.abort();
  await rejected;
  expect(entered).toBe(false);
  first();
  const releaseNext = await next;
  first();
  let fourth = false;
  const waiting = capacity.enter(1000, signal).then((release) => {
    fourth = true;
    return release;
  });
  await Promise.resolve();
  expect(fourth).toBe(false);
  second();
  (await waiting)();
  releaseNext();
  (await capacity.enter(1000, signal))();
});
it("a large valid original takes the shared pixel budget alone, with FIFO admission and cancellation", async () => {
  const capacity = new DecodeCapacity(),
    signal = new AbortController().signal;
  const first = await capacity.enter(PHOTO_LIMITS.activeDecodePixels, signal);
  let started = false;
  const next = capacity.enter(1, signal).then((release) => {
    started = true;
    return release;
  });
  await Promise.resolve();
  expect(started).toBe(false);
  await expect(
    capacity.enter(PHOTO_LIMITS.activeDecodePixels + 1, signal),
  ).rejects.toThrow("envelope");
  first();
  (await next)();
  await expect(capacity.enter(1, AbortSignal.abort())).rejects.toThrow();
  (await capacity.enter(PHOTO_LIMITS.activeDecodePixels, signal))();
});
