import { expect, it } from "vitest";
import {
  allocate,
  allocateUnits,
  exactSum,
  exactProduct,
  roundRatio,
} from "./allocation.js";
import { serializedBytes, canonical } from "./graph.js";
it("allocates cents by largest fractional remainder and stable ties", () => {
  expect(allocate(2, [1, 1, 1])).toEqual([1, 1, 0]);
  expect(allocate(1, [1, 2])).toEqual([0, 1]);
  expect(allocate(101, [100, 200, 300])).toEqual([17, 34, 50]);
  expect(allocate(0, [0, 0])).toEqual([0, 0]);
});
it("preserves discounted unit bases rather than re-rounding each refund", () => {
  expect(allocateUnits(100, 3)).toEqual([34, 33, 33]);
  expect(allocateUnits(1, 5)).toEqual([1, 0, 0, 0, 0]);
});
it("keeps large exact products and signed half-up ratios", () => {
  expect(exactProduct(1_000_000_000, 10_000)).toBe(10_000_000_000_000);
  expect(exactSum([10_000_000_000_000, -1])).toBe(9_999_999_999_999);
  expect(roundRatio(1, 2)).toBe(1);
  expect(roundRatio(-1, 2)).toBe(-1);
  expect(roundRatio(1, 3, 10_000)).toBe(3333);
  expect(() => roundRatio(1, 0)).toThrow();
  expect(() => allocate(1, [0])).toThrow();
  expect(() => exactProduct(Number.MAX_SAFE_INTEGER, 2)).toThrow();
});
it("counts Unicode bytes exactly and compares canonical keys without digest trust", () => {
  expect(serializedBytes({ text: "é😀" })).toBe(
    Buffer.byteLength(JSON.stringify({ text: "é😀" })),
  );
  expect(canonical({ b: 2, a: 1 })).toBe(canonical({ a: 1, b: 2 }));
  expect(canonical({ a: [1, 2] })).not.toBe(canonical({ a: [2, 1] }));
});
