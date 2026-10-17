import { checkoutRoutes } from "../checkout/routes.js";
import express from "express";
import type { ErrorRequestHandler, Express } from "express";
import { publicError } from "@retailor/contracts/api";
import type { Runtime } from "../runtime/compose.js";
import { recognitionRoutes } from "../catalogue/routes.js";
import { currencyRoutes } from "../currency/routes.js";
import { assistantRoutes } from "../assistants/routes.js";
import { logoRoutes } from "../brand/routes.js";
import { admissionRoutes } from "../security/admission-routes.js";
import { OperationFailure } from "../security/errors.js";
import { ingress } from "./ingress.js";
import { failureDiagnostic, reportDiagnostic } from "./diagnostics.js";
import type { DiagnosticSink } from "./diagnostics.js";
export function createApp(
  runtime: Runtime,
  diagnostics?: DiagnosticSink,
): Express {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", false);
  app.use((req, res, next) => {
    res.locals.requestId = runtime.requestId();
    res.set({
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "no-referrer",
    });
    if (req.method !== "GET" && req.headers.origin !== runtime.frontendOrigin) {
      res.status(403).json(publicError("FORBIDDEN", res.locals.requestId));
      return;
    }
    next();
  });
  app.use(
    ingress(
      Date.now,
      (cookie) =>
        runtime.recognition?.admission.verifiedSafety(cookie) ??
        runtime.logos?.admission?.verifiedSafety(cookie) ??
        runtime.checkout?.admission.verifiedSafety(cookie),
    ),
  );
  app.get("/v1/health", (_req, res) => {
    res.json({
      schemaVersion: 1,
      service: "retailor-backend",
      status: "alive",
    });
  });
  app.get("/v1/ready", (_req, res) => {
    res.status(runtime.ready ? 200 : 503).json({
      schemaVersion: 1,
      ready: runtime.ready,
      mode: runtime.capabilities.mode,
    });
  });
  app.get("/v1/config", (_req, res) => {
    res.json(runtime.capabilities);
  });
  admissionRoutes(
    app,
    runtime.recognition?.admission ??
      (runtime.logos?.mode === "live" ? runtime.logos.admission : undefined),
    runtime.frontendOrigin,
    !!runtime.recognition,
  );
  recognitionRoutes(app, runtime.recognition, diagnostics);
  assistantRoutes(app, runtime.assistant);
  logoRoutes(app, runtime.logos);
  currencyRoutes(app, runtime.currency);
  checkoutRoutes(app, runtime.checkout, runtime.frontendOrigin);
  app.use((_req, res) => {
    res.status(404).json(publicError("NOT_FOUND", res.locals.requestId));
  });
  const onError: ErrorRequestHandler = (error: unknown, req, res, _next) => {
    if (res.headersSent) return;
    const bodyError =
      error && typeof error === "object" && "type" in error ? error.type : null;
    const code =
      error instanceof OperationFailure
        ? error.code
        : bodyError === "entity.too.large"
          ? "TOO_LARGE"
          : bodyError === "entity.parse.failed"
            ? "INVALID_INPUT"
            : "UPSTREAM_FAILED";
    const status =
      error instanceof OperationFailure
        ? error.status
        : code === "TOO_LARGE"
          ? 413
          : code === "INVALID_INPUT"
            ? 400
            : 500;
    reportDiagnostic(
      diagnostics,
      failureDiagnostic(error, res.locals.requestId, req.path, code, status),
    );
    res.status(status).json(publicError(code, res.locals.requestId));
  };
  app.use(onError);
  return app;
}
