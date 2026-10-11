import { MAX_MINOR_AMOUNT } from "@retailor/contracts/core";
export type MoneyResult =
  | { ok: true; value: number }
  | { ok: false; reason: "invalid" | "out-of-range" };
export function parseUsd(input: string): MoneyResult {
  const match = /^(0|[1-9]\d{0,8})(?:\.(\d{1,2}))?$/u.exec(input);
  if (!match?.[1]) return { ok: false, reason: "invalid" };
  const amount =
    BigInt(match[1]) * 100n + BigInt((match[2] ?? "").padEnd(2, "0"));
  if (amount > BigInt(MAX_MINOR_AMOUNT))
    return { ok: false, reason: "out-of-range" };
  return { ok: true, value: Number(amount) };
}
export function formatUsd(amount: number): string {
  if (!Number.isSafeInteger(amount) || Math.abs(amount) > MAX_MINOR_AMOUNT)
    throw new RangeError("Invalid minor amount");
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount / 100);
}
