import "server-only";
import { randomUUID } from "node:crypto";
import { publicError } from "@retailor/contracts/api";
import { forward, parseBridgeConfig, readBounded } from "./bridge";
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
  try {
    const config = parseBridgeConfig(process.env);
    return await forward(request, path, config, {
      fetch,
      requestId: () => `req_${randomUUID()}`,
      authorization,
    });
  } catch {
    return Response.json(publicError("UNAVAILABLE", `req_${randomUUID()}`), {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
