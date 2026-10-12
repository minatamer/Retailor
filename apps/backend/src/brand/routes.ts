import express from "express";
import { LOGO_LIMITS, type LogoRequest } from "@retailor/contracts/brand";
import { publicError } from "@retailor/contracts/api";
import type { PaidAdmission } from "../security/admission.js";
import { safetyCookie } from "../security/safety-cookie.js";
import { deny, OperationFailure } from "../security/errors.js";
import { prepareLogoContext } from "./context.js";
import { generateLogos } from "./service.js";
import type { LogoProvider } from "./provider.js";
import { randomUUID } from "node:crypto";

export interface LogoRuntime {
  mode: "fake" | "live";
  provider: LogoProvider;
  admission?: PaidAdmission;
}
export function logoRoutes(
  app: express.Express,
  runtime: LogoRuntime | undefined,
) {
  const workspaces = new Map<
    string,
    {
      createdAt: string;
      expiresAt: string;
      batches: number;
      operations: Set<string>;
      busy: boolean;
    }
  >();
  let active = 0;
  const enabled: express.RequestHandler = (_req, _res, next) =>
    runtime ? next() : next(new OperationFailure("UNAVAILABLE", 503));
  const deadline: express.RequestHandler = (req, res, next) => {
    const owner = new AbortController();
    res.locals.logoSignal = owner.signal;
    const timer = setTimeout(() => {
      owner.abort();
      if (!res.headersSent) {
        res.set("Connection", "close");
        res.once("finish", () => req.resume());
        res.status(504).json(publicError("DEADLINE", res.locals.requestId));
      }
    }, LOGO_LIMITS.deadlineMs);
    const cleanup = () => {
      clearTimeout(timer);
      owner.abort();
    };
    res.once("close", cleanup);
    res.once("finish", cleanup);
    next();
  };
  app.post(
    "/v1/brand/logos",
    enabled,
    deadline,
    express.json({
      limit: LOGO_LIMITS.bodyBytes,
      strict: true,
      type: "application/json",
      inflate: false,
    }),
    async (req, res) => {
      const request: LogoRequest = prepareLogoContext(
        req.body,
        new Date().toISOString(),
      );
      if (request.mode !== runtime!.mode) return deny("FORBIDDEN", 403);
      const signal = res.locals.logoSignal as AbortSignal;
      let lease: ReturnType<PaidAdmission["beginLogos"]> | undefined;
      let fake: ReturnType<typeof workspaces.get>;
      let ownsFake = false;
      try {
        if (request.mode === "live") {
          if (!runtime!.admission || !request.action || !request.grant)
            return deny("UNAVAILABLE", 503);
          const cookie = safetyCookie(req.headers.cookie);
          if (!cookie) return deny("FORBIDDEN", 403);
          const safety = runtime!.admission.safety(cookie);
          if (safety.cookie) return deny("FORBIDDEN", 403);
          lease = runtime!.admission.beginLogos(
            request.action,
            request.grant,
            safety.identity,
          );
        } else {
          const now = new Date().toISOString();
          for (const [id, record] of workspaces)
            if (!record.busy && record.expiresAt <= now) workspaces.delete(id);
          fake = workspaces.get(request.workspaceId);
          if (!fake) {
            if (workspaces.size >= 256) return deny("BUSY", 429);
            fake = {
              createdAt: request.createdAt,
              expiresAt: request.expiresAt,
              batches: 0,
              operations: new Set(),
              busy: false,
            };
            workspaces.set(request.workspaceId, fake);
          }
          if (
            fake.createdAt !== request.createdAt ||
            fake.expiresAt !== request.expiresAt ||
            fake.batches >= LOGO_LIMITS.batches ||
            fake.operations.has(request.operationId) ||
            fake.operations.size >= 24
          )
            return deny("FORBIDDEN", 403);
          if (fake.busy || active >= 2) return deny("BUSY", 429);
          fake.operations.add(request.operationId);
          fake.busy = true;
          active++;
          ownsFake = true;
        }
        const result = await generateLogos(
          request,
          runtime!.provider,
          signal,
          lease ?? {
            dispatch() {
              if (!fake || signal.aborted) return deny("DEADLINE", 504);
              fake.batches++;
            },
            recordUsage() {},
          },
          randomUUID,
          () => new Date().toISOString(),
        );
        signal.throwIfAborted();
        if (!res.headersSent) res.json(result);
      } finally {
        lease?.finish();
        if (fake && ownsFake) {
          fake.busy = false;
          active--;
        }
      }
    },
  );
}
