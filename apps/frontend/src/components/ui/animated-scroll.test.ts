import { describe, expect, it, vi } from "vitest";
import { animateScroll } from "./animated-scroll";
import type { ScrollAnimationPort } from "./animated-scroll";

function scene(initial = 100) {
  let position = initial;
  let next = 0;
  const frames = new Map<number, (time: number) => void>();
  const values: number[] = [];
  const port: ScrollAnimationPort = {
    position: () => position,
    write: vi.fn((top) => {
      position = top;
      values.push(top);
    }),
    request: vi.fn((step) => {
      frames.set(++next, step);
      return next;
    }),
    cancel: vi.fn((id) => {
      frames.delete(id);
    }),
  };
  const tick = (time: number) => {
    expect(frames.size).toBe(1);
    const [id, step] = [...frames][0]!;
    frames.delete(id);
    step(time);
  };
  return { port, frames, values, tick, position: () => position };
}

describe("authored scroll animation", () => {
  it("passes through intermediate positions for800ms and completes once with no pending frame", () => {
    const h = scene(),
      finished = vi.fn();
    animateScroll(h.port, 1100, 800, finished);
    expect(h.values).toEqual([]);
    h.tick(1000);
    expect(h.position()).toBe(100);
    h.tick(1200);
    const quarter = h.position();
    expect(quarter).toBeGreaterThan(100);
    expect(quarter).toBeLessThan(1100);
    h.tick(1400);
    expect(h.position()).toBeGreaterThan(quarter);
    expect(h.position()).toBeLessThan(1100);
    h.tick(1799);
    expect(finished).not.toHaveBeenCalled();
    h.tick(1800);
    expect(h.position()).toBe(1100);
    expect(finished).toHaveBeenCalledTimes(1);
    expect(h.frames.size).toBe(0);
  });
  it("animates upward and clamps a delayed final frame exactly to its destination", () => {
    const h = scene(1000),
      finished = vi.fn();
    animateScroll(h.port, 0, 800, finished);
    h.tick(0);
    h.tick(400);
    expect(h.position()).toBeGreaterThan(0);
    expect(h.position()).toBeLessThan(1000);
    h.tick(5000);
    expect(h.position()).toBe(0);
    expect(h.values.every((top) => top >= 0 && top <= 1000)).toBe(true);
    expect(finished).toHaveBeenCalledTimes(1);
    expect(h.frames.size).toBe(0);
  });
  it("cancels before the first frame and ignores an already captured late callback", () => {
    const h = scene(),
      finished = vi.fn();
    const cancel = animateScroll(h.port, 1000, 800, finished);
    const late = [...h.frames.values()][0]!;
    cancel();
    cancel();
    late(1000);
    expect(h.port.cancel).toHaveBeenCalledTimes(1);
    expect(h.frames.size).toBe(0);
    expect(h.values).toEqual([]);
    expect(finished).not.toHaveBeenCalled();
  });
  it("replaces an interrupted scroll from the current position without reviving its old owner", () => {
    const h = scene(0),
      oldFinished = vi.fn(),
      finished = vi.fn();
    const cancel = animateScroll(h.port, 1000, 800, oldFinished);
    h.tick(0);
    h.tick(200);
    const interrupted = h.position(),
      late = [...h.frames.values()][0]!;
    cancel();
    animateScroll(h.port, 250, 800, finished);
    late(800);
    expect(h.position()).toBe(interrupted);
    h.tick(1000);
    expect(h.position()).toBe(interrupted);
    h.tick(1400);
    expect(h.position()).toBeGreaterThan(250);
    expect(h.position()).toBeLessThan(interrupted);
    h.tick(1800);
    expect(h.position()).toBe(250);
    expect(oldFinished).not.toHaveBeenCalled();
    expect(finished).toHaveBeenCalledTimes(1);
    expect(h.frames.size).toBe(0);
  });
  it.each([
    [0, 450],
    [Infinity, 800],
    [10000, 1200],
  ])("keeps duration%s finite and animated for%s ms", (requested, duration) => {
    const h = scene(0),
      finished = vi.fn();
    animateScroll(h.port, 1000, requested, finished);
    h.tick(0);
    h.tick(duration / 2);
    expect(h.position()).toBeGreaterThan(0);
    expect(h.position()).toBeLessThan(1000);
    expect(finished).not.toHaveBeenCalled();
    h.tick(duration);
    expect(finished).toHaveBeenCalledTimes(1);
    expect(h.frames.size).toBe(0);
  });
  it.each([NaN, Infinity])(
    "does not schedule an invalid destination%s",
    (top) => {
      const h = scene();
      animateScroll(h.port, top)();
      expect(h.frames.size).toBe(0);
      expect(h.values).toEqual([]);
    },
  );
});
