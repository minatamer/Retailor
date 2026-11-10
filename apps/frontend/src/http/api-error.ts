import { publicError, type ErrorCode } from "@retailor/contracts/api";

/** Only the public code selects visitor copy; response/exception text is never trusted. */
export class ApiRequestError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly requestId?: string,
    readonly retryAfterMs = 0,
  ) {
    super(publicError(code, "api_request").error.message);
  }
}
