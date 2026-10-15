import { z } from "zod";
import { IdSchema, ModeSchema, RevisionSchema } from "./core.js";
import { ThemeSchema, TypographySchema } from "./design.js";
const timestamp = z.iso.datetime({ precision: 3 });
const hash = z.string().regex(/^[a-f0-9]{64}$/u);
export const LOGO_LIMITS = Object.freeze({
  count: 3,
  batches: 2,
  bodyBytes: 65536,
  imageBytes: 1048576,
  cacheBytes: 3145728,
  responseBytes: 4404020,
  base64Chars: 1398104,
  side: 1024,
  deadlineMs: 180000,
  providerMs: 150000,
  browserMs: 195000,
  grantMs: 120000,
});
export const LogoContextSchema = z.strictObject({
  name: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .regex(/^[^\p{C}]+$/u),
  theme: ThemeSchema,
  typography: TypographySchema,
  designRevision: RevisionSchema,
  themeConfirmed: z.literal(true),
  typographyConfirmed: z.literal(true),
});
export type LogoContext = z.infer<typeof LogoContextSchema>;
export const LogoActionSchema = z.strictObject({
  schemaVersion: z.literal(1),
  action: z.literal("logos"),
  mode: z.literal("live"),
  workspaceId: IdSchema.max(40),
  operationId: IdSchema.max(40),
  createdAt: timestamp,
  expiresAt: timestamp,
  nameDigest: hash,
  theme: ThemeSchema,
  typography: TypographySchema,
  designRevision: RevisionSchema,
  count: z.literal(3),
  generatorPolicy: z.literal("local-fonts-v1"),
  outputPolicy: z.literal("transparent-png-v1"),
});
export type LogoAction = z.infer<typeof LogoActionSchema>;
export function parseLogoAction(input: unknown): LogoAction {
  const action = LogoActionSchema.parse(input);
  if (Date.parse(action.expiresAt) - Date.parse(action.createdAt) !== 7200000)
    throw new Error("Invalid logo workspace lifetime");
  return action;
}
const requestFields = {
  schemaVersion: z.literal(1),
  workspaceId: IdSchema.max(40),
  operationId: IdSchema.max(40),
  createdAt: timestamp,
  expiresAt: timestamp,
  context: LogoContextSchema,
};
export const LogoRequestSchema = z.discriminatedUnion("mode", [
  z.strictObject({
    ...requestFields,
    mode: z.literal("fake"),
    action: z.null(),
    grant: z.null(),
  }),
  z.strictObject({
    ...requestFields,
    mode: z.literal("live"),
    action: LogoActionSchema,
    grant: z.string().min(1).max(2048),
  }),
]);
export type LogoRequest = z.infer<typeof LogoRequestSchema>;
export const LogoMetadataSchema = z.strictObject({
  id: IdSchema,
  hash,
  mime: z.literal("image/png"),
  bytes: z.number().int().min(1).max(LOGO_LIMITS.imageBytes),
  width: z.number().int().min(1).max(LOGO_LIMITS.side),
  height: z.number().int().min(1).max(LOGO_LIMITS.side),
  context: LogoContextSchema,
  generatedAt: timestamp,
  mode: ModeSchema,
});
export type LogoMetadata = z.infer<typeof LogoMetadataSchema>;
export const LogoCandidateSchema = LogoMetadataSchema.extend({
  data: z
    .string()
    .min(1)
    .max(LOGO_LIMITS.base64Chars)
    .regex(/^[A-Za-z0-9+/]*={0,2}$/u),
});
export const LogoResultSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    mode: ModeSchema,
    workspaceId: IdSchema.max(40),
    operationId: IdSchema.max(40),
    context: LogoContextSchema,
    candidates: z.tuple([
      LogoCandidateSchema,
      LogoCandidateSchema,
      LogoCandidateSchema,
    ]),
  })
  .refine(
    (result) =>
      new Set(result.candidates.map((c) => c.id)).size === 3 &&
      new Set(result.candidates.map((c) => c.hash)).size === 3 &&
      result.candidates.every(
        (c) =>
          c.mode === result.mode &&
          JSON.stringify(c.context) === JSON.stringify(result.context),
      ),
    "Invalid independent logo set",
  );
export type LogoResult = z.infer<typeof LogoResultSchema>;
