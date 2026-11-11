import { describe, expect, it } from "vitest";
import { curvePath } from "./curve";

type Point = { x: number; y: number };
function readCurve(points: readonly (readonly number[])[]) {
  const path = curvePath(points);
  const first = path
    .match(/^M([^C]+)/)![1]!
    .trim()
    .split(/[,\s]+/)
    .map(Number);
  let start = { x: first[0]!, y: first[1]! };
  return [...path.matchAll(/C([^C]+)/g)].map((match) => {
    const n = match[1]!
      .trim()
      .split(/[,\s]+/)
      .map(Number);
    const segment = {
      from: start,
      c1: { x: n[0]!, y: n[1]! },
      c2: { x: n[2]!, y: n[3]! },
      to: { x: n[4]!, y: n[5]! },
    };
    start = segment.to;
    return segment;
  });
}
function interpolate(from: Point, c1: Point, c2: Point, to: Point, t: number) {
  const u = 1 - t;
  return {
    x:
      u ** 3 * from.x +
      3 * u ** 2 * t * c1.x +
      3 * u * t ** 2 * c2.x +
      t ** 3 * to.x,
    y:
      u ** 3 * from.y +
      3 * u ** 2 * t * c1.y +
      3 * u * t ** 2 * c2.y +
      t ** 3 * to.y,
  };
}

describe("shape-preserving dashboard curve", () => {
  it.each([
    [
      [0, 0],
      [1, 100],
      [2, 0],
      [3, 80],
      [4, 0],
    ],
    [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 50],
      [4, 50],
    ],
    [
      [0, -30],
      [1, 40],
      [2, -10],
      [3, 0],
    ],
    [
      [0, 0],
      [1, 1],
      [2, 50],
      [3, 51],
    ],
    [
      [0, 90],
      [1, 80],
      [2, 5],
      [3, 0],
    ],
    [
      [0, 0],
      [0.01, 40],
      [40, 41],
      [41, 42],
    ],
  ])(
    "passes through every observation without overshoot for %j",
    (...points) => {
      const curves = readCurve(points);
      expect(curves).toHaveLength(points.length - 1);
      curves.forEach((curve, index) => {
        expect(curve.from).toEqual({
          x: points[index]![0],
          y: points[index]![1],
        });
        expect(curve.to).toEqual({
          x: points[index + 1]![0],
          y: points[index + 1]![1],
        });
        let previous = curve.from;
        for (let step = 1; step <= 100; step++) {
          const point = interpolate(
            curve.from,
            curve.c1,
            curve.c2,
            curve.to,
            step / 100,
          );
          expect(Number.isFinite(point.x) && Number.isFinite(point.y)).toBe(
            true,
          );
          expect(point.x).toBeGreaterThan(previous.x);
          expect(point.y).toBeGreaterThanOrEqual(
            Math.min(curve.from.y, curve.to.y) - 1e-10,
          );
          expect(point.y).toBeLessThanOrEqual(
            Math.max(curve.from.y, curve.to.y) + 1e-10,
          );
          if (curve.to.y >= curve.from.y)
            expect(point.y).toBeGreaterThanOrEqual(previous.y - 1e-10);
          else expect(point.y).toBeLessThanOrEqual(previous.y + 1e-10);
          previous = point;
        }
      });
    },
  );
  it("joins segments with continuous slopes and horizontal tangents at peaks/valleys", () => {
    const curves = readCurve([
      [0, 0],
      [1, 70],
      [2, 10],
      [3, 30],
      [5, 80],
      [8, 81],
    ]);
    for (let i = 0; i < curves.length - 1; i++) {
      const left = curves[i]!,
        right = curves[i + 1]!;
      const arriving = (left.to.y - left.c2.y) / (left.to.x - left.c2.x);
      const leaving = (right.c1.y - right.from.y) / (right.c1.x - right.from.x);
      expect(arriving).toBeCloseTo(leaving, 10);
      if (i < 2) expect(arriving).toBe(0);
    }
  });
  it("keeps zero runs exactly flat and safely collapses32 padded endpoints without mutating input", () => {
    const observations = Object.freeze([
      Object.freeze([0, 0]),
      Object.freeze([1, 0]),
      Object.freeze([2, 40]),
    ]);
    const padded = Object.freeze(
      Array.from({ length: 32 }, (_, i) => observations[Math.min(i, 2)]!),
    );
    const curves = readCurve(padded);
    expect(curves).toHaveLength(2);
    expect(curves[0]!.c1.y).toBe(0);
    expect(curves[0]!.c2.y).toBe(0);
    expect(curves.at(-1)!.to).toEqual({ x: 2, y: 40 });
    expect(padded).toHaveLength(32);
    expect(curvePath(padded)).not.toMatch(/NaN|Infinity/);
  });
  it("handles empty/single observations and reproduces a two-point linear trend exactly", () => {
    expect(curvePath([])).toBe("");
    expect(curvePath([[8, 12]])).toBe("M8,12");
    const curve = readCurve([
      [0, 5],
      [4, 9],
    ])[0]!;
    for (let step = 0; step <= 10; step++) {
      const point = interpolate(
        curve.from,
        curve.c1,
        curve.c2,
        curve.to,
        step / 10,
      );
      expect(point.y).toBeCloseTo(point.x + 5, 10);
    }
  });
  it("refuses nonfinite, unordered or conflicting duplicate coordinates", () => {
    for (const points of [
      [[0, NaN]],
      [[Infinity, 0]],
      [[0]],
      [
        [1, 0],
        [0, 1],
      ],
      [
        [0, 0],
        [0, 1],
      ],
    ])
      expect(curvePath(points)).toBe("");
  });
});
