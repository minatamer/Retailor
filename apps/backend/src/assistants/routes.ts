import express from "express";
import { createHash } from "node:crypto";
import {
  ASSISTANT_LIMITS,
  AssistantRequestSchema,
  AssistantRoleSchema,
} from "@retailor/contracts/assistant";
import { publicError } from "@retailor/contracts/api";
import type { PaidAdmission } from "../security/admission.js";
import { safetyCookie } from "../security/safety-cookie.js";
import { deny, OperationFailure } from "../security/errors.js";
import { investigateAssistant } from "./service.js";
import type { AssistantProvider } from "./provider.js";
export interface AssistantRuntime {
  mode: "fake" | "live";
  provider: AssistantProvider;
  admission?: PaidAdmission;
}
export function assistantRoutes(
  app: express.Express,
  runtime: AssistantRuntime | undefined,
) {
  const fakeWorkspaces = new Map<
    string,
    { expiresAt: string; turns: number; operations: Set<string>; busy: boolean }
  >();
  const enabled: express.RequestHandler = (_req, _res, next) =>
    runtime ? next() : next(new OperationFailure("UNAVAILABLE", 503));
  const deadline: express.RequestHandler = (req, res, next) => {
    const owner = new AbortController();
    res.locals.assistantSignal = owner.signal;
    const timer = setTimeout(() => {
      owner.abort();
      if (!res.headersSent) {
        res.set("Connection", "close");
        res.once("finish", () => req.resume());
        res.status(504).json(publicError("DEADLINE", res.locals.requestId));
      }
    }, ASSISTANT_LIMITS.deadlineMs);
    const cleanup = () => {
      clearTimeout(timer);
      owner.abort();
    };
    res.once("close", cleanup);
    res.once("finish", cleanup);
    next();
  };
  for (const role of AssistantRoleSchema.options)
    app.post(
      `/v1/assistant/${role}`,
      enabled,
      deadline,
      express.json({
        limit: ASSISTANT_LIMITS.bodyBytes,
        strict: true,
        type: "application/json",
        inflate: false,
      }),
      async (req, res) => {
        const parsed = AssistantRequestSchema.safeParse(req.body);
        if (!parsed.success) return deny("INVALID_INPUT", 400);
        const { payload, action, grant } = parsed.data,
          signal = res.locals.assistantSignal as AbortSignal;
        if (payload.context.role !== role || payload.mode !== runtime!.mode)
          return deny("FORBIDDEN", 403);
        const graph = payload.context.graph;
        let lease: ReturnType<PaidAdmission["beginAssistant"]> | undefined,
          ownsFake = false,
          fake:
            | {
                expiresAt: string;
                turns: number;
                operations: Set<string>;
                busy: boolean;
              }
            | undefined;
        try {
          if (payload.mode === "live") {
            if (!runtime!.admission || !action || !grant)
              return deny("UNAVAILABLE", 503);
            if (
              action.role !== role ||
              action.workspaceId !== graph.workspaceId ||
              action.scenarioId !== graph.scenarioId ||
              action.dataRevision !== graph.revision ||
              action.operationId !== payload.operationId ||
              action.createdAt !== graph.createdAt ||
              action.expiresAt !== graph.expiresAt ||
              action.digest !==
                createHash("sha256")
                  .update(JSON.stringify(payload))
                  .digest("hex")
            )
              return deny("FORBIDDEN", 403);
            const cookie = safetyCookie(req.headers.cookie);
            if (!cookie) return deny("FORBIDDEN", 403);
            const safety = runtime!.admission.safety(cookie);
            if (safety.cookie) return deny("FORBIDDEN", 403);
            lease = runtime!.admission.beginAssistant(
              action,
              grant,
              safety.identity,
            );
          } else {
            const now = new Date().toISOString();
            for (const [id, record] of fakeWorkspaces)
              if (!record.busy && record.expiresAt <= now)
                fakeWorkspaces.delete(id);
            if (graph.createdAt > now || graph.expiresAt <= now)
              return deny("STALE", 409);
            fake = fakeWorkspaces.get(graph.workspaceId);
            if (!fake) {
              if (fakeWorkspaces.size >= 256) return deny("BUSY", 429);
              fake = {
                expiresAt: graph.expiresAt,
                turns: 0,
                operations: new Set(),
                busy: false,
              };
              fakeWorkspaces.set(graph.workspaceId, fake);
            }
            if (
              fake.expiresAt !== graph.expiresAt ||
              fake.turns >= ASSISTANT_LIMITS.turns ||
              fake.operations.has(payload.operationId)
            )
              return deny("FORBIDDEN", 403);
            if (fake.busy) return deny("BUSY", 429);
            fake.operations.add(payload.operationId);
            fake.turns++;
            fake.busy = true;
            ownsFake = true;
          }
          const result = await investigateAssistant(
            payload,
            runtime!.provider,
            signal,
            lease ?? { dispatch() {}, recordUsage() {} },
          );
          signal.throwIfAborted();
          res.json(result);
        } finally {
          lease?.finish();
          if (fake && ownsFake) fake.busy = false;
        }
      },
    );
}
