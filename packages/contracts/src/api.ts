import { z } from "zod";
import { IdSchema, ModeSchema } from "./core.js";
export const ErrorCodeSchema = z.enum([
  "INVALID_INPUT",
  "TOO_LARGE",
  "FORBIDDEN",
  "STALE",
  "BUSY",
  "UNAVAILABLE",
  "UPSTREAM_FAILED",
  "DEADLINE",
  "NOT_FOUND",
]);
export const PublicErrorSchema = z.strictObject({
  schemaVersion: z.literal(1),
  error: z.strictObject({
    code: ErrorCodeSchema,
    message: z.string().max(180),
    requestId: IdSchema,
    retry: z.enum(["never", "review", "deliberate"]),
  }),
});
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;
export const CapabilitySchema = z.strictObject({
  available: z.boolean(),
  reason: z.enum([
    "fixture",
    "not-implemented",
    "missing-prerequisites",
    "ready",
    "paid-disabled",
  ]),
});
export const CapabilitiesSchema = z.strictObject({
  schemaVersion: z.literal(1),
  mode: ModeSchema,
  paidEnabled: z.boolean(),
  vision: CapabilitySchema,
  tailor: CapabilitySchema,
  logos: CapabilitySchema,
  eur: CapabilitySchema,
});
export type Capabilities = z.infer<typeof CapabilitiesSchema>;
export const HealthSchema = z.strictObject({
  schemaVersion: z.literal(1),
  service: z.literal("retailor-backend"),
  status: z.literal("alive"),
  revision: z.string().max(64),
});
export const ReadinessSchema = z.strictObject({
  schemaVersion: z.literal(1),
  ready: z.boolean(),
  mode: ModeSchema,
});
export const API_ROUTES = {
  health: { method: "GET", bodyLimit: 0, responseLimit: 8192, timeoutMs: 5000 },
  ready: { method: "GET", bodyLimit: 0, responseLimit: 8192, timeoutMs: 5000 },
  config: { method: "GET", bodyLimit: 0, responseLimit: 8192, timeoutMs: 5000 },
  sample: {
    method: "GET",
    bodyLimit: 0,
    responseLimit: 65536,
    timeoutMs: 5000,
  },
  "currency/usd-eur": {
    method: "GET",
    bodyLimit: 0,
    responseLimit: 8192,
    timeoutMs: 6000,
  },
  admission: {
    method: "POST",
    bodyLimit: 65536,
    responseLimit: 8192,
    timeoutMs: 10000,
  },
  "catalogue/interpret": {
    method: "POST",
    bodyLimit: 19 * 1024 * 1024,
    responseLimit: 768 * 1024,
    timeoutMs: 135000,
  },
  "brand/logos": {
    method: "POST",
    bodyLimit: 65536,
    responseLimit: 4_404_020,
    timeoutMs: 195000,
  },
  "assistant/creator": {
    method: "POST",
    bodyLimit: 768 * 1024,
    responseLimit: 65536,
    timeoutMs: 75000,
  },
  "assistant/shopper": {
    method: "POST",
    bodyLimit: 768 * 1024,
    responseLimit: 65536,
    timeoutMs: 75000,
  },
  "assistant/owner": {
    method: "POST",
    bodyLimit: 768 * 1024,
    responseLimit: 65536,
    timeoutMs: 75000,
  },
} as const;
export type ApiRoute = keyof typeof API_ROUTES;
export function isApiRoute(value: string): value is ApiRoute {
  return Object.hasOwn(API_ROUTES, value);
}
const MESSAGES: Record<ErrorCode, string> = {
  INVALID_INPUT: "Review the information and try again.",
  TOO_LARGE: "This request exceeds the demo limit.",
  FORBIDDEN: "This action needs a valid approval.",
  STALE: "Review the current workspace before continuing.",
  BUSY: "The demo is busy. Please try again shortly.",
  UNAVAILABLE: "This capability is currently unavailable. Your work is safe.",
  UPSTREAM_FAILED: "The result could not be completed. Your work is safe.",
  DEADLINE: "This attempt timed out. Your work is safe.",
  NOT_FOUND: "This demo operation does not exist.",
};
export function publicError(code: ErrorCode, requestId: string) {
  return PublicErrorSchema.parse({
    schemaVersion: 1,
    error: {
      code,
      message: MESSAGES[code],
      requestId,
      retry:
        code === "INVALID_INPUT" || code === "STALE"
          ? "review"
          : code === "BUSY" ||
              code === "DEADLINE" ||
              code === "UNAVAILABLE" ||
              code === "UPSTREAM_FAILED"
            ? "deliberate"
            : "never",
    },
  });
}
