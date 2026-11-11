import { describe, expect, it, vi } from "vitest";
import { animateValue } from "./animated-value";
import { factDisplay } from "./model";

function scene(initial: number) {
  let current = initial;
  let next = 0;
  const frames = new Map<number, (time: number) => void>();
  const values: number[] = [];
  const port = {
    write: vi.fn((value: number) => {
      current = value;
      values.push(value);
    }),
    request: vi.fn((step: (time: number) => void) => {
      frames.set(++next, step);
      return next;
    }),
    cancel: vi.fn((frame: number) => {
      frames.delete(frame);
    }),
  };
  const tick = (time: number) => {
    expect(frames.size).toBe(1);
    const [id, step] = [...frames][0]!;
    frames.delete(id);
    step(time);
  };
  return { port, values, frames, tick, current: () => current };
}

describe("dashboard numeric transitions", () => {
  it.each([
    [39640, 140940],
    [140940, 39640],
    [4, 13],
    [13, 4],
    [-19230, 19230],
    [19230, -19230],
  ])(
    "eases %s to %s monotonically through integer intermediates and finishes exactly",
    (from, to) => {
      const h = scene(from);
      animateValue(h.port, from, to);
      expect(h.values).toEqual([]);
      for (let time = 100; time <= 900; time += 50) h.tick(time);
      expect(h.values[0]).toBe(from);
      expect(h.values.at(-1)).toBe(to);
      expect(new Set(h.values).size).toBeGreaterThan(3);
      expect(h.values.every(Number.isSafeInteger)).toBe(true);
      expect(
        h.values.every(
          (value, i) =>
            !i ||
            (to > from ? value >= h.values[i - 1]! : value <= h.values[i - 1]!),
        ),
      ).toBe(true);
      expect(
        h.values.every(
          (value) => value >= Math.min(from, to) && value <= Math.max(from, to),
        ),
      ).toBe(true);
      expect(h.frames.size).toBe(0);
    },
  );
  it("reverses from the last displayed value and fences a late old frame", () => {
    const h = scene(39640);
    const cancel = animateValue(h.port, h.current(), 140940);
    h.tick(0);
    h.tick(200);
    const displayed = h.current();
    const late = [...h.frames.values()][0]!;
    cancel();
    animateValue(h.port, displayed, 39640);
    late(800);
    expect(h.current()).toBe(displayed);
    h.tick(300);
    expect(h.current()).toBe(displayed);
    h.tick(500);
    expect(h.current()).toBeLessThan(displayed);
    expect(h.current()).toBeGreaterThan(39640);
    h.tick(1100);
    expect(h.current()).toBe(39640);
    expect(h.frames.size).toBe(0);
  });
  it("cancels before/after frames without later writes", () => {
    const h = scene(4);
    const cancel = animateValue(h.port, 4, 13);
    h.tick(0);
    h.tick(200);
    const late = [...h.frames.values()][0]!;
    cancel();
    cancel();
    const count = h.values.length;
    late(800);
    expect(h.values).toHaveLength(count);
    expect(h.port.cancel).toHaveBeenCalledTimes(1);
    expect(h.frames.size).toBe(0);
    const cancelEarly = animateValue(h.port, h.current(), 0);
    const earlyLate = [...h.frames.values()][0]!;
    cancelEarly();
    earlyLate(2000);
    expect(h.values).toHaveLength(count);
    expect(h.frames.size).toBe(0);
  });
  it("does not animate an unchanged total or schedule invalid numeric values", () => {
    const h = scene(0);
    for (const [from, to] of [
      [0, 0],
      [NaN, 1],
      [1, Infinity],
      [1.5, 4],
      [1, Number.MAX_SAFE_INTEGER + 1],
    ])
      animateValue(h.port, from!, to!)();
    expect(h.port.request).not.toHaveBeenCalled();
    expect(h.port.write).not.toHaveBeenCalled();
  });
  it("lands on the exact target after a delayed frame and normalizes negative zero", () => {
    const h = scene(-1);
    animateValue(h.port, -1, 0);
    h.tick(0);
    h.tick(400);
    expect(Object.is(h.current(), -0)).toBe(false);
    h.tick(5000);
    expect(h.current()).toBe(0);
    expect(h.frames.size).toBe(0);
  });
  it("preserves exact formatters for cents, counts, rates, ratings and unavailable data", () => {
    expect(factDisplay({ value: 140940, unit: "usd-cents" })).toBe("$1,409.40");
    expect(factDisplay({ value: -19230, unit: "usd-cents" })).toBe("-$192.30");
    expect(factDisplay({ value: 13, unit: "count" })).toBe("13");
    expect(factDisplay({ value: 1234, unit: "basis-points" })).toBe("12.34%");
    expect(factDisplay({ value: 425, unit: "rating-hundredths" })).toBe(
      "4.25 / 5",
    );
    expect(factDisplay({ value: null, unit: "count" })).toBe("Unavailable");
  });
});
