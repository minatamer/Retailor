import { APIError, APIConnectionTimeoutError } from "openai";
import { OperationFailure } from "../security/errors.js";

const accountCodes = new Set([
  "insufficient_quota",
  "credit_balance_exhausted",
  "project_spend_limit_exceeded",
  "organization_spend_limit_exceeded",
  "organization_usage_limit_exceeded",
  "billing_hard_limit_reached",
  "model_not_found",
  "invalid_api_key",
]);
/** Raw SDK messages, headers, IDs and payload never cross the product port. */
export function providerFailure(
  error: unknown,
  signal: AbortSignal,
): OperationFailure {
  if (signal.aborted || error instanceof APIConnectionTimeoutError)
    return new OperationFailure("DEADLINE", 504);
  if (error instanceof OperationFailure) return error;
  if (error instanceof APIError) {
    if (
      error.status === 401 ||
      error.status === 403 ||
      error.status === 404 ||
      accountCodes.has(error.code ?? "") ||
      error.type === "insufficient_quota" ||
      (error.status === 400 && error.param === "service_tier")
    )
      return new OperationFailure("OPERATOR_REQUIRED", 503);
    if (error.status === 429) return new OperationFailure("BUSY", 429);
  }
  return new OperationFailure("UPSTREAM_FAILED", 502);
}
