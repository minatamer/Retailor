import type { Request, RequestHandler } from "express";
import { API_ROUTES, isApiRoute, publicError } from "@retailor/contracts/api";

/** Discard without buffering. Permit one bounded transport envelope to finish
 * locally so its error remains readable; stop slow or excessive tails. */
async function discardRejected(req: Request, limit: number) {
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
      if (bytes > limit) finish(false);
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

/** Coarse content-free process limits before body readers; not a guest identity or paid lease. */
export function ingress(clock: () => number = Date.now): RequestHandler {
  let active = 0;
  let arrivals: number[] = [];
  return (req, res, next) => {
    if (req.method === "GET") return next();
    const path = req.path.startsWith("/v1/") ? req.path.slice(4) : "";
    const unavailable = (
      code: Parameters<typeof publicError>[0],
      status: number,
    ) => {
      res.set("Connection", "close");
      res.once("finish", () => req.resume());
      res.status(status).json(publicError(code, res.locals.requestId));
    };
    if (!isApiRoute(path) || API_ROUTES[path].method !== req.method)
      return unavailable("NOT_FOUND", 404);
    const now = clock();
    arrivals = arrivals.filter((at) => at > now - 60_000);
    if (active >= 4 || arrivals.length >= 64) return unavailable("BUSY", 429);
    arrivals.push(now);
    active++;
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      active--;
      res.removeListener("finish", release);
      res.removeListener("close", release);
      if (!req.complete) req.resume();
    };
    res.once("finish", release);
    res.once("close", release);
    const fail = async (
      code: Parameters<typeof publicError>[0],
      status: number,
    ) => {
      const complete = await discardRejected(
        req,
        API_ROUTES[path].bodyLimit + 65536,
      );
      if (res.destroyed || res.headersSent) return;
      if (!complete) {
        res.set("Connection", "close");
        res.once("finish", () => req.resume());
      }
      res.status(status).json(publicError(code, res.locals.requestId));
    };
    const type = req.headers["content-type"] ?? "";
    if (
      !(path === "catalogue/interpret"
        ? /^multipart\/form-data;/iu.test(type)
        : /^application\/json(?:;|$)/iu.test(type)) ||
      (req.headers["content-encoding"] &&
        req.headers["content-encoding"] !== "identity")
    )
      return void fail("INVALID_INPUT", 415);
    const length = req.headers["content-length"];
    if (
      length &&
      (!/^\d+$/u.test(length) || Number(length) > API_ROUTES[path].bodyLimit)
    )
      return void fail("TOO_LARGE", 413);
    next();
  };
}
