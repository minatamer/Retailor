import { AsyncLocalStorage } from "node:async_hooks";
import { createHash, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { createApp } from "../../apps/backend/src/http/app.js";
import { OperationFailure } from "../../apps/backend/src/security/errors.js";
import { ErrorCodeSchema } from "@retailor/contracts/api";
import { LIVE_CASES } from "./plan.mjs";
import { EvidenceSchema } from "./evidence.mjs";
const backendRequire = createRequire(
  new URL("../../apps/backend/package.json", import.meta.url),
);
const express = backendRequire("express"),
  { z } = backendRequire("zod");
const digest = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const AuthorizationSchema = z.strictObject({
  schemaVersion: z.literal(1),
  approvalId: z.uuid(),
  candidate: z.string().regex(/^[a-f0-9]{40}$/u),
  planDigest: z.string().regex(/^[a-f0-9]{64}$/u),
  ownerApproved: z.literal(true),
  accountAndRetentionVerified: z.literal(true),
  expiresAt: z.iso.datetime({ precision: 3 }),
  caseIds: z
    .array(z.enum(LIVE_CASES.map((c) => c.id)))
    .min(1)
    .max(10),
});
export function authorizationDigest(plan) {
  return digest(plan);
}
export function validateAuthorization(input, plan) {
  const authorization = AuthorizationSchema.parse(input);
  if (
    Date.parse(authorization.expiresAt) <= Date.now() ||
    Date.parse(authorization.expiresAt) > Date.now() + 7200000
  )
    throw new Error("Authorization window unavailable");
  if (
    authorization.candidate !== plan.candidate ||
    authorization.planDigest !== digest(plan) ||
    new Set(authorization.caseIds).size !== authorization.caseIds.length
  )
    throw new Error("Authorization does not match candidate/plan");
  return Object.freeze({
    ...authorization,
    caseIds: Object.freeze([...authorization.caseIds]),
  });
}

/** Operator-only observer. Normal challenge, grants, validation and tools remain authoritative.
 * No content is retained; approved cases are claimed once and failed/unknown outcomes stop the run. */
export function createCaptureSession(
  authorization,
  emit,
  execution = "owner-recorded-live",
) {
  const storage = new AsyncLocalStorage(),
    used = new Set(),
    rows = [];
  const state = {
    stopped: false,
    active: null,
    paidRequests: 0,
    guardRecorded: false,
  };
  const cases = authorization.caseIds.map((id) =>
    LIVE_CASES.find((c) => c.id === id),
  );
  const stop = () => {
    state.stopped = true;
    throw new OperationFailure("OPERATOR_REQUIRED", 503);
  };
  function claim(capability, role, inputCount = 0) {
    const context = storage.getStore();
    if (
      !context ||
      state.stopped ||
      Date.now() >= Date.parse(authorization.expiresAt) ||
      (state.active && state.active !== context)
    )
      return stop();
    if (context.case) return context;
    const next = cases.find(
      (c) =>
        !used.has(c.id) &&
        c.capability === capability &&
        (!role || c.role === role),
    );
    if (
      !next ||
      (next.inputCount !== undefined && next.inputCount !== inputCount)
    )
      return stop();
    context.case = next;
    context.inputCount = inputCount;
    used.add(next.id);
    state.active = context;
    return context;
  }
  function dispatch(context, delegate) {
    if (
      state.stopped ||
      context.closed ||
      context.providerRequests >=
        (context.case.capability === "assistant" ? 3 : 1)
    )
      return stop();
    context.providerRequests++;
    delegate();
  }
  function usage(context, delegate) {
    return (value) => {
      const parsed = z
        .strictObject({
          input: z.number().int().min(0).max(2000000),
          output: z.number().int().min(0).max(100000),
        })
        .safeParse(value);
      if (!parsed.success) return stop();
      if (!context.closed) {
        const total = {
          inputTokens: (context.usage?.inputTokens ?? 0) + value.input,
          outputTokens: (context.usage?.outputTokens ?? 0) + value.output,
        };
        if (total.inputTokens > 2000000 || total.outputTokens > 100000)
          return stop();
        context.usage = total;
      }
      delegate?.(value);
    };
  }
  return {
    get rows() {
      return [...rows];
    },
    get paidRequests() {
      return state.paidRequests;
    },
    get stopped() {
      return state.stopped;
    },
    fetcher(fetcher = fetch) {
      return async (input, init) => {
        const context = storage.getStore(),
          target = input instanceof Request ? input.url : String(input);
        const allowed = "https://api.openai.com/v1/responses";
        if (
          !context?.case ||
          state.stopped ||
          context.closed ||
          Date.now() >= Date.parse(authorization.expiresAt) ||
          context.networkRequests >=
            (context.case.capability === "assistant" ? 3 : 1) ||
          target !== allowed ||
          (init?.method ??
            (input instanceof Request ? input.method : "GET")) !== "POST"
        )
          return stop();
        context.networkRequests++;
        state.paidRequests++;
        const response = await fetcher(input, { ...init, redirect: "error" });
        const requestId = response.headers.get("x-request-id");
        if (
          !context.closed &&
          requestId &&
          /^req_[A-Za-z0-9-]{1,80}$/u.test(requestId) &&
          !context.requestIds.includes(requestId)
        )
          context.requestIds.push(requestId);
        return response;
      };
    },
    wrap(runtime) {
      const decorated = {
        ...runtime,
        requestId: () => storage.getStore()?.appRequestId ?? randomUUID(),
        get ready() {
          return runtime.ready && !state.stopped;
        },
        get capabilities() {
          const c = runtime.capabilities;
          if (!state.stopped) return c;
          const unavailable = { available: false, reason: "unavailable" };
          return {
            ...c,
            paidEnabled: false,
            admissionSiteKey: null,
            vision: unavailable,
            tailor: unavailable,
          };
        },
      };
      if (runtime.recognition)
        decorated.recognition = {
          ...runtime.recognition,
          provider: {
            async interpret(action, images, signal, delegateUsage) {
              const context = claim("catalogue", null, action.photos.length);
              dispatch(context, () => {});
              return runtime.recognition.provider.interpret(
                action,
                images,
                signal,
                usage(context, delegateUsage),
              );
            },
          },
        };
      if (runtime.assistant)
        decorated.assistant = {
          ...runtime.assistant,
          provider: {
            begin(prepared) {
              const context = claim("assistant", prepared.payload.context.role),
                upstream = runtime.assistant.provider.begin(prepared);
              return {
                next(
                  outputs,
                  finalOnly,
                  signal,
                  delegateDispatch,
                  delegateUsage,
                ) {
                  return upstream.next(
                    outputs,
                    finalOnly,
                    signal,
                    () => dispatch(context, delegateDispatch),
                    usage(context, delegateUsage),
                  );
                },
              };
            },
          },
        };
      const app = express();
      app.use((req, res, next) => {
        const context = {
          recording: !state.stopped,
          started: performance.now(),
          appRequestId: randomUUID(),
          providerRequests: 0,
          networkRequests: 0,
          inputCount: 0,
          outputCount: 0,
          requestIds: [],
          usage: null,
          errorCategory: "none",
          closed: false,
          case: null,
        };
        const paidPath =
          /^\/v1\/(?:catalogue\/interpret|assistant\/(?:creator|shopper|owner))$/u.test(
            req.path,
          );
        const json = res.json;
        res.json = function (body) {
          if (paidPath) {
            const code = ErrorCodeSchema.safeParse(body?.error?.code);
            if (code.success) context.errorCategory = code.data;
            if (context.case?.capability === "catalogue")
              context.outputCount = body?.draft?.items?.length ?? 0;
            if (context.case?.capability === "assistant")
              context.outputCount = body?.reply ? 1 : 0;
          }
          return json.call(this, body);
        };
        const finish = (complete) => {
          if (context.closed) return;
          context.closed = true;
          if (state.active === context) state.active = null;
          if (paidPath && (!complete || res.statusCode >= 400))
            state.stopped = true;
          if (!context.recording) return;
          if (
            !context.case &&
            (!paidPath ||
              (complete && res.statusCode < 400) ||
              state.guardRecorded)
          )
            return;
          if (!context.case) state.guardRecorded = true;
          if (!complete && context.errorCategory === "none")
            context.errorCategory = "unknown";
          if (context.providerRequests && !context.usage) state.stopped = true;
          if (used.size === cases.length) state.stopped = true;
          const row = EvidenceSchema.parse({
            schemaVersion: 1,
            candidate: authorization.candidate,
            caseId: context.case?.id ?? "capture_request_rejected",
            execution,
            recordedAt: new Date().toISOString(),
            outcome: !complete || res.statusCode < 400 ? "unknown" : "fail",
            durationMs: Math.round(performance.now() - context.started),
            appRequestId: context.appRequestId,
            requestIds: [...context.requestIds],
            httpStatus: res.headersSent ? res.statusCode : null,
            providerRequests: context.providerRequests,
            inputCount: context.inputCount,
            outputCount: context.outputCount,
            usage: context.usage,
            measuredCostMicroUsd: null,
            errorCategory: context.errorCategory,
          });
          rows.push(row);
          emit(row);
        };
        res.once("finish", () => finish(true));
        res.once("close", () => finish(res.writableFinished));
        storage.run(context, next);
      });
      app.use(createApp(decorated));
      return app;
    },
  };
}
