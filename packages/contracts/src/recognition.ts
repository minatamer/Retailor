import { z } from "zod";
import { IdSchema } from "./core.js";
import { PhotoSchema, RecognitionManifestSchema } from "./photos.js";
import { CategorySchema } from "./product.js";
import { TimestampSchema } from "./commerce.js";
import { DraftSchema } from "./catalogue.js";

export const RECOGNITION_LIMITS = Object.freeze({
  metadata: 64 * 1024,
  transport: 19 * 1024 * 1024,
  response: 768 * 1024,
  deadlineMs: 120_000,
  providerMs: 95_000,
  grantMs: 120_000,
  attempts: 2,
  outputTokens: 12_000,
  observationBytes: 96 * 1024,
});
export const DISCLOSURE_VERSION = "catalogue-previews-v1" as const;
export const CatalogueActionSchema = z.strictObject({
  schemaVersion: z.literal(1),
  action: z.literal("catalogue"),
  mode: z.literal("live"),
  workspaceId: IdSchema,
  operationId: IdSchema,
  createdAt: TimestampSchema,
  expiresAt: TimestampSchema,
  inputRevision: z.number().int().nonnegative().max(1_000_000),
  disclosureVersion: z.literal(DISCLOSURE_VERSION),
  photos: z.array(PhotoSchema).min(1).max(24),
});
export type CatalogueAction = z.infer<typeof CatalogueActionSchema>;
export function parseCatalogueAction(input: unknown) {
  const action = CatalogueActionSchema.parse(input);
  if (Date.parse(action.expiresAt) - Date.parse(action.createdAt) !== 7_200_000)
    throw new Error("A workspace has one fixed two-hour lifetime.");
  RecognitionManifestSchema.parse(
    action.photos.map((photo) => photo.derivative),
  );
  if (
    action.photos.reduce((sum, photo) => sum + photo.source.bytes, 0) >
    40 * 1024 * 1024
  )
    throw new Error("Original metadata exceeds its envelope.");
  return action;
}
export const AdmissionResultSchema = z.strictObject({
  schemaVersion: z.literal(1),
  operationId: IdSchema,
  grant: z.string().min(1).max(2048),
  expiresAt: TimestampSchema,
});
export const RecognitionRequestSchema = z.strictObject({
  action: CatalogueActionSchema,
  grant: z.string().min(1).max(2048),
});
export const RecognitionResultSchema = z.strictObject({
  schemaVersion: z.literal(1),
  workspaceId: IdSchema,
  operationId: IdSchema,
  inputRevision: z.number().int().nonnegative().max(1_000_000),
  mode: z.literal("live"),
  draft: DraftSchema,
});

// A model proposes source references and evidence. Application code alone assigns
// product/variant IDs, price, cost, stock and sizing options.
const SourceIds = z.array(IdSchema).min(1).max(8);
export const ModelAttributeSchema = z.strictObject({
  name: z.enum([
    "colour",
    "pattern",
    "closure",
    "sleeve",
    "neckline",
    "material",
    "care",
    "fit",
  ]),
  value: z.string().max(100).nullable(),
  sourceIds: z.array(IdSchema).max(8),
  evidence: z.enum(["visual", "label", "unknown"]),
});
export const ModelGarmentSchema = z.strictObject({
  sourceIds: SourceIds,
  classification: z.enum(["clothing", "uncertain"]),
  category: CategorySchema.nullable(),
  title: z.string().min(1).max(100),
  description: z.string().max(400),
  grouping: z.enum(["single", "supported_views", "uncertain"]),
  reviewReason: z.string().max(200),
  attributes: z.array(ModelAttributeSchema).max(8),
});
export const ModelCatalogueSchema = z.strictObject({
  garments: z.array(ModelGarmentSchema).max(20),
  dispositions: z
    .array(
      z.strictObject({
        sourceId: IdSchema,
        kind: z.enum(["linked", "review", "rejected"]),
        garmentIndexes: z.array(z.number().int().nonnegative().max(19)).max(20),
        reason: z.string().max(200),
      }),
    )
    .min(1)
    .max(24),
});
export type ModelCatalogue = z.infer<typeof ModelCatalogueSchema>;
