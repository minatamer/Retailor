import type express from "express";
import type { Express } from "express";
import {
  RecognitionResultSchema,
  RECOGNITION_LIMITS,
} from "@retailor/contracts/recognition";
import type { PaidAdmission } from "../security/admission.js";
import type { CatalogueProvider } from "./provider.js";
import type { CatalogueDraft } from "@retailor/contracts/catalogue";
import type { ErrorCode } from "@retailor/contracts/api";
import type { DiagnosticSink } from "../http/diagnostics.js";
import { reportDiagnostic } from "../http/diagnostics.js";
import { catalogueDiagnostic } from "./diagnostics.js";
import type { CataloguePhase } from "./diagnostics.js";
import { OperationFailure, deny } from "../security/errors.js";
import { receiveCatalogue } from "./multipart.js";
import { prepareProviderImages, type SanitizerPorts } from "./sanitize.js";
import { reconcileCatalogue } from "./reconcile.js";
import { safetyCookie } from "../security/safety-cookie.js";
export interface RecognitionRuntime {
  admission: PaidAdmission;
  provider: CatalogueProvider;
  sanitizer?: SanitizerPorts;
}
/** Allow only a small already-in-flight tail to drain so a limit error can reach
 * the client. An unbounded/slow remainder is closed, never buffered or decoded. */
async function drainRejected(req: express.Request) {
  if (req.complete) return true;
  return await new Promise<boolean>((resolve) => {
    let settled = false,
      bytes = 0;
    const finish = (complete: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      req.removeListener("data", data);
      req.removeListener("end", end);
      req.removeListener("aborted", abort);
      if (!complete) req.pause();
      resolve(complete);
    };
    const data = (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > 65536) finish(false);
    };
    const end = () => finish(true),
      abort = () => finish(false);
    const timer = setTimeout(() => finish(false), 250);
    req.on("data", data);
    req.once("end", end);
    req.once("aborted", abort);
    req.resume();
  });
}
export function recognitionRoutes(
  app: Express,
  runtime: RecognitionRuntime | undefined,
  diagnostics?: DiagnosticSink,
) {
  const enabled: express.RequestHandler = (_req, _res, next) =>
    runtime ? next() : next(new OperationFailure("UNAVAILABLE", 503));
  app.post("/v1/catalogue/interpret", enabled, async (req, res) => {
    const owned = new AbortController(),
      timer = setTimeout(() => owned.abort(), RECOGNITION_LIMITS.deadlineMs);
    const abort = () => {
      if (!res.writableFinished) owned.abort();
    };
    res.on("close", abort);
    let lease: ReturnType<PaidAdmission["begin"]> | undefined;
    let files: Map<string, Uint8Array> | undefined,
      images: Map<string, Uint8Array> | undefined;
    const started = performance.now();
    let providerStarted: number | undefined,
      providerMs: number | null = null,
      observation: unknown,
      draft: CatalogueDraft | undefined,
      phase: CataloguePhase = "preparing_images",
      code: ErrorCode | null = null;
    try {
      const cookie = safetyCookie(req.headers.cookie);
      if (!cookie) return deny("FORBIDDEN", 403);
      const safety = runtime!.admission.safety(cookie);
      if (safety.cookie) return deny("FORBIDDEN", 403);
      const input = await receiveCatalogue(
        req,
        runtime!.admission,
        safety.identity,
        owned.signal,
      );
      lease = input.lease;
      files = input.files;
      try {
        images = await prepareProviderImages(
          lease.action.photos.map((photo) => photo.derivative),
          input.files,
          owned.signal,
          runtime!.sanitizer,
        );
      } catch (error) {
        if (!owned.signal.aborted && error instanceof OperationFailure)
          throw error;
        return deny(
          owned.signal.aborted ? "DEADLINE" : "INVALID_INPUT",
          owned.signal.aborted ? 504 : 400,
        );
      }
      input.files.clear();
      owned.signal.throwIfAborted();
      lease.dispatch();
      phase = "interpreting";
      providerStarted = performance.now();
      try {
        observation = await runtime!.provider.interpret(
          lease.action,
          images,
          owned.signal,
          lease.recordUsage,
        );
      } finally {
        providerMs = performance.now() - providerStarted;
      }
      images.clear();
      owned.signal.throwIfAborted();
      phase = "reconciling";
      draft = reconcileCatalogue(observation, lease.action);
      res.json(
        RecognitionResultSchema.parse({
          schemaVersion: 1,
          workspaceId: lease.action.workspaceId,
          operationId: lease.action.operationId,
          inputRevision: lease.action.inputRevision,
          mode: "live",
          draft,
        }),
      );
      phase = "completed";
    } catch (error) {
      code = owned.signal.aborted
        ? "DEADLINE"
        : error instanceof OperationFailure
          ? error.code
          : "UPSTREAM_FAILED";
      // A paused rejected upload must not retain an open request indefinitely.
      if (!(await drainRejected(req))) {
        res.set("Connection", "close");
        res.once("finish", () => req.resume());
      }
      if (owned.signal.aborted) {
        code = "DEADLINE";
        return deny("DEADLINE", 504);
      }
      throw error;
    } finally {
      files?.clear();
      images?.clear();
      lease?.finish();
      clearTimeout(timer);
      owned.abort();
      res.removeListener("close", abort);
      if (lease && diagnostics)
        reportDiagnostic(
          diagnostics,
          catalogueDiagnostic({
            requestId: res.locals.requestId,
            action: lease.action,
            observation,
            ...(phase === "completed" && draft ? { draft } : {}),
            phase,
            code,
            elapsedMs: performance.now() - started,
            providerMs,
          }),
        );
    }
  });
}
