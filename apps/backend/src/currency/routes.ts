import type { Express } from "express";
import { OperationFailure } from "../security/errors.js";
import type { CurrencyService } from "./service.js";
export function currencyRoutes(
  app: Express,
  service: CurrencyService | undefined,
) {
  app.get("/v1/currency/usd-eur", async (req, res, next) => {
    try {
      if (
        Object.keys(req.query).length ||
        (req.headers["content-length"] &&
          req.headers["content-length"] !== "0") ||
        req.headers["transfer-encoding"]
      )
        throw new OperationFailure("INVALID_INPUT", 400);
      if (!service) throw new OperationFailure("UNAVAILABLE", 503);
      const quote = await service.quote();
      if (!res.destroyed && !res.writableEnded) res.json(quote);
    } catch (error) {
      next(error);
    }
  });
}
