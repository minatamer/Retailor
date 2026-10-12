import { expect, it } from "vitest";
import { ImageCapacity } from "./image-capacity.js";
it("keeps two active and two waiting foreground jobs, rejects the fifth and removes canceled waiters", async () => {
  const capacity = new ImageCapacity(),
    signal = new AbortController().signal;
  const first = await capacity.enter(signal),
    second = await capacity.enter(signal),
    cancel = new AbortController();
  const rejection = expect(capacity.enter(cancel.signal)).rejects.toThrow();
  const fourth = capacity.enter(signal);
  expect(capacity.counters()).toEqual({ active: 2, waiting: 2 });
  await expect(capacity.enter(signal)).rejects.toThrow("BUSY");
  cancel.abort();
  await rejection;
  expect(capacity.counters()).toEqual({ active: 2, waiting: 1 });
  first();
  const releaseFourth = await fourth;
  first();
  expect(capacity.counters()).toEqual({ active: 2, waiting: 0 });
  second();
  releaseFourth();
  expect(capacity.counters()).toEqual({ active: 0, waiting: 0 });
  await expect(capacity.enter(AbortSignal.abort())).rejects.toThrow();
});
