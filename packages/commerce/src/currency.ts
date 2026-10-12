import { MAX_MINOR_AMOUNT } from "@retailor/contracts/core";
import {
  RateDecimalSchema,
  CurrencySchema,
  FX_LIMITS,
  FxSnapshotSchema,
  CurrencyScopeSchema,
  MAX_DISPLAY_MINOR,
} from "@retailor/contracts/currency";
import type {
  Currency,
  CurrencyScope,
  FxSnapshot,
} from "@retailor/contracts/currency";
import { exactSum, exactProduct } from "./allocation.js";
export function parseRate(input: string) {
  const value = RateDecimalSchema.parse(input),
    [whole, fraction = ""] = value.split(".");
  let numerator = BigInt(whole! + fraction),
    denominator = 10n ** BigInt(fraction.length);
  let a = numerator,
    b = denominator;
  while (b) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  numerator /= a;
  denominator /= a;
  const normal = fraction.replace(/0+$/u, "");
  return {
    numerator,
    denominator,
    decimal: normal ? `${whole}.${normal}` : whole!,
  };
}
export function validateSnapshot(
  input: unknown,
  now: number,
  fixtureAllowed = false,
): FxSnapshot {
  const snapshot = FxSnapshotSchema.parse(input);
  if (
    !Number.isSafeInteger(now) ||
    Date.parse(snapshot.fetchedAt) > now ||
    (snapshot.sourceId === "development-fixture" && !fixtureAllowed)
  )
    throw new RangeError("Unavailable reference quote");
  const day = Math.floor(now / 86_400_000),
    rateDay = Date.parse(snapshot.rateDate) / 86_400_000;
  if (rateDay > day || day - rateDay > FX_LIMITS.maxAgeDays)
    throw new RangeError("Stale reference quote");
  parseRate(snapshot.rateDecimal);
  return snapshot;
}
/** Half-up on absolute magnitude; a negative half-cent rounds away from zero. */
export function convertMinor(amount: number, rateDecimal: string) {
  if (!Number.isSafeInteger(amount) || Math.abs(amount) > MAX_MINOR_AMOUNT)
    throw new RangeError("Invalid canonical minor amount");
  const rate = parseRate(rateDecimal),
    product = BigInt(Math.abs(amount)) * rate.numerator;
  const rounded = (2n * product + rate.denominator) / (2n * rate.denominator);
  if (rounded > BigInt(MAX_DISPLAY_MINOR))
    throw new RangeError("Display amount exceeds bound");
  const value = Number(rounded);
  return amount < 0 && value !== 0 ? -value : value;
}
/** Scope is already accepted/fresh by the session owner; historic scopes remain renderable. */
export function displayMinor(amount: number, input: CurrencyScope) {
  const scope = CurrencyScopeSchema.parse(input);
  if (!Number.isSafeInteger(amount) || Math.abs(amount) > MAX_MINOR_AMOUNT)
    throw new RangeError("Invalid canonical minor amount");
  return scope.currency === "USD"
    ? amount
    : convertMinor(amount, scope.snapshot.rateDecimal);
}
export function formatMinor(amount: number, currency: Currency) {
  if (!Number.isSafeInteger(amount) || Math.abs(amount) > MAX_DISPLAY_MINOR)
    throw new RangeError("Invalid displayed minor amount");
  CurrencySchema.parse(currency);
  const absolute = BigInt(Math.abs(amount));
  return `${amount < 0 ? "-" : ""}${currency === "EUR" ? "€" : "$"}${new Intl.NumberFormat("en-US").format(absolute / 100n)}.${(absolute % 100n).toString().padStart(2, "0")}`;
}
export function formatDisplay(amount: number, scope: CurrencyScope) {
  return formatMinor(displayMinor(amount, scope), scope.currency);
}
export function parseDisplay(
  input: string,
): { ok: true; value: number } | { ok: false } {
  const match = /^(0|[1-9]\d{0,10})(?:\.(\d{1,2}))?$/u.exec(input);
  if (!match?.[1]) return { ok: false };
  const amount =
    BigInt(match[1]) * 100n + BigInt((match[2] ?? "").padEnd(2, "0"));
  return amount <= BigInt(MAX_DISPLAY_MINOR)
    ? { ok: true, value: Number(amount) }
    : { ok: false };
}
export interface DisplayComponent {
  id: string;
  usd: number;
  unitUsd?: number;
  quantity?: number;
}
/** Convert the total once. An explicit adjustment reconciles rows and rounded unit × quantity. */
export function projectComponents(
  totalUsd: number,
  components: readonly DisplayComponent[],
  scope: CurrencyScope,
) {
  if (
    !components.length ||
    components.length > FX_LIMITS.componentCount ||
    new Set(components.map((item) => item.id)).size !== components.length ||
    components.some((item) => !/^[a-zA-Z0-9_-]{1,64}$/u.test(item.id)) ||
    exactSum(components.map((item) => item.usd)) !== totalUsd
  )
    throw new RangeError("Invalid component basis");
  const rows = components.map((item) => {
    const aggregate = displayMinor(item.usd, scope);
    if (item.unitUsd === undefined && item.quantity === undefined)
      return { id: item.id, amount: aggregate };
    if (
      item.unitUsd === undefined ||
      item.quantity === undefined ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 5 ||
      item.usd !== exactProduct(item.unitUsd, item.quantity)
    )
      throw new RangeError("Invalid quantity basis");
    return {
      id: item.id,
      amount: exactProduct(displayMinor(item.unitUsd, scope), item.quantity),
    };
  });
  const total = displayMinor(totalUsd, scope),
    roundingAdjustment = exactSum([
      total,
      -exactSum(rows.map((item) => item.amount)),
    ]);
  return {
    currency: scope.currency,
    snapshotId: scope.snapshot?.snapshotId ?? null,
    rows,
    roundingAdjustment,
    total,
  };
}
