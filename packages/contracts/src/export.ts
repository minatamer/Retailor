import { z } from "zod";
import { GraphSchema, TimestampSchema } from "./commerce.js";
import { DesignSchema } from "./design.js";
import { LogoMetadataSchema } from "./brand.js";
import { CurrencyPreferenceSchema, OrderDisplaySchema } from "./currency.js";
import { ScenarioInfoSchema } from "./scenarios.js";
import { FactScopeSchema, MetricFactSchema } from "./facts.js";
import { PhotoSchema } from "./photos.js";
import { DraftSchema } from "./catalogue.js";

export const EXPORT_LIMITS = { bytes: 2 * 1024 * 1024 } as const;
/** A report, not an importable workspace or command replay envelope. */
export const ExportRecordsSchema = GraphSchema.omit({
  bag: true,
  orderDrafts: true,
  expenseDrafts: true,
  receipts: true,
});
export const DemoExportSchema = z.strictObject({
  schemaVersion: z.literal(1),
  kind: z.literal("retailor-demo-report"),
  exportedAt: TimestampSchema,
  notice: z.literal(
    "Synthetic clothing demo. No real payment, shipping or accounting authority. Images, chat and pending actions are excluded; this report cannot restore a workspace.",
  ),
  mode: z.enum(["development-fixture", "live"]),
  moneyAuthority: z.literal("USD integer cents"),
  records: ExportRecordsSchema,
  catalogueReview: DraftSchema.nullable(),
  catalogueReviewIsHistorical: z.literal(true),
  scenario: ScenarioInfoSchema.nullable(),
  acceptedDesign: DesignSchema.nullable(),
  selectedLogo: LogoMetadataSchema.nullable(),
  heroPhoto: PhotoSchema.nullable(),
  currency: CurrencyPreferenceSchema,
  orderDisplays: z.array(OrderDisplaySchema).max(30),
  report: z.strictObject({
    period: z.enum(["7days", "28days", "all"]),
    scope: FactScopeSchema,
    facts: z.array(MetricFactSchema).max(48),
  }),
});
export type DemoExport = z.infer<typeof DemoExportSchema>;
