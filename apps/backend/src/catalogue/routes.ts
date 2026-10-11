import express from "express";
import type { Express } from "express";
import {
  AdmissionRequestSchema,
  RecognitionResultSchema,
  RECOGNITION_LIMITS,
} from "@retailor/contracts/recognition";
import type { PaidAdmission } from "../security/admission.js";
import type { CatalogueProvider } from "./provider.js";
import { OperationFailure, deny } from "../security/errors.js";
import { receiveCatalogue } from "./multipart.js";
import { prepareProviderImages } from "./sanitize.js";
import { reconcileCatalogue } from "./reconcile.js";
import { publicError } from "@retailor/contracts/api";
export interface RecognitionRuntime {
  admission: PaidAdmission;
  provider: CatalogueProvider;
}
export const SAFETY_COOKIE = "retailor_safety";
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
export function safetyCookie(header: string | undefined) {
  if (!header || header.length > 4096) return undefined;
  const values = header
    .split(";")
    .map((value) => value.trim())
    .filter((value) => value.startsWith(`${SAFETY_COOKIE}=`));
  return values.length === 1 &&
    /^[A-Za-z0-9_-]+\.[a-f0-9]{64}$/u.test(
      values[0]!.slice(SAFETY_COOKIE.length + 1),
    )
    ? values[0]!.slice(SAFETY_COOKIE.length + 1)
    : undefined;
}
export function recognitionRoutes(
  app: Express,
  runtime: RecognitionRuntime | undefined,
  frontendOrigin: string,
) {
  const enabled: express.RequestHandler = (_req, _res, next) =>
    runtime ? next() : next(new OperationFailure("UNAVAILABLE", 503));
  const admissionDeadline: express.RequestHandler = (req, res, next) => {
    const controller = new AbortController();
    res.locals.admissionSignal = controller.signal;
    const timer = setTimeout(() => {
      controller.abort();
      if (!res.headersSent) {
        res.set("Connection", "close");
        res.once("finish", () => req.resume());
        res.status(504).json(publicError("DEADLINE", res.locals.requestId));
      }
    }, 8_000);
    const cleanup = () => {
      clearTimeout(timer);
      controller.abort();
    };
    res.once("close", cleanup);
    res.once("finish", cleanup);
    next();
  };
  app.post(
    "/v1/admission",
    enabled,
    admissionDeadline,
    express.json({
      limit: RECOGNITION_LIMITS.metadata,
      strict: true,
      type: "application/json",
    }),
    async (req, res) => {
      const signal = res.locals.admissionSignal as AbortSignal;
      const parsed = AdmissionRequestSchema.safeParse(req.body);
      if (!parsed.success) return deny("INVALID_INPUT", 400);
      const safety = runtime!.admission.safety(
        safetyCookie(req.headers.cookie),
      );
      const result = await runtime!.admission.admit(
        parsed.data.action,
        parsed.data.challengeProof,
        safety.identity,
        signal,
      );
      signal.throwIfAborted();
      if (safety.cookie)
        res.cookie(SAFETY_COOKIE, safety.cookie, {
          httpOnly: true,
          sameSite: "strict",
          secure: frontendOrigin.startsWith("https:"),
          maxAge: 7_200_000,
          path: "/api/retailor/v1",
        });
      res.json(result);
    },
  );
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
        );
      } catch {
        return deny(
          owned.signal.aborted ? "DEADLINE" : "INVALID_INPUT",
          owned.signal.aborted ? 504 : 400,
        );
      }
      input.files.clear();
      owned.signal.throwIfAborted();
      lease.dispatch();
      const observation = await runtime!.provider.interpret(
        lease.action,
        images,
        owned.signal,
        lease.recordUsage,
      );
      images.clear();
      owned.signal.throwIfAborted();
      const draft = reconcileCatalogue(observation, lease.action);
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
    } catch (error) {
      // A paused rejected upload must not retain an open request indefinitely.
      if (!(await drainRejected(req))) {
        res.set("Connection", "close");
        res.once("finish", () => req.resume());
      }
      if (owned.signal.aborted) return deny("DEADLINE", 504);
      throw error;
    } finally {
      files?.clear();
      images?.clear();
      lease?.finish();
      clearTimeout(timer);
      owned.abort();
      res.removeListener("close", abort);
    }
  });
}
