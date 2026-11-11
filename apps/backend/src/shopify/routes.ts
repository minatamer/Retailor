import express from "express";
import {
  ShopifySessionInputSchema,
  ShopifyControlSchema,
  ShopifyConnectSchema,
  ShopifyBrowseSchema,
  ShopifyExportInputSchema,
  ShopifyExportControlSchema,
  ShopifySimulationSchema,
  ShopifyImportInputSchema,
  ShopifyCollectionBrowseSchema,
} from "@retailor/contracts/shopify";
import { deny } from "../security/errors.js";
import { shopifyCookie, SHOPIFY_COOKIE } from "./service.js";
import type { ShopifyService } from "./service.js";
import type { ShopifyCatalogue } from "./catalogue.js";
import type { ShopifyCleanup } from "./cleanup.js";
import type { ShopifyWebhooks } from "./webhooks.js";
import { cleanupDiagnostic } from "./runner.js";
import { OperationFailure } from "../security/errors.js";

export function shopifyRoutes(
  app: express.Express,
  service: ShopifyService | undefined,
  frontendOrigin: string,
  catalogue?: ShopifyCatalogue,
  cleanup?: ShopifyCleanup,
  webhooks?: ShopifyWebhooks,
  promptCleanup = false,
) {
  app.post(
    "/v1/shopify/simulate",
    express.json({ limit: 2048, strict: true, inflate: false }),
    async (req, res) => {
      if (!service) return deny("UNAVAILABLE", 503);
      const input = ShopifySimulationSchema.safeParse(req.body);
      if (!input.success) return deny("INVALID_INPUT", 400);
      res.json(
        await service.simulate(
          shopifyCookie(req.headers.cookie),
          req.get("x-retailor-shopify-tab"),
          input.data.workspaceId,
          input.data.approved,
          AbortSignal.timeout(9000),
        ),
      );
    },
  );
  app.post(
    "/v1/shopify/webhook",
    express.raw({ type: "application/json", limit: 65536, inflate: false }),
    async (req, res) => {
      if (!webhooks) return deny("UNAVAILABLE", 503);
      if (!Buffer.isBuffer(req.body)) return deny("INVALID_INPUT", 400);
      res.json(
        await webhooks.accept(
          req.body,
          req.get("x-shopify-hmac-sha256"),
          req.get("x-shopify-topic"),
          req.get("x-shopify-webhook-id"),
        ),
      );
    },
  );
  for (const operation of ["remove", "disconnect", "end"] as const) {
    app.post(
      `/v1/shopify/${operation}`,
      express.json({ limit: 2048, strict: true, inflate: false }),
      async (req, res) => {
        if (!cleanup) return deny("UNAVAILABLE", 503);
        const input = (
          operation === "remove"
            ? ShopifyExportControlSchema
            : ShopifyControlSchema
        ).safeParse(req.body);
        if (!input.success) return deny("INVALID_INPUT", 400);
        const owner = new AbortController(),
          stop = () => owner.abort(),
          timer = setTimeout(stop, 7000);
        req.once("aborted", stop);
        res.once("close", stop);
        try {
          const cookie = shopifyCookie(req.headers.cookie),
            proof = req.get("x-retailor-shopify-tab"),
            status = await cleanup.request(
              cookie,
              proof,
              input.data.workspaceId,
              "exportId" in input.data &&
                typeof input.data.exportId === "string"
                ? input.data.exportId
                : undefined,
            );
          if (
            promptCleanup &&
            operation === "disconnect" &&
            status.ended &&
            status.state !== "cleaned" &&
            !owner.signal.aborted
          ) {
            try {
              const result = await cleanup.sweep(owner.signal);
              cleanupDiagnostic(
                result.claimed ? "completed" : "leased",
                result.calls,
                result.visited,
              );
            } catch (error) {
              cleanupDiagnostic(
                error instanceof OperationFailure ? error.code : "UNAVAILABLE",
              );
            }
            res.json(
              await cleanup.auth.status(
                cookie,
                proof,
                input.data.workspaceId,
                true,
              ),
            );
          } else res.json(status);
        } finally {
          clearTimeout(timer);
          req.removeListener("aborted", stop);
          res.removeListener("close", stop);
          owner.abort();
        }
      },
    );
  }
  for (const operation of [
    "products",
    "collections",
    "import",
    "export",
    "update",
    "check",
  ] as const) {
    app.post(
      `/v1/shopify/${operation}`,
      express.json({
        limit:
          operation === "export" || operation === "update"
            ? 10 * 1024 * 1024
            : 4096,
        strict: true,
        inflate: false,
      }),
      async (req, res) => {
        if (!catalogue) return deny("UNAVAILABLE", 503);
        const cookie = shopifyCookie(req.headers.cookie);
        const proof =
          typeof req.headers["x-retailor-shopify-tab"] === "string"
            ? req.headers["x-retailor-shopify-tab"]
            : undefined;
        const owner = new AbortController(),
          timer = setTimeout(
            () => owner.abort(),
            operation === "export" ||
              operation === "update" ||
              operation === "import"
              ? 120000
              : 25000,
          );
        const abort = () => owner.abort();
        res.once("close", abort);
        try {
          let result: unknown;
          if (operation === "products") {
            const input = ShopifyBrowseSchema.safeParse(req.body);
            if (!input.success) return deny("INVALID_INPUT", 400);
            result = await catalogue.list(
              cookie,
              proof,
              input.data.workspaceId,
              input.data.cursor,
              owner.signal,
              input.data.collectionId ?? null,
            );
          } else if (operation === "collections") {
            const input = ShopifyCollectionBrowseSchema.safeParse(req.body);
            if (!input.success) return deny("INVALID_INPUT", 400);
            result = await catalogue.collections(
              cookie,
              proof,
              input.data.workspaceId,
              input.data.cursor,
              owner.signal,
            );
          } else if (operation === "import") {
            const input = ShopifyImportInputSchema.safeParse(req.body);
            if (!input.success) return deny("INVALID_INPUT", 400);
            result = await catalogue.importProduct(
              cookie,
              proof,
              input.data.workspaceId,
              input.data.productId,
              owner.signal,
            );
          } else if (operation === "check") {
            const input = ShopifyExportControlSchema.safeParse(req.body);
            if (!input.success) return deny("INVALID_INPUT", 400);
            result = await catalogue.check(
              cookie,
              proof,
              input.data.workspaceId,
              input.data.exportId,
              owner.signal,
            );
          } else {
            const input = ShopifyExportInputSchema.safeParse(req.body);
            if (!input.success) return deny("INVALID_INPUT", 400);
            result = await catalogue.export(
              cookie,
              proof,
              input.data,
              operation === "update",
              owner.signal,
            );
          }
          if (!res.headersSent && !res.destroyed) res.json(result);
        } finally {
          clearTimeout(timer);
          res.removeListener("close", abort);
          owner.abort();
        }
      },
    );
  }
  for (const operation of ["session", "status", "connect"] as const) {
    app.post(
      `/v1/shopify/${operation}`,
      express.json({ limit: 2048, strict: true, inflate: false }),
      async (req, res) => {
        if (!service) return deny("UNAVAILABLE", 503);
        const cookie = shopifyCookie(req.headers.cookie);
        const proof =
          typeof req.headers["x-retailor-shopify-tab"] === "string"
            ? req.headers["x-retailor-shopify-tab"]
            : undefined;
        if (operation === "session") {
          const input = ShopifySessionInputSchema.safeParse(req.body);
          if (!input.success) return deny("INVALID_INPUT", 400);
          const issued = await service.session(cookie, input.data);
          res.cookie(SHOPIFY_COOKIE, issued.cookie, {
            httpOnly: true,
            sameSite: "lax",
            secure: frontendOrigin.startsWith("https:"),
            path: "/api/retailor/v1",
            maxAge: 7_200_000,
          });
          res.json(issued.result);
          return;
        }
        if (operation === "connect") {
          const input = ShopifyConnectSchema.safeParse(req.body);
          if (!input.success) return deny("INVALID_INPUT", 400);
          res.json(await service.connect(cookie, proof, input.data));
          return;
        }
        const input = ShopifyControlSchema.safeParse(req.body);
        if (!input.success) return deny("INVALID_INPUT", 400);
        res.json(await service.status(cookie, proof, input.data.workspaceId));
      },
    );
  }
  for (const operation of ["callback", "install"] as const) {
    app.get(`/v1/shopify/${operation}`, async (req, res) => {
      if (!service) return deny("UNAVAILABLE", 503);
      if (Buffer.byteLength(req.originalUrl) > 8300)
        return deny("TOO_LARGE", 413);
      const cookie = shopifyCookie(req.headers.cookie),
        query = req.originalUrl.split("?")[1] ?? "";
      const owner = new AbortController(),
        timer = setTimeout(() => owner.abort(), 25_000);
      const abort = () => owner.abort();
      res.once("close", abort);
      try {
        const result =
          operation === "callback"
            ? await service.callback(cookie, query, owner.signal)
            : await service.install(cookie, query);
        if (!res.headersSent && !res.destroyed) res.json(result);
      } finally {
        clearTimeout(timer);
        res.removeListener("close", abort);
        owner.abort();
      }
    });
  }
}
