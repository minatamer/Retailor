import { z } from "zod";
import { IdSchema, ModeSchema, RevisionSchema } from "./core.js";
import { GraphSchema, TimestampSchema } from "./commerce.js";
import { CategorySchema, AttributeSchema } from "./product.js";
import { FactIdSchema, FactScopeSchema } from "./facts.js";
import { CurrencyScopeSchema, DisplayMinorSchema } from "./currency.js";
import {
  DesignSchema,
  TemplateSchema,
  ThemeSchema,
  TypographySchema,
  PageTemplatesSchema,
  resolvedTemplates,
} from "./design.js";
import { ScenarioPresetSchema } from "./scenarios.js";

export const ASSISTANT_LIMITS = Object.freeze({
  bodyBytes: 768 * 1024,
  responseBytes: 64 * 1024,
  promptChars: 2000,
  replyChars: 4000,
  messages: 40,
  recentMessages: 12,
  inputTokens: 12000,
  outputTokens: 1500,
  modelRequests: 3,
  tools: 4,
  turns: 12,
  deadlineMs: 60000,
  grantMs: 120000,
  // Every serialized UTF-8 byte counts as a token upper bound; leave a further thousand for provider framing.
  modelInputBytes: 11000,
});
export const AssistantRoleSchema = z.enum(["creator", "shopper", "owner"]);
export type AssistantRole = z.infer<typeof AssistantRoleSchema>;
export const OwnerViewSchema = z.enum([
  "overview",
  "products",
  "orders",
  "returns",
  "inventory",
  "expenses",
  "traffic",
  "feedback",
  "design",
]);
export const OwnerOperationSchema = z.enum([
  "createProduct",
  "updateProduct",
  "removeProduct",
  "saveOrderDraft",
  "deleteOrderDraft",
  "placeOrder",
  "cancelOrder",
  "advanceOrder",
  "requestReturn",
  "advanceReturn",
  "receiveReturn",
  "restockReturn",
  "issueRefund",
  "adjustStock",
  "writeoffStock",
  "setUnitCost",
  "saveExpenseDraft",
  "deleteExpenseDraft",
  "postExpense",
  "correctExpense",
  "voidExpense",
  "undo",
]);
export const AssistantRecordKindSchema = z.enum([
  "order",
  "line",
  "product",
  "variant",
  "refund",
  "return",
  "expense",
  "movement",
  "writeoff",
  "cancellation",
  "traffic",
  "buyer",
  "feedback",
]);
export const TourTargetSchema = z.enum([
  "store-home",
  "store-collection",
  "store-product",
  "store-bag",
  "store-pages",
  "store-owner",
  "demo-personalize",
  "demo-reset",
  "tailor-panel",
  "tailor-choices",
  "owner-scope",
  "owner-kpis",
  "owner-trend",
  "owner-records",
]);
export const ChatInputSchema = z
  .strictObject({
    role: z.enum(["user", "assistant"]),
    text: z.string().min(1).max(4000),
  })
  .refine(
    (m) => m.role !== "user" || m.text.length <= ASSISTANT_LIMITS.promptChars,
    "User message too long",
  );
export const AssistantContextSchema = z.strictObject({
  role: AssistantRoleSchema,
  graph: GraphSchema,
  scope: FactScopeSchema,
  currency: CurrencyScopeSchema,
  design: DesignSchema,
  availablePhotoIds: z.array(IdSchema).max(32),
  // A narrow projection of current UI context, not another catalogue/filter authority.
  query: z.string().max(100),
  categories: z.array(CategorySchema).max(18),
  minimum: DisplayMinorSchema.nullable(),
  maximum: DisplayMinorSchema.nullable(),
  selectedProductId: IdSchema.nullable(),
  selectedFactId: FactIdSchema.nullable(),
  selectedDay: z.iso.date().nullable(),
  designConfirmed: z.boolean(),
});
export type AssistantContext = z.infer<typeof AssistantContextSchema>;
export const AssistantPayloadSchema = z.strictObject({
  schemaVersion: z.literal(1),
  mode: ModeSchema,
  operationId: IdSchema,
  context: AssistantContextSchema,
  prompt: z.string().trim().min(1).max(ASSISTANT_LIMITS.promptChars),
  history: z.array(ChatInputSchema).max(ASSISTANT_LIMITS.recentMessages),
});
export type AssistantPayload = z.infer<typeof AssistantPayloadSchema>;
export const ASSISTANT_DISCLOSURE_VERSION = "tailor-context-v1" as const;
/** Admission binds this small digest envelope; execution verifies the complete canonical payload. */
export const AssistantActionSchema = z.strictObject({
  schemaVersion: z.literal(1),
  action: z.literal("assistant"),
  mode: z.literal("live"),
  role: AssistantRoleSchema,
  workspaceId: IdSchema,
  operationId: IdSchema,
  scenarioId: IdSchema,
  dataRevision: RevisionSchema,
  createdAt: TimestampSchema,
  expiresAt: TimestampSchema,
  disclosureVersion: z.literal(ASSISTANT_DISCLOSURE_VERSION),
  digest: z.string().regex(/^[a-f0-9]{64}$/),
});
export type AssistantAction = z.infer<typeof AssistantActionSchema>;
export function parseAssistantAction(input: unknown) {
  const value = AssistantActionSchema.parse(input);
  if (Date.parse(value.expiresAt) - Date.parse(value.createdAt) !== 7_200_000)
    throw new Error("A workspace has a fixed two-hour lifetime.");
  return value;
}
export const AssistantRequestSchema = z
  .strictObject({
    payload: AssistantPayloadSchema,
    action: AssistantActionSchema.nullable(),
    grant: z.string().min(1).max(2048).nullable(),
  })
  .refine(
    (r) =>
      r.payload.mode === "fake"
        ? r.action === null && r.grant === null
        : r.action !== null && r.grant !== null,
    "Mode and admission do not match",
  );
export type AssistantRequest = z.infer<typeof AssistantRequestSchema>;
export const AssistantReferenceSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("product"), productId: IdSchema }),
  z.strictObject({ kind: z.literal("variant"), variantId: IdSchema }),
  z.strictObject({
    kind: z.literal("fact"),
    factId: FactIdSchema,
    day: z.iso.date().nullable(),
    productId: IdSchema.nullable(),
  }),
  z.strictObject({
    kind: z.literal("record"),
    recordKind: AssistantRecordKindSchema,
    recordId: IdSchema,
  }),
]);
export type AssistantReference = z.infer<typeof AssistantReferenceSchema>;
const FilterActionSchema = z.strictObject({
  kind: z.literal("filter"),
  category: CategorySchema.nullable(),
  query: z.string().max(100),
  minimum: DisplayMinorSchema.nullable(),
  maximum: DisplayMinorSchema.nullable(),
});
const PrefillSchema = z.strictObject({
  title: z.string().max(100).nullable(),
  category: CategorySchema.nullable(),
  note: z.string().max(160).nullable(),
});
export const AssistantNavigationSchema = z.discriminatedUnion("kind", [
  FilterActionSchema,
  z.strictObject({ kind: z.literal("open-product"), productId: IdSchema }),
  z.strictObject({ kind: z.literal("owner-view"), view: OwnerViewSchema }),
  z.strictObject({ kind: z.literal("tour"), role: AssistantRoleSchema }),
]);
export const AssistantProposalSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("operation"),
    operation: OwnerOperationSchema,
    targetId: IdSchema.nullable(),
    prefill: PrefillSchema,
  }),
  z.strictObject({
    kind: z.literal("operation-choices"),
    operation: OwnerOperationSchema,
    targetIds: z.array(IdSchema).max(6),
    moreMatches: z.boolean(),
    prefill: PrefillSchema,
  }),
  z.strictObject({
    kind: z.literal("bag"),
    variantId: IdSchema,
    quantity: z.number().int().min(1).max(5),
  }),
  z.strictObject({
    kind: z.literal("design"),
    template: TemplateSchema.nullable(),
    pageTemplates: PageTemplatesSchema.nullable().optional(),
    theme: ThemeSchema.nullable(),
    typography: TypographySchema.nullable(),
  }),
  z.strictObject({ kind: z.literal("logo-offer") }),
  z.strictObject({ kind: z.literal("scenario"), preset: ScenarioPresetSchema }),
]);
export type AssistantNavigation = z.infer<typeof AssistantNavigationSchema>;
export type AssistantProposal = z.infer<typeof AssistantProposalSchema>;
export const AssistantClaimSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("attribute"),
    productId: IdSchema,
    name: AttributeSchema.shape.name,
    value: z.string().min(1).max(100),
  }),
  z.strictObject({
    kind: z.literal("observation"),
    factId: FactIdSchema,
    state: z.enum(["positive", "negative", "zero", "unavailable"]),
  }),
]);
/** Models supply bounded prose/IDs; application code supplies authoritative amounts and actions. */
export const ModelAssistantReplySchema = z.strictObject({
  text: z.string().min(1).max(ASSISTANT_LIMITS.replyChars),
  references: z.array(AssistantReferenceSchema).max(8),
  claims: z.array(AssistantClaimSchema).max(8),
  navigation: AssistantNavigationSchema.nullable(),
  proposal: AssistantProposalSchema.nullable(),
});
export type ModelAssistantReply = z.infer<typeof ModelAssistantReplySchema>;
export const AssistantFenceSchema = z.strictObject({
  workspaceId: IdSchema,
  scenarioId: IdSchema,
  dataRevision: RevisionSchema,
  currencyKey: z.string().max(100),
  scopeKey: z.string().max(160),
  designKey: z.string().max(4096),
  filterKey: z.string().max(2048),
  photoKey: z.string().max(2048),
});
export const AssistantResultSchema = z.strictObject({
  schemaVersion: z.literal(1),
  mode: ModeSchema,
  operationId: IdSchema,
  role: AssistantRoleSchema,
  fence: AssistantFenceSchema,
  reply: ModelAssistantReplySchema,
  sensitivity: z.strictObject({
    currency: z.boolean(),
    scope: z.boolean(),
    design: z.boolean(),
    filters: z.boolean(),
  }),
});
export type AssistantResult = z.infer<typeof AssistantResultSchema>;
/** Shared canonical presentation witness; contains identifiers/presets, never authoritative calculated values. */
export function assistantFence(c: AssistantContext) {
  return AssistantFenceSchema.parse({
    workspaceId: c.graph.workspaceId,
    scenarioId: c.graph.scenarioId,
    dataRevision: c.graph.revision,
    currencyKey:
      c.currency.currency === "USD"
        ? "USD"
        : `EUR:${c.currency.snapshot.snapshotId}:${c.currency.snapshot.rateDecimal}:${c.currency.snapshot.rateDate}`,
    scopeKey: `${c.scope.from}|${c.scope.to}|${c.scope.asOf}|${c.selectedDay ?? ""}|${c.selectedFactId ?? ""}`,
    designKey: JSON.stringify([
      c.design.template,
      c.design.theme,
      c.design.typography,
      c.design.name,
      c.design.headline,
      c.design.heroPhotoId,
      c.design.additionalHeroPhotoIds ?? [null, null],
      resolvedTemplates(c.design),
    ]),
    filterKey: JSON.stringify([
      c.query,
      c.categories,
      c.minimum,
      c.maximum,
      c.selectedProductId,
    ]),
    photoKey: JSON.stringify([...c.availablePhotoIds].sort()),
  });
}
export const AssistantToolNameSchema = z.enum([
  "getDesignPresets",
  "searchCatalogue",
  "getProductFacts",
  "getCurrencyQuote",
  "getStorePolicies",
  "getMetricFacts",
  "inspectRecords",
  "openRegisteredView",
  "applyCatalogueFilter",
  "previewStoreDesign",
  "startRegisteredTour",
  "prepareOperation",
  "prepareBagChange",
  "prepareLogoGeneration",
  "prepareScenarioSwitch",
]);
export type AssistantToolName = z.infer<typeof AssistantToolNameSchema>;
// One strict nullable parameter shape keeps the provider schema finite; each named dispatcher validates its relevant fields.
export const AssistantToolArgumentsSchema = z.strictObject({
  query: z.string().max(100).nullable(),
  category: CategorySchema.nullable(),
  minimum: DisplayMinorSchema.nullable(),
  maximum: DisplayMinorSchema.nullable(),
  productId: IdSchema.nullable(),
  variantId: IdSchema.nullable(),
  recordKind: AssistantRecordKindSchema.nullable(),
  recordId: IdSchema.nullable(),
  factIds: z.array(FactIdSchema).max(6).nullable(),
  view: OwnerViewSchema.nullable(),
  operation: OwnerOperationSchema.nullable(),
  quantity: z.number().int().min(1).max(5).nullable(),
  template: TemplateSchema.nullable(),
  pageTemplates: PageTemplatesSchema.nullable().default(null),
  theme: ThemeSchema.nullable(),
  typography: TypographySchema.nullable(),
  prefill: PrefillSchema.nullable(),
  scenario: ScenarioPresetSchema.nullable(),
});
export type AssistantToolArguments = z.infer<
  typeof AssistantToolArgumentsSchema
>;
