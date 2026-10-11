import { publicError } from "@retailor/contracts/api";
import type { ErrorCode } from "@retailor/contracts/api";
export class CatalogueRequestError extends Error {
  constructor(code: ErrorCode) {
    super(publicError(code, "catalogue_request").error.message);
  }
}
