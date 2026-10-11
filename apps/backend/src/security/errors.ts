import type { ErrorCode } from "@retailor/contracts/api";
export class OperationFailure extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly status: number,
  ) {
    super(code);
  }
}
export function deny(code: ErrorCode, status: number): never {
  throw new OperationFailure(code, status);
}
