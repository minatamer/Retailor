import type { Request, RequestHandler } from "express";
import { API_ROUTES, isApiRoute, publicError } from "@retailor/contracts/api";
import { safetyCookie } from "../security/safety-cookie.js";

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

/** Content-free pre-parser fairness; not a per-person quota or paid lease. */
export function ingress(
  clock: () => number = Date.now,
  verifiedSafety: (cookie: string | undefined) => string | undefined = () =>
    undefined,
): RequestHandler {
  let active = 0,
    unknownActive = 0;
  let unknownArrivals: number[] = [],
    verifiedArrivals: number[] = [];
  const sessions = new Map<string, number[]>();
  // At most four entries, independently of minute-window cleanup.
  const sessionActive = new Map<string, number>();
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
    const identity = verifiedSafety(safetyCookie(req.headers.cookie));
    if (
      active >= 4 ||
      (!identity && unknownActive >= 2) ||
      (identity && (sessionActive.get(identity) ?? 0) >= 2)
    )
      return unavailable("BUSY", 429);
    const type = req.headers["content-type"] ?? "";
    const invalidMedia =
      !(path === "catalogue/interpret"
        ? /^multipart\/form-data;/iu.test(type)
        : /^application\/json(?:;|$)/iu.test(type)) ||
      (req.headers["content-encoding"] &&
        req.headers["content-encoding"] !== "identity");
    const length = req.headers["content-length"];
    const invalidLength =
      length &&
      (!/^\d+$/u.test(length) || Number(length) > API_ROUTES[path].bodyLimit);
    // Invalid cheap headers retain bounded discard slots, not a minute of capacity.
    if (!invalidMedia && !invalidLength) {
      const now = clock(),
        cutoff = now - 60_000;
      unknownArrivals = unknownArrivals.filter((at) => at > cutoff);
      verifiedArrivals = verifiedArrivals.filter((at) => at > cutoff);
      for (const [key, values] of sessions) {
        const current = values.filter((at) => at > cutoff);
        if (current.length) sessions.set(key, current);
        else sessions.delete(key);
      }
      const local = identity ? (sessions.get(identity) ?? []) : [];
      if (identity) {
        if (
          verifiedArrivals.length >= 48 ||
          local.length >= 24 ||
          (sessions.size >= 128 && !sessions.has(identity))
        )
          return unavailable("BUSY", 429);
        sessions.set(identity, [...local, now]);
        verifiedArrivals.push(now);
      } else {
        if (unknownArrivals.length >= 16) return unavailable("BUSY", 429);
        unknownArrivals.push(now);
      }
    }
    active++;
    if (!identity) unknownActive++;
    else sessionActive.set(identity, (sessionActive.get(identity) ?? 0) + 1);
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      active--;
      if (!identity) unknownActive--;
      else {
        const remaining = (sessionActive.get(identity) ?? 1) - 1;
        if (remaining) sessionActive.set(identity, remaining);
        else sessionActive.delete(identity);
      }
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
    if (invalidMedia) return void fail("INVALID_INPUT", 415);
    if (invalidLength) return void fail("TOO_LARGE", 413);
    next();
  };
}
