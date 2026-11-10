import "server-only";
import { randomUUID } from "node:crypto";
import { publicError } from "@retailor/contracts/api";
import { forward, parseBridgeConfig, readBounded } from "./bridge";
import { originGuard } from "./origin-guard.server";
async function authorization(
  audience: string,
  signal: AbortSignal,
): Promise<string> {
  const url = new URL(
    "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity",
  );
  url.searchParams.set("audience", audience);
  const response = await fetch(url, {
    headers: { "Metadata-Flavor": "Google" },
    redirect: "error",
    signal,
  });
  if (!response.ok) throw new Error("Runtime identity unavailable");
  const token = new TextDecoder().decode(
    await readBounded(response.body, 8192, signal),
  );
  if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/u.test(token))
    throw new Error("Invalid runtime identity");
  return `Bearer ${token}`;
}
export async function backendRequest(
  request: Request,
  path: string,
): Promise<Response> {
  const requestId = `req_${randomUUID()}`;
  const callback = path === "shopify/callback" || path === "shopify/install";
  const finish = (response: Response) => {
    if (callback) {
      try {
        process.stderr.write(
          `${JSON.stringify({
            schemaVersion: 1,
            event: "shopify_callback",
            operation: path,
            code: response.status,
            requestId,
            source: "server/backend.server.ts",
          })}\n`,
        );
      } catch {
        /* Diagnostic output failure cannot alter the response. */
      }
    }
    return response;
  };
  const denied = originGuard(request);
  if (denied) return finish(denied);
  try {
    const config = parseBridgeConfig(process.env);
    const result = await forward(request, path, config, {
      fetch,
      requestId: () => requestId,
      authorization,
    });
    if (callback && result.status !== 303)
      return finish(shopifyFailureRedirect());
    return finish(result);
  } catch {
    if (callback) return finish(shopifyFailureRedirect());
    return Response.json(publicError("UNAVAILABLE", requestId), {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
function shopifyFailureRedirect() {
  return new Response(null, {
    status: 303,
    headers: {
      Location: "/demo?shopify=needs_attention&shopifyReturn=onboarding",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
