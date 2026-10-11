import { MAX_MINOR_AMOUNT } from "@retailor/contracts/core";
import { ensure } from "./errors.js";

/** Largest fractional remainder first; ties retain original stable component order. */
export function allocate(total: number, weights: readonly number[]): number[] {
  ensure(
    Number.isSafeInteger(total) && total >= 0 && total <= MAX_MINOR_AMOUNT,
    "amount",
    "Invalid allocation amount.",
  );
  ensure(
    weights.length > 0 &&
      weights.length <= 320 &&
      weights.every(
        (weight) =>
          Number.isSafeInteger(weight) &&
          weight >= 0 &&
          weight <= MAX_MINOR_AMOUNT,
      ),
    "amount",
    "Invalid allocation weights.",
  );
  const denominator = weights.reduce((sum, value) => sum + BigInt(value), 0n);
  ensure(
    denominator > 0n || total === 0,
    "amount",
    "A positive allocation needs a positive basis.",
  );
  if (!denominator) return weights.map(() => 0);
  const result = weights.map((value) =>
    Number((BigInt(total) * BigInt(value)) / denominator),
  );
  const order = weights
    .map((value, index) => ({
      index,
      remainder: (BigInt(total) * BigInt(value)) % denominator,
    }))
    .sort((a, b) =>
      a.remainder === b.remainder
        ? a.index - b.index
        : a.remainder > b.remainder
          ? -1
          : 1,
    );
  const remaining = total - result.reduce((sum, value) => sum + value, 0);
  for (let index = 0; index < remaining; index++)
    result[order[index]!.index]!++;
  return result;
}
/** Earlier unit indices receive the extra cent; persist these exact unit bases. */
export function allocateUnits(net: number, quantity: number): number[] {
  ensure(
    Number.isSafeInteger(net) &&
      net >= 0 &&
      net <= MAX_MINOR_AMOUNT &&
      Number.isInteger(quantity) &&
      quantity >= 1 &&
      quantity <= 5,
    "amount",
    "Invalid unit allocation.",
  );
  const base = Math.floor(net / quantity),
    remainder = net % quantity;
  return Array.from(
    { length: quantity },
    (_, index) => base + (index < remainder ? 1 : 0),
  );
}
export function exactSum(values: readonly number[]) {
  const result = values.reduce((sum, value) => {
    ensure(Number.isSafeInteger(value), "amount", "Invalid exact amount.");
    return sum + BigInt(value);
  }, 0n);
  ensure(
    result <= BigInt(Number.MAX_SAFE_INTEGER) &&
      result >= -BigInt(Number.MAX_SAFE_INTEGER),
    "amount",
    "Aggregate exceeds exact integer range.",
  );
  return Number(result);
}
export function exactProduct(a: number, b: number) {
  ensure(
    Number.isSafeInteger(a) && Number.isSafeInteger(b),
    "amount",
    "Invalid exact factor.",
  );
  const value = BigInt(a) * BigInt(b);
  ensure(
    value <= BigInt(Number.MAX_SAFE_INTEGER) &&
      value >= -BigInt(Number.MAX_SAFE_INTEGER),
    "amount",
    "Aggregate exceeds exact integer range.",
  );
  return Number(value);
}
export function roundRatio(numerator: number, denominator: number, scale = 1) {
  ensure(
    Number.isSafeInteger(numerator) &&
      Number.isSafeInteger(denominator) &&
      denominator > 0 &&
      Number.isSafeInteger(scale) &&
      scale > 0,
    "amount",
    "Invalid rational basis.",
  );
  const sign = numerator < 0 ? -1n : 1n,
    n = BigInt(Math.abs(numerator)) * BigInt(scale),
    d = BigInt(denominator);
  const value = sign * ((n * 2n + d) / (d * 2n));
  ensure(
    value <= BigInt(Number.MAX_SAFE_INTEGER) &&
      value >= -BigInt(Number.MAX_SAFE_INTEGER),
    "amount",
    "Ratio exceeds exact integer range.",
  );
  return Number(value);
}
