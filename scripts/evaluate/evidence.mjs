import { createRequire } from "node:module";
import { LIVE_CASES } from "./plan.mjs";
import { ErrorCodeSchema } from "@retailor/contracts/api";
const backendRequire = createRequire(
  new URL("../../apps/backend/package.json", import.meta.url),
);
const { z } = backendRequire("zod");
export const GUARD_CASES = [
  "catalogue_replay",
  "catalogue_changed_bytes",
  "foreign_origin",
  "foreign_role",
  "missing_product_photo",
  "capture_request_rejected",
];
const ids = [...LIVE_CASES.map((c) => c.id), ...GUARD_CASES];
export const EvidenceSchema = z.strictObject({
  schemaVersion: z.literal(1),
  candidate: z.string().regex(/^[a-f0-9]{40}$/u),
  caseId: z.enum(ids),
  execution: z.enum(["fixture", "owner-recorded-live"]),
  recordedAt: z.iso.datetime({ precision: 3 }),
  outcome: z.enum(["pass", "fail", "pending", "unknown"]),
  durationMs: z.number().int().min(0).max(86400000),
  appRequestId: z.uuid().optional(),
  requestIds: z
    .array(z.string().regex(/^(?:[a-f0-9-]{36}|req_[A-Za-z0-9-]{1,80})$/u))
    .max(3),
  httpStatus: z.number().int().min(100).max(599).nullable(),
  providerRequests: z.number().int().min(0).max(3),
  inputCount: z.number().int().min(0).max(24),
  outputCount: z.number().int().min(0).max(20),
  usage: z
    .strictObject({
      inputTokens: z.number().int().min(0).max(2000000),
      outputTokens: z.number().int().min(0).max(100000),
    })
    .nullable(),
  measuredCostMicroUsd: z.number().int().min(0).max(100000000).nullable(),
  errorCategory: z.union([
    z.literal("none"),
    ErrorCodeSchema,
    z.literal("unknown"),
  ]),
});
/** A supplied owner record is asserted evidence, never automatic provider/release approval. */
export function validateEvidence(text) {
  if (Buffer.byteLength(text, "utf8") > 16384)
    throw new Error("Evidence exceeds its envelope");
  return EvidenceSchema.parse(JSON.parse(text));
}
