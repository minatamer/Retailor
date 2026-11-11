import type { ShopifyCleanup } from "./cleanup.js";
import { CLEANUP } from "./cleanup.js";
import { OperationFailure } from "../security/errors.js";
import { randomUUID } from "node:crypto";

export function cleanupDiagnostic(code: string, calls = 0, visited = 0) {
  try {
    process.stderr.write(
      `${JSON.stringify({ schemaVersion: 1, event: "shopify_cleanup", operation: "sweep", code, calls, visited, requestId: `req_${randomUUID()}`, source: "shopify/runner.ts" })}\n`,
    );
  } catch {
    /* OS output failure cannot lose cleanup ownership. */
  }
}

/** Explicit startup only; import/composition never starts a timer or opens state. */
export function startShopifyCleanup(
  cleanup: ShopifyCleanup,
  diagnostic = cleanupDiagnostic,
) {
  const owner = new AbortController();
  let pending: Promise<void> | undefined;
  let requested = false;
  const run = () => {
    if (owner.signal.aborted || pending) return;
    pending = cleanup
      .sweep(owner.signal)
      .then(
        (result) => {
          diagnostic(
            result.claimed ? "completed" : "leased",
            result.calls,
            result.visited,
          );
        },
        (error: unknown) => {
          diagnostic(
            error instanceof OperationFailure ? error.code : "UNAVAILABLE",
          );
        },
      )
      .finally(() => {
        pending = undefined;
        if (requested && !owner.signal.aborted) {
          requested = false;
          run();
        }
      });
  };
  const detach = cleanup.onRequested(() => {
    if (owner.signal.aborted) return;
    if (pending) requested = true;
    else run();
  });
  run();
  const timer = setInterval(run, CLEANUP.cadenceMs);
  timer.unref();
  return async () => {
    detach();
    clearInterval(timer);
    owner.abort();
    await pending;
  };
}
