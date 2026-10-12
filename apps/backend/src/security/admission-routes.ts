import express from "express";
import { z } from "zod";
import {
  CatalogueActionSchema,
  RECOGNITION_LIMITS,
} from "@retailor/contracts/recognition";
import { AssistantActionSchema } from "@retailor/contracts/assistant";
import { LogoActionSchema } from "@retailor/contracts/brand";
import { publicError } from "@retailor/contracts/api";
import type { PaidAdmission } from "./admission.js";
import { SAFETY_COOKIE, safetyCookie } from "./safety-cookie.js";
import { deny, OperationFailure } from "./errors.js";
const RequestSchema = z.strictObject({
  action: z.union([
    CatalogueActionSchema,
    AssistantActionSchema,
    LogoActionSchema,
  ]),
  challengeProof: z.string().min(1).max(2048),
});
export function admissionRoutes(
  app: express.Express,
  admission: PaidAdmission | undefined,
  frontendOrigin: string,
) {
  const enabled: express.RequestHandler = (_req, _res, next) =>
    admission ? next() : next(new OperationFailure("UNAVAILABLE", 503));
  const deadline: express.RequestHandler = (req, res, next) => {
    const owner = new AbortController();
    res.locals.admissionSignal = owner.signal;
    const timer = setTimeout(() => {
      owner.abort();
      if (!res.headersSent) {
        res.set("Connection", "close");
        res.once("finish", () => req.resume());
        res.status(504).json(publicError("DEADLINE", res.locals.requestId));
      }
    }, 8000);
    const cleanup = () => {
      clearTimeout(timer);
      owner.abort();
    };
    res.once("close", cleanup);
    res.once("finish", cleanup);
    next();
  };
  app.post(
    "/v1/admission",
    enabled,
    deadline,
    express.json({
      limit: RECOGNITION_LIMITS.metadata,
      strict: true,
      type: "application/json",
      inflate: false,
    }),
    async (req, res) => {
      const parsed = RequestSchema.safeParse(req.body);
      if (!parsed.success) return deny("INVALID_INPUT", 400);
      const signal = res.locals.admissionSignal as AbortSignal,
        safety = admission!.safety(safetyCookie(req.headers.cookie));
      const result = await admission!.admit(
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
          maxAge: 7200000,
          path: "/api/retailor/v1",
        });
      res.json(result);
    },
  );
}
