import {
  API_ROUTES,
  isApiRoute,
  publicError,
  PublicErrorSchema,
  HealthSchema,
  ReadinessSchema,
  CapabilitiesSchema,
} from "@retailor/contracts/api";
import { z } from "zod";
const origin = z
  .string()
  .url()
  .refine((value) => {
    const url = new URL(value);
    return (
      url.origin === value &&
      !url.username &&
      !url.password &&
      ["http:", "https:"].includes(url.protocol)
    );
  });
const ConfigSchema = z
  .object({
    APP_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    FRONTEND_ORIGIN: origin.default("http://127.0.0.1:4310"),
    BACKEND_ORIGIN: origin.default("http://127.0.0.1:4311"),
    BACKEND_AUDIENCE: z.string().default(""),
  })
  .superRefine((v, ctx) => {
    if (
      v.APP_ENV === "production" &&
      (!v.BACKEND_AUDIENCE ||
        !v.FRONTEND_ORIGIN.startsWith("https://") ||
        !v.BACKEND_ORIGIN.startsWith("https://"))
    )
      ctx.addIssue({
        code: "custom",
        message: "Private hosted bridge requires HTTPS and runtime audience",
      });
  });
export type BridgeConfig = z.infer<typeof ConfigSchema>;
export function parseBridgeConfig(
  input: Record<string, string | undefined>,
): BridgeConfig {
  return ConfigSchema.parse(input);
}
export interface BridgePorts {
  fetch: typeof fetch;
  authorization(audience: string, signal: AbortSignal): Promise<string>;
  requestId(): string;
}
class LimitError extends Error {}
export async function readBounded(
  body: ReadableStream<Uint8Array> | null,
  limit: number,
): Promise<Uint8Array> {
  if (!body) return new Uint8Array();
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.byteLength;
      if (size > limit) {
        await reader.cancel().catch(() => undefined);
        throw new LimitError();
      }
      chunks.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}
function boundedStream(
  body: ReadableStream<Uint8Array>,
  limit: number,
  onExceeded: () => void,
) {
  let bytes = 0;
  return body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        bytes += chunk.byteLength;
        if (bytes > limit) {
          onExceeded();
          throw new LimitError();
        }
        controller.enqueue(chunk);
      },
    }),
  );
}
export async function forward(
  request: Request,
  path: string,
  config: BridgeConfig,
  ports: BridgePorts,
): Promise<Response> {
  const id = ports.requestId();
  const fail = (code: Parameters<typeof publicError>[0], status: number) =>
    Response.json(publicError(code, id), {
      status,
      headers: { "Cache-Control": "no-store" },
    });
  if (!isApiRoute(path)) return fail("NOT_FOUND", 404);
  const policy = API_ROUTES[path];
  if (request.method !== policy.method) return fail("NOT_FOUND", 405);
  if (
    request.method !== "GET" &&
    request.headers.get("origin") !== config.FRONTEND_ORIGIN
  )
    return fail("FORBIDDEN", 403);
  const type = request.headers.get("content-type") ?? "";
  if (
    request.method === "POST" &&
    !(path === "catalogue/interpret"
      ? type.startsWith("multipart/form-data;")
      : /^application\/json(?:;|$)/iu.test(type))
  )
    return fail("INVALID_INPUT", 415);
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/u.test(length) || Number(length) > policy.bodyLimit))
    return fail("TOO_LARGE", 413);
  let requestTooLarge = false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), policy.timeoutMs);
  const signal = AbortSignal.any([request.signal, controller.signal]);
  try {
    const headers = new Headers({ Accept: "application/json" });
    if (type) headers.set("Content-Type", type);
    if (request.method !== "GET") headers.set("Origin", config.FRONTEND_ORIGIN);
    if (config.APP_ENV === "production")
      headers.set(
        "Authorization",
        await ports.authorization(config.BACKEND_AUDIENCE, signal),
      );
    const init: RequestInit & { duplex?: "half" } = {
      method: policy.method,
      headers,
      signal,
      redirect: "error",
    };
    if (request.body) {
      init.body = boundedStream(request.body, policy.bodyLimit, () => {
        requestTooLarge = true;
        controller.abort();
      });
      init.duplex = "half";
    }
    const response = await ports.fetch(
      `${config.BACKEND_ORIGIN}/v1/${path}`,
      init,
    );
    if (
      !/^application\/json(?:;|$)/iu.test(
        response.headers.get("content-type") ?? "",
      )
    )
      return fail("UPSTREAM_FAILED", 502);
    const bytes = await readBounded(response.body, policy.responseLimit);
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!response.ok && path !== "ready") {
      const error = PublicErrorSchema.safeParse(parsed);
      if (!error.success) return fail("UPSTREAM_FAILED", 502);
      return fail(error.data.error.code, response.status);
    }
    const schema =
      path === "health"
        ? HealthSchema
        : path === "ready"
          ? ReadinessSchema
          : path === "config"
            ? CapabilitiesSchema
            : null;
    const validated = schema?.safeParse(parsed);
    if (validated && !validated.success) return fail("UPSTREAM_FAILED", 502);
    return Response.json(validated?.success ? validated.data : parsed, {
      status: response.status,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (requestTooLarge || error instanceof LimitError)
      return fail("TOO_LARGE", 413);
    return fail(
      signal.aborted ? "DEADLINE" : "UNAVAILABLE",
      signal.aborted ? 504 : 503,
    );
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}
