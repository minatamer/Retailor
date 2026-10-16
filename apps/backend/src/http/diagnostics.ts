import { isApiRoute } from "@retailor/contracts/api";
import type { ErrorCode } from "@retailor/contracts/api";

export interface FailureDiagnostic {
  schemaVersion: 1;
  event: "request_failure";
  requestId: string;
  operation: string;
  code: ErrorCode;
  status: number;
  exception: string;
  locations: string[];
}
export type DiagnosticSink = (event: FailureDiagnostic) => void;
const names = new Set([
  "Error",
  "TypeError",
  "RangeError",
  "SyntaxError",
  "ZodError",
  "AbortError",
  "OperationFailure",
  "ProviderSchemaRejected",
  "ProviderIncludeRejected",
  "ProviderToolChoiceRejected",
  "ProviderParallelRejected",
  "ProviderInputRejected",
  "ProviderBadRequest",
  "ProviderHttpFailure",
  "ProviderConnectionFailure",
]);
export function failureDiagnostic(
  error: unknown,
  requestId: unknown,
  path: string,
  code: ErrorCode,
  status: number,
): FailureDiagnostic {
  const operation = path.startsWith("/v1/") ? path.slice(4) : "";
  const locations =
    error instanceof Error
      ? (error.stack ?? "")
          .split("\n")
          .slice(1, 9)
          .flatMap((line) => {
            const location = line.match(
              /(?:^|[/\\])([A-Za-z0-9_.-]{1,100}\.[cm]?[jt]s:\d{1,8}:\d{1,8})(?:\)|$)/u,
            )?.[1];
            return location ? [location] : [];
          })
      : [];
  return {
    schemaVersion: 1,
    event: "request_failure",
    requestId:
      typeof requestId === "string" &&
      /^[A-Za-z0-9._-]{1,100}$/u.test(requestId)
        ? requestId
        : "request_unavailable",
    operation: isApiRoute(operation) ? operation : "unknown",
    code,
    status,
    exception:
      error instanceof Error && names.has(error.name) ? error.name : "unknown",
    locations,
  };
}
/** Inert factory; explicit server startup enables private, content-free output. */
export function backendDiagnostics(): DiagnosticSink {
  return (event) => {
    process.stderr.write(`${JSON.stringify(event)}\n`);
  };
}
export function reportFailure(
  sink: DiagnosticSink | undefined,
  event: FailureDiagnostic,
) {
  if (!sink) return;
  try {
    sink(event);
  } catch {
    // Keep diagnostic failures private and never replace the original response.
    try {
      process.stderr.write(
        `${JSON.stringify({ schemaVersion: 1, event: "diagnostic_sink_failure", requestId: event.requestId, operation: event.operation })}\n`,
      );
    } catch {
      /* A failed OS output stream cannot break visitor recovery. */
    }
  }
}
