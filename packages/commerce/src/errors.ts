export type CommerceErrorCode =
  | "invalid"
  | "relation"
  | "limit"
  | "expired"
  | "stale"
  | "replay"
  | "unavailable-photo"
  | "stock"
  | "price-changed"
  | "transition"
  | "refund-limit"
  | "duplicate"
  | "not-found"
  | "undo"
  | "amount";
export class CommerceError extends Error {
  constructor(
    public readonly code: CommerceErrorCode,
    message: string,
  ) {
    super(message);
  }
}
export function ensure(
  condition: unknown,
  code: CommerceErrorCode,
  message: string,
): asserts condition {
  if (!condition) throw new CommerceError(code, message);
}
export function unique(
  values: readonly (string | number)[],
  message = "Repeated identity.",
) {
  ensure(new Set(values).size === values.length, "duplicate", message);
}
