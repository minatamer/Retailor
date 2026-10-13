import { publicError, type ErrorCode } from "@retailor/contracts/api";

/** Only the public code selects visitor copy; response/exception text is never trusted. */
export class ApiRequestError extends Error {
  constructor(readonly code: ErrorCode) {
    super(publicError(code, "api_request").error.message);
  }
}
