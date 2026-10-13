import { afterEach, expect, it, vi } from "vitest";
import { nextScene, scheduleScene } from "./choreography";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it("holds the source reveal and each complete style before moving through the matching pages and looping", () => {
  vi.useFakeTimers();
  const move = vi.fn();
  const stop = scheduleScene(0, move);
  vi.advanceTimersByTime(2599);
  expect(move).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1);
  expect(move).toHaveBeenCalledWith(1);
  stop();
  scheduleScene(3, move);
  vi.advanceTimersByTime(5599);
  expect(move).toHaveBeenCalledOnce();
  vi.advanceTimersByTime(1);
  expect(move).toHaveBeenLastCalledWith(4);
  expect(nextScene(4)).toBe(5);
  expect(nextScene(5)).toBe(0);
  expect(() => nextScene(6)).toThrow();
  expect(() => nextScene(-1)).toThrow();
});
it("cancels stale queued transitions and owns no timer after disposal or manual selection", () => {
  vi.useFakeTimers();
  const move = vi.fn();
  let late!: () => void;
  const stop = scheduleScene(1, move, {
    set: (callback, delay) => {
      late = callback;
      return setTimeout(callback, delay);
    },
    clear: clearTimeout,
  });
  expect(vi.getTimerCount()).toBe(1);
  stop();
  expect(vi.getTimerCount()).toBe(0);
  late();
  expect(move).not.toHaveBeenCalled();
});
it("calls the host timer cleanup without binding it to the clock wrapper", () => {
  vi.useFakeTimers();
  const original = clearTimeout;
  vi.stubGlobal(
    "clearTimeout",
    function (this: unknown, timer: ReturnType<typeof setTimeout>) {
      if (this !== undefined) throw new Error("Illegal host receiver");
      original(timer);
    },
  );
  const stop = scheduleScene(1, vi.fn());
  expect(() => stop()).not.toThrow();
  expect(vi.getTimerCount()).toBe(0);
});
