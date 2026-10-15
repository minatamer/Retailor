import express from "express";
import {
  CHECKOUT_LIMITS,
  CheckoutStartSchema,
  CheckoutControlSchema,
} from "@retailor/contracts/checkout";
import { publicError } from "@retailor/contracts/api";
import type { PaidAdmission } from "../security/admission.js";
import { safetyCookie, SAFETY_COOKIE } from "../security/safety-cookie.js";
import { deny, OperationFailure } from "../security/errors.js";
import type { CheckoutService } from "./service.js";

export interface CheckoutRuntime {
  admission: PaidAdmission;
  service: CheckoutService;
}
export function checkoutRoutes(
  app: express.Express,
  runtime: CheckoutRuntime | undefined,
  frontendOrigin: string,
) {
  for (const operation of ["identity", "start", "status", "cancel"] as const) {
    app.post(
      `/v1/checkout/${operation}`,
      (_req, _res, next) =>
        runtime ? next() : next(new OperationFailure("UNAVAILABLE", 503)),
      (req, res, next) => {
        const owner = new AbortController();
        res.locals.checkoutSignal = owner.signal;
        const timer = setTimeout(
          () => {
            owner.abort();
            if (!res.headersSent)
              res
                .status(504)
                .json(publicError("DEADLINE", res.locals.requestId));
          },
          operation === "start" ? CHECKOUT_LIMITS.deadlineMs : 25_000,
        );
        const cleanup = () => {
          clearTimeout(timer);
          owner.abort();
        };
        res.once("finish", cleanup);
        res.once("close", cleanup);
        next();
      },
      express.json({
        limit: operation === "start" ? CHECKOUT_LIMITS.bodyBytes : 1024,
        strict: true,
        inflate: false,
      }),
      async (req, res) => {
        const signal = res.locals.checkoutSignal as AbortSignal;
        if (operation === "identity") {
          if (
            !req.body ||
            Object.keys(req.body).length !== 1 ||
            req.body.schemaVersion !== 1
          )
            return deny("INVALID_INPUT", 400);
          const safety = runtime!.admission.safety(
            safetyCookie(req.headers.cookie),
          );
          runtime!.service.identity(safety.identity);
          if (safety.cookie)
            res.cookie(SAFETY_COOKIE, safety.cookie, {
              httpOnly: true,
              sameSite: "strict",
              secure: frontendOrigin.startsWith("https:"),
              maxAge: 7_200_000,
              path: "/api/retailor/v1",
            });
          res.json({ schemaVersion: 1, ready: true });
          return;
        }
        const identity = runtime!.admission.verifiedSafety(
          safetyCookie(req.headers.cookie),
        );
        const start =
          operation === "start"
            ? CheckoutStartSchema.safeParse(req.body)
            : null;
        const control =
          operation !== "start"
            ? CheckoutControlSchema.safeParse(req.body)
            : null;
        if ((start && !start.success) || (control && !control.success))
          return deny("INVALID_INPUT", 400);
        const result = start?.success
          ? await runtime!.service.start(identity, start.data, signal)
          : control?.success
            ? await runtime!.service.status(
                identity,
                control.data.attemptId,
                operation === "cancel",
                signal,
              )
            : deny("INVALID_INPUT", 400);
        signal.throwIfAborted();
        if (!res.headersSent) res.json(result);
      },
    );
  }
}
