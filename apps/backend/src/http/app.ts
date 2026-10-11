import express from "express";
import type { ErrorRequestHandler, Express } from "express";
import { publicError } from "@retailor/contracts/api";
import type { Runtime } from "../runtime/compose.js";
export function createApp(runtime: Runtime): Express {
  const app = express();
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    res.locals.requestId = runtime.requestId();
    res.set({
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    if (req.method !== "GET" && req.headers.origin !== runtime.frontendOrigin) {
      res.status(403).json(publicError("FORBIDDEN", res.locals.requestId));
      return;
    }
    next();
  });
  app.get("/v1/health", (_req, res) => {
    res.json({
      schemaVersion: 1,
      service: "retailor-backend",
      status: "alive",
      revision: runtime.revision,
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
  app.use((_req, res) => {
    res.status(404).json(publicError("NOT_FOUND", res.locals.requestId));
  });
  const onError: ErrorRequestHandler = (_error, _req, res, _next) => {
    res.status(500).json(publicError("UPSTREAM_FAILED", res.locals.requestId));
  };
  app.use(onError);
  return app;
}
