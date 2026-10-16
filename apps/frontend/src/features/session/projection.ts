import { PendingCheckoutSchema } from "@retailor/contracts/checkout";
import {
  CurrencyPreferenceSchema,
  INITIAL_CURRENCY,
  OrderDisplaySchema,
} from "@retailor/contracts/currency";
import { validateSnapshot } from "@retailor/commerce/currency";
import { completeDemoReviews } from "@retailor/commerce/scenarios";
import { OwnerViewSchema } from "../operations/state";
import { DashboardStateSchema, INITIAL_DASHBOARD } from "../dashboard/state";
import { ScenarioInfoSchema } from "@retailor/contracts/scenarios";
import { ShoppingSchema, INITIAL_SHOPPING } from "../bag/state";
import { z } from "zod";
import { ConversationSchema } from "../assistants/conversation";
import { INITIAL_LOGOS, LogoStateSchema } from "../logos/state";
import { GraphSchema, TimestampSchema } from "@retailor/contracts/commerce";
import { IdSchema } from "@retailor/contracts/core";
import {
  PhotoSchema,
  PhotoLinksSchema,
  PHOTO_LIMITS,
} from "@retailor/contracts/photos";
import {
  DesignSchema,
  heroPhotoIds,
  DEFAULT_THEME,
  TemplateSchema,
  ThemeSchema,
  TypographySchema,
} from "@retailor/contracts/design";
import { parseGraph, serializedBytes } from "@retailor/commerce/graph";
import { DraftSchema, parseDraft } from "../catalogue/draft";
import { BrowseSchema, INITIAL_BROWSE } from "../storefront/browse";
import {
  SetupSchema,
  INITIAL_SETUP,
  reconcileSetup,
} from "../assistants/setup";
export const SESSION_KEY = "retailor.workspace.v1";
export const SESSION_BYTES = 2 * 1024 * 1024;
export const StageSchema = z.enum([
  "choose",
  "process",
  "catalogue",
  "style",
  "storefront",
  "dashboard",
]);
export type Stage = z.infer<typeof StageSchema>;
export const ProjectionSchema = z.strictObject({
  schemaVersion: z.literal(1),
  savedAt: TimestampSchema,
  graph: GraphSchema,
  stage: StageSchema,
  inputRevision: z.number().int().nonnegative(),
  selectedIds: z.array(IdSchema).max(24),
  photoLinks: PhotoLinksSchema.default([]),
  photoLinksInitialized: z.boolean().default(false),
  autoLinkPhotos: z.boolean().default(true),
  photos: z.array(PhotoSchema).max(32),
  draft: DraftSchema.nullable(),
  acceptedDesign: DesignSchema,
  previewDesign: DesignSchema,
  presentationRevision: z.number().int().nonnegative().max(1_000_000),
  fixture: z.boolean(),
  pendingProvider: z
    .enum(["catalogue", "assistant", "logos"])
    .nullable()
    .default(null),
  browse: BrowseSchema.default(INITIAL_BROWSE),
  setup: SetupSchema.default(INITIAL_SETUP),
  hasAcceptedLook: z.boolean().default(false),
  tourSeen: z
    .strictObject({ preview: z.boolean(), storefront: z.boolean() })
    .default({ preview: false, storefront: false }),
  designEditing: z.boolean().default(false),
  currency: CurrencyPreferenceSchema.default(INITIAL_CURRENCY),
  orderDisplays: z.array(OrderDisplaySchema).max(30).default([]),
  shopping: ShoppingSchema.default(INITIAL_SHOPPING),
  stripeCheckout: PendingCheckoutSchema.nullable().default(null),
  checkoutOrders: z
    .array(z.strictObject({ attemptId: IdSchema, orderId: IdSchema }))
    .max(30)
    .default([]),
  scenario: ScenarioInfoSchema.nullable().default(null),
  ownerView: OwnerViewSchema.default("overview"),
  ownerSearch: z.string().max(100).default(""),
  ownerPage: z.number().int().min(0).max(16).default(0),
  dashboard: DashboardStateSchema.default(INITIAL_DASHBOARD),
  conversation: ConversationSchema.default([]),
  logos: LogoStateSchema.default(INITIAL_LOGOS),
});
export type Projection = z.infer<typeof ProjectionSchema>;
export const INITIAL_DESIGN = DesignSchema.parse({
  template: "studio",
  theme: DEFAULT_THEME,
  typography: "editorial",
  name: "Your collection",
  headline: "A collection with a point of view.",
  revision: 0,
});
export function restoreProjection(
  input: unknown,
  now: number,
  fixtureAllowed: boolean,
) {
  const repaired = recoverDesignPresets(input);
  const currencyRecovery = recoverCurrency(repaired.input, now, fixtureAllowed);
  const previous = currencyRecovery.input;
  const legacyChoice =
    previous &&
    typeof previous === "object" &&
    !Array.isArray(previous) &&
    !("autoLinkPhotos" in previous) &&
    (("photoLinksInitialized" in previous &&
      previous.photoLinksInitialized === true) ||
      ("photoLinks" in previous &&
        Array.isArray(previous.photoLinks) &&
        previous.photoLinks.length > 0));
  const state = ProjectionSchema.parse(
      legacyChoice ? { ...previous, autoLinkPhotos: false } : previous,
    ),
    graph = parseGraph(state.graph);
  if (
    serializedBytes(state) > SESSION_BYTES ||
    Date.parse(graph.createdAt) > now ||
    Date.parse(state.savedAt) > now ||
    Date.parse(state.savedAt) < Date.parse(graph.asOf) ||
    Date.parse(graph.expiresAt) <= now ||
    (state.fixture && !fixtureAllowed)
  )
    throw new Error("This saved workspace is unavailable or expired.");
  const photos = new Map(state.photos.map((photo) => [photo.id, photo]));
  if (
    state.logos.candidates.some(
      (candidate) =>
        (candidate.mode === "fake" && !fixtureAllowed) ||
        Date.parse(candidate.generatedAt) < Date.parse(graph.createdAt) ||
        Date.parse(candidate.generatedAt) > now,
    )
  )
    throw new Error(
      "Saved logos do not belong to this temporary mode or lifetime.",
    );
  if (
    state.photos.reduce((sum, photo) => sum + photo.source.bytes, 0) >
      PHOTO_LIMITS.originals ||
    state.photos.reduce((sum, photo) => sum + photo.derivative.bytes, 0) >
      PHOTO_LIMITS.cachedDerivatives ||
    state.selectedIds.reduce(
      (sum, id) => sum + (photos.get(id)?.derivative.bytes ?? 0),
      0,
    ) > PHOTO_LIMITS.derivatives ||
    photos.size !== state.photos.length ||
    new Set(state.selectedIds).size !== state.selectedIds.length ||
    state.selectedIds.some((id) => !photos.has(id)) ||
    [
      state.acceptedDesign,
      state.previewDesign,
      ...(state.setup.brandDraft ? [state.setup.brandDraft] : []),
    ].some((design) =>
      heroPhotoIds(design).some((id) => id !== null && !photos.has(id)),
    ) ||
    state.photoLinks.some((group) =>
      group.some((id) => !state.selectedIds.includes(id)),
    ) ||
    graph.photos.some(
      (photo) => JSON.stringify(photos.get(photo.id)) !== JSON.stringify(photo),
    )
  )
    throw new Error("Saved photo identities do not match the catalogue.");
  if (state.draft) {
    const draft = parseDraft(state.draft);
    if (draft.mode === "development-fixture" && !fixtureAllowed)
      throw new Error("Development drafts cannot restore in public mode.");
    if (
      draft.inputRevision !== state.inputRevision ||
      draft.photos.length !== state.selectedIds.length ||
      draft.photos.some(
        (photo) =>
          !state.selectedIds.includes(photo.id) ||
          JSON.stringify(photos.get(photo.id)) !== JSON.stringify(photo),
      )
    )
      throw new Error("The saved draft belongs to another photo selection.");
  }
  if (state.stage === "catalogue" && !state.draft)
    throw new Error("The saved catalogue draft is missing.");
  if (
    ["style", "storefront", "dashboard"].includes(state.stage) &&
    !state.hasAcceptedLook &&
    !graph.products.some((product) => !product.archived)
  )
    throw new Error("The saved storefront has no usable catalogue.");
  if (
    new Set(state.orderDisplays.map((item) => item.orderId)).size !==
      state.orderDisplays.length ||
    state.orderDisplays.some(
      (item) =>
        !graph.orders.some((order) => order.id === item.orderId) ||
        (!fixtureAllowed &&
          item.scope.snapshot?.sourceId === "development-fixture"),
    )
  )
    throw new Error("Saved confirmation currency does not match orders");
  if (
    new Set(state.checkoutOrders.map((item) => item.attemptId)).size !==
      state.checkoutOrders.length ||
    new Set(state.checkoutOrders.map((item) => item.orderId)).size !==
      state.checkoutOrders.length ||
    state.checkoutOrders.some(
      (item) =>
        !graph.orders.some(
          (order) =>
            order.id === item.orderId &&
            order.actor === "shopper" &&
            order.origin === "guest_action",
        ) ||
        !state.orderDisplays.some(
          (display) => display.orderId === item.orderId,
        ),
    )
  )
    throw new Error("Saved checkout confirmations do not match orders.");
  if (
    (state.shopping.lastActivityAt &&
      (Date.parse(state.shopping.lastActivityAt) > now ||
        Date.parse(state.shopping.lastActivityAt) <
          Date.parse(graph.createdAt))) ||
    (state.shopping.visitId &&
      !graph.traffic.some(
        (item) =>
          item.id === state.shopping.visitId &&
          item.actor === "shopper" &&
          item.origin === "guest_action",
      )) ||
    (state.shopping.buyerId &&
      !graph.buyers.some(
        (item) => item.id === state.shopping.buyerId && item.fictional,
      )) ||
    (state.shopping.draftId &&
      !graph.orderDrafts.some(
        (item) =>
          item.id === state.shopping.draftId && item.actor === "shopper",
      )) ||
    (state.shopping.lastOrderId &&
      !graph.orders.some(
        (item) =>
          item.id === state.shopping.lastOrderId && item.actor === "shopper",
      ))
  )
    throw new Error("Saved shopping references need repair");
  return {
    ...state,
    // Saved provenance cannot select the current transport or label new fixture work as live.
    // Public-mode rejection above runs before adopting this runtime's mode.
    fixture: fixtureAllowed,
    graph:
      state.scenario && !state.stripeCheckout
        ? completeDemoReviews(graph, state.scenario.preset)
        : graph,
    conversation: state.conversation.map((message) => ({
      ...message,
      restored: true,
    })),
    setup: reconcileSetup(state.setup, state.previewDesign),
    stage: state.stage === "process" ? ("choose" as const) : state.stage,
  };
}
/** Explicit allow-list, not runtime serialization with sensitive fields removed. */
export function serializeProjection(state: Projection, now: number) {
  const selected = {
    schemaVersion: state.schemaVersion,
    savedAt: new Date(now).toISOString(),
    graph: state.graph,
    stage: state.stage,
    inputRevision: state.inputRevision,
    selectedIds: state.selectedIds,
    photoLinks: state.photoLinks,
    photoLinksInitialized: state.photoLinksInitialized,
    autoLinkPhotos: state.autoLinkPhotos,
    photos: state.photos,
    draft: state.draft,
    acceptedDesign: state.acceptedDesign,
    previewDesign: state.previewDesign,
    presentationRevision: state.presentationRevision,
    fixture: state.fixture,
    pendingProvider: state.pendingProvider,
    browse: state.browse,
    setup: state.setup,
    hasAcceptedLook: state.hasAcceptedLook,
    tourSeen: state.tourSeen,
    designEditing: state.designEditing,
    currency: state.currency,
    orderDisplays: state.orderDisplays,
    shopping: state.shopping,
    stripeCheckout: state.stripeCheckout,
    checkoutOrders: state.checkoutOrders,
    scenario: state.scenario,
    ownerView: state.ownerView,
    ownerSearch: state.ownerSearch,
    ownerPage: state.ownerPage,
    dashboard: state.dashboard,
    conversation: state.conversation,
    logos: state.logos,
  };
  const encoded = JSON.stringify(ProjectionSchema.parse(selected));
  if (serializedBytes(selected) > SESSION_BYTES)
    throw new Error("This workspace exceeds its 2-MiB recovery envelope.");
  return encoded;
}

/** Repair only obsolete finite IDs. Other malformed or unknown data stays rejected. */
export function recoverDesignPresets(input: unknown): {
  input: unknown;
  repaired: boolean;
} {
  if (!input || typeof input !== "object" || Array.isArray(input))
    return { input, repaired: false };
  const raw = { ...input } as Record<string, unknown>;
  let repaired = false;
  for (const field of ["acceptedDesign", "previewDesign"] as const) {
    const value = raw[field];
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const design = { ...value } as Record<string, unknown>;
    for (const [key, schema] of [
      ["template", TemplateSchema],
      ["theme", ThemeSchema],
      ["typography", TypographySchema],
    ] as const) {
      if (
        typeof design[key] === "string" &&
        !schema.safeParse(design[key]).success
      ) {
        design[key] = INITIAL_DESIGN[key];
        repaired = true;
      }
    }
    if (
      design.pageTemplates &&
      typeof design.pageTemplates === "object" &&
      !Array.isArray(design.pageTemplates)
    ) {
      const pages = { ...design.pageTemplates } as Record<string, unknown>;
      for (const page of ["home", "collection", "product"] as const) {
        if (
          typeof pages[page] === "string" &&
          !TemplateSchema.safeParse(pages[page]).success
        ) {
          pages[page] = design.template;
          repaired = true;
        }
      }
      design.pageTemplates = pages;
    }
    raw[field] = design;
  }
  if (repaired) {
    raw.setup = structuredClone(INITIAL_SETUP);
    raw.hasAcceptedLook = false;
  }
  return { input: raw, repaired };
}

export function recoverCurrency(
  input: unknown,
  now: number,
  fixtureAllowed: boolean,
): { input: unknown; repaired: boolean } {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    !("currency" in input)
  )
    return { input, repaired: false };
  const parsed = CurrencyPreferenceSchema.safeParse(input.currency);
  try {
    if (!parsed.success) throw new Error("Invalid preference");
    if (parsed.data.acceptedSnapshot)
      validateSnapshot(parsed.data.acceptedSnapshot, now, fixtureAllowed);
    return { input, repaired: false };
  } catch {
    const raw = {
      ...input,
      currency: structuredClone(INITIAL_CURRENCY),
    } as Record<string, unknown>;
    if (
      raw.browse &&
      typeof raw.browse === "object" &&
      "filters" in raw.browse &&
      raw.browse.filters &&
      typeof raw.browse.filters === "object"
    )
      raw.browse = {
        ...raw.browse,
        filters: { ...raw.browse.filters, minPrice: null, maxPrice: null },
      };
    return { input: raw, repaired: true };
  }
}
