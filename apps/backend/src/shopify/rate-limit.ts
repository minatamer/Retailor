import { OperationFailure } from "../security/errors.js";
export class ShopifyRateLimit extends OperationFailure {
  constructor(readonly retryAfterMs: number) {
    super("BUSY", 429);
  }
}
export function shopifyRetryAfter(value: string | null, now: number) {
  const milliseconds =
    value && /^\d{1,6}$/u.test(value)
      ? Number(value) * 1000
      : value
        ? Date.parse(value) - now
        : 60000;
  return Math.min(
    3600000,
    Math.max(1000, Number.isFinite(milliseconds) ? milliseconds : 60000),
  );
}
