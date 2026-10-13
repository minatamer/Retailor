import "server-only";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { publicError } from "@retailor/contracts/api";

/** The trusted edge must overwrite this header, never append a visitor value. */
export const ORIGIN_SEAL_HEADER = "x-retailor-origin";

/** No body reads, identity forwarding, configuration loading or network work. */
export function originGuard(
  request: Request,
  environment: Record<string, string | undefined> = process.env,
): Response | null {
  const mode = environment.RETAILOR_ORIGIN_GUARD ?? "disabled";
  if (mode === "disabled") return null;
  const expected = environment.RETAILOR_ORIGIN_SECRET ?? "";
  const configured = mode === "cloudflare" && /^[a-f0-9]{64}$/u.test(expected);
  const supplied = request.headers.get(ORIGIN_SEAL_HEADER) ?? "";
  if (
    configured &&
    /^[a-f0-9]{64}$/u.test(supplied) &&
    timingSafeEqual(Buffer.from(supplied, "hex"), Buffer.from(expected, "hex"))
  )
    return null;
  const status = configured ? 403 : 503;
  const headers = {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
  };
  if (new URL(request.url).pathname.startsWith("/api/retailor/v1"))
    return Response.json(
      publicError(
        configured ? "FORBIDDEN" : "UNAVAILABLE",
        `req_${randomUUID()}`,
      ),
      { status, headers },
    );
  return new Response(
    '<!doctype html><html lang="en"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Retailor</title><main><h1>Retailor is unavailable here.</h1><p>Please use the official Retailor link or try again later.</p></main></html>',
    {
      status,
      headers: { ...headers, "Content-Type": "text/html; charset=utf-8" },
    },
  );
}
