import {
  AssistantToolNameSchema,
  AssistantToolArgumentsSchema,
} from "@retailor/contracts/assistant";
import type {
  AssistantToolName,
  AssistantReference,
  AssistantNavigation,
  AssistantProposal,
  AssistantToolArguments,
} from "@retailor/contracts/assistant";
import {
  TemplateSchema,
  ThemeSchema,
  TypographySchema,
  StorePageSchema,
  resolvedTemplates,
  DEFAULT_THEME,
  THEME_LABELS,
} from "@retailor/contracts/design";
import { displayMinor } from "@retailor/commerce/currency";
import { stockOf } from "@retailor/commerce/selectors";
import { deny } from "../security/errors.js";
import type { PreparedAssistantContext } from "./context.js";
import { operationEligible, operationTargets } from "./operations.js";
import { BRAND_PALETTE } from "../brand/context.js";

export const ROLE_TOOLS: Record<
  PreparedAssistantContext["payload"]["context"]["role"],
  readonly AssistantToolName[]
> = {
  creator: [
    "getDesignPresets",
    "getProductFacts",
    "previewStoreDesign",
    "startRegisteredTour",
    "prepareLogoGeneration",
  ],
  shopper: [
    "searchCatalogue",
    "getProductFacts",
    "getCurrencyQuote",
    "getStorePolicies",
    "applyCatalogueFilter",
    "startRegisteredTour",
    "prepareBagChange",
  ],
  owner: [
    "getDesignPresets",
    "getProductFacts",
    "getMetricFacts",
    "inspectRecords",
    "openRegisteredView",
    "startRegisteredTour",
    "prepareOperation",
    "prepareLogoGeneration",
    "prepareScenarioSwitch",
    "previewStoreDesign",
  ],
};
export interface AssistantToolResult {
  data: unknown;
  references: AssistantReference[];
  navigation: AssistantNavigation | null;
  proposal: AssistantProposal | null;
}
export const TOOL_ARGUMENT_KEYS: Record<
  AssistantToolName,
  readonly (keyof AssistantToolArguments)[]
> = {
  getDesignPresets: [],
  getProductFacts: ["productId"],
  getCurrencyQuote: [],
  getStorePolicies: [],
  searchCatalogue: ["query", "category", "minimum", "maximum"],
  applyCatalogueFilter: ["query", "category", "minimum", "maximum"],
  getMetricFacts: ["factIds"],
  openRegisteredView: ["view"],
  startRegisteredTour: [],
  previewStoreDesign: ["template", "pageTemplates", "theme", "typography"],
  prepareLogoGeneration: [],
  prepareBagChange: ["variantId", "quantity"],
  inspectRecords: ["recordKind", "recordId"],
  prepareOperation: ["operation", "recordId", "prefill", "query"],
  prepareScenarioSwitch: ["scenario"],
};
function only(
  args: AssistantToolArguments,
  allowed: readonly (keyof AssistantToolArguments)[],
) {
  if (
    Object.entries(args).some(
      ([key, value]) =>
        value !== null &&
        !allowed.includes(key as keyof AssistantToolArguments),
    )
  )
    return deny("INVALID_INPUT", 400);
}
export function executeAssistantTool(
  prepared: PreparedAssistantContext,
  rawName: unknown,
  rawArgs: unknown,
): AssistantToolResult {
  const parsedName = AssistantToolNameSchema.safeParse(rawName),
    parsedArgs = AssistantToolArgumentsSchema.safeParse(rawArgs);
  if (!parsedName.success || !parsedArgs.success)
    return deny("INVALID_INPUT", 400);
  const name = parsedName.data,
    args = parsedArgs.data,
    { graph, focusedRegistry, payload } = prepared,
    c = payload.context;
  if (!ROLE_TOOLS[c.role].includes(name)) return deny("FORBIDDEN", 403);
  only(args, TOOL_ARGUMENT_KEYS[name]);
  const result = (
    data: unknown,
    references: AssistantReference[] = [],
    navigation: AssistantNavigation | null = null,
    proposal: AssistantProposal | null = null,
  ): AssistantToolResult => ({ data, references, navigation, proposal });
  const describe = (id: string) => {
    const p = graph.products.find((p) => p.id === id);
    if (!p) return deny("STALE", 409);
    return {
      id: p.id,
      title: p.title,
      category: p.category,
      archived: p.archived,
      sizing: p.sizingSystemId,
      attributes: p.attributes.map((a) => ({
        name: a.name,
        value: a.review === "confirmed" ? a.value : null,
        review: a.review,
        provenance: a.provenance,
      })),
      photosAvailable: p.imageIds.every((id) =>
        c.availablePhotoIds.includes(id),
      ),
      variants: p.variants.slice(0, 24).map((v) => ({
        id: v.id,
        size: v.size,
        colour: v.colour,
        sku: v.sku,
        archived: v.archived,
        availableUnits: stockOf(graph, v.id),
        displayedPriceMinor: displayMinor(v.price, c.currency),
        currency: c.currency.currency,
        ...(c.role === "owner" ? { demoUnitCostUsdCents: v.unitCost } : {}),
      })),
    };
  };
  switch (name) {
    case "getDesignPresets":
      return result({
        templates: TemplateSchema.options,
        themes: ThemeSchema.options,
        themeLabels: THEME_LABELS,
        defaultTheme: DEFAULT_THEME,
        themeDirections: Object.fromEntries(
          ThemeSchema.options.map((theme) => [
            theme,
            BRAND_PALETTE[theme].character,
          ]),
        ),
        typography: TypographySchema.options,
        pages: StorePageSchema.options,
        currentPageTemplates: resolvedTemplates(c.design),
        policy:
          "One template applies to all pages by default. Optional pageTemplates assigns each page independently. Keep shared colour/type and use accepted presets only. Suggestions do not guarantee sales; application preview/acceptance owns changes.",
      });
    case "getProductFacts":
      if (!args.productId) return deny("INVALID_INPUT", 400);
      return result(describe(args.productId), [
        { kind: "product", productId: args.productId },
      ]);
    case "getCurrencyQuote":
      return result({
        scope: c.currency,
        policy:
          "This is the actual current display scope; no guessed or automatic substitute rate.",
      });
    case "getStorePolicies":
      return result({
        payment: "Simulated orders; no real payment.",
        delivery: "Sample delivery fee only; no real shipment.",
        sizing: "Named demo options; no personal fit guarantee.",
        material:
          "Unconfirmed/unknown attributes cannot establish a material exclusion.",
      });
    case "searchCatalogue":
    case "applyCatalogueFilter": {
      if (
        args.minimum !== null &&
        args.maximum !== null &&
        args.minimum > args.maximum
      )
        return deny("INVALID_INPUT", 400);
      const query = (args.query ?? "").toLowerCase();
      const matches = graph.products.filter(
        (p) =>
          !p.archived &&
          (!args.category || p.category === args.category) &&
          `${p.title} ${p.category}`.toLowerCase().includes(query) &&
          p.imageIds.every((id) => c.availablePhotoIds.includes(id)) &&
          p.variants.some(
            (v) =>
              !v.archived &&
              stockOf(graph, v.id) > 0 &&
              (args.minimum === null ||
                displayMinor(v.price, c.currency) >= args.minimum) &&
              (args.maximum === null ||
                displayMinor(v.price, c.currency) <= args.maximum),
          ),
      );
      return result(
        {
          matched: matches.length,
          products: matches
            .slice(0, 6)
            .map((p) =>
              name === "applyCatalogueFilter"
                ? { id: p.id, title: p.title, category: p.category }
                : describe(p.id),
            ),
          note: "Price bounds use exact rounded displayed unit prices, before sample delivery. Unknown attributes do not prove a material exclusion.",
        },
        matches.slice(0, 6).map((p) => ({ kind: "product", productId: p.id })),
        name === "applyCatalogueFilter"
          ? {
              kind: "filter",
              query: args.query ?? "",
              category: args.category,
              minimum: args.minimum,
              maximum: args.maximum,
            }
          : null,
      );
    }
    case "getMetricFacts": {
      if (!args.factIds?.length) return deny("INVALID_INPUT", 400);
      const selected = focusedRegistry.filter((f) =>
        args.factIds!.includes(f.factId),
      );
      return result(
        {
          scope: prepared.focusScope,
          facts: selected.map((f) => ({
            factId: f.factId,
            value: f.value,
            unit: f.unit,
            numerator: f.numerator,
            denominator: f.denominator,
            availability: f.availability,
            reason: f.reason,
            formula: f.formula,
            dateBasis: f.dateBasis,
            contributors: f.contributors.slice(0, 2),
            contributorCount: f.contributors.length,
            excludedCount: f.excluded.length,
          })),
        },
        selected.map((f) => ({
          kind: "fact",
          factId: f.factId,
          day: c.selectedDay,
          productId: null,
        })),
      );
    }
    case "openRegisteredView":
      if (!args.view) return deny("INVALID_INPUT", 400);
      return result({ view: args.view }, [], {
        kind: "owner-view",
        view: args.view,
      });
    case "startRegisteredTour":
      return result(
        {
          role: c.role,
          policy:
            "Authored mounted targets only; tours never execute commerce changes.",
        },
        [],
        { kind: "tour", role: c.role },
      );
    case "previewStoreDesign":
      if (
        !args.template &&
        !args.pageTemplates &&
        !args.theme &&
        !args.typography
      )
        return deny("INVALID_INPUT", 400);
      return result(
        {
          policy:
            "Preview only; accepted appearance requires the authored confirmation.",
        },
        [],
        null,
        {
          kind: "design",
          template: args.template,
          pageTemplates: args.pageTemplates,
          theme: args.theme,
          typography: args.typography,
        },
      );
    case "prepareLogoGeneration":
      return result(
        {
          eligible: c.designConfirmed,
          policy:
            "Offer a separate optional admitted image batch only after colour/type confirmation; this tool spends nothing.",
        },
        [],
        null,
        c.designConfirmed ? { kind: "logo-offer" } : null,
      );
    case "prepareBagChange": {
      if (!args.variantId || !args.quantity) return deny("INVALID_INPUT", 400);
      const p = graph.products.find((p) =>
          p.variants.some((v) => v.id === args.variantId),
        ),
        v = p?.variants.find((v) => v.id === args.variantId);
      if (
        !p ||
        !v ||
        p.archived ||
        v.archived ||
        !p.imageIds.every((id) => c.availablePhotoIds.includes(id)) ||
        stockOf(graph, v.id) < args.quantity
      )
        return deny("STALE", 409);
      return result(
        {
          policy:
            "Review current price, quantity, stock and bag effect before adding; no mutation was applied.",
        },
        [{ kind: "variant", variantId: v.id }],
        null,
        { kind: "bag", variantId: v.id, quantity: args.quantity },
      );
    }
    case "inspectRecords": {
      if (!args.recordKind || !args.recordId) return deny("INVALID_INPUT", 400);
      const record = assistantRecord(prepared, args.recordKind, args.recordId);
      if (!record) return deny("STALE", 409);
      return result(record, [
        {
          kind: "record",
          recordKind: args.recordKind,
          recordId: args.recordId,
        },
      ]);
    }
    case "prepareOperation": {
      if (!args.operation) return deny("INVALID_INPUT", 400);
      if (!args.recordId && !operationEligible(graph, args.operation, null)) {
        const matches = operationTargets(
          graph,
          args.operation,
          args.query ?? "",
        );
        return result(
          {
            matches: matches.length,
            choices: matches.slice(0, 6),
            policy:
              "Choose an exact target locally; never select the first match automatically. Refine the query if more choices exist.",
          },
          [],
          null,
          {
            kind: "operation-choices",
            operation: args.operation,
            targetIds: matches.slice(0, 6).map((r) => r.id),
            moreMatches: matches.length > 6,
            prefill: args.prefill ?? {
              title: null,
              category: null,
              note: null,
            },
          },
        );
      }
      if (!operationEligible(graph, args.operation, args.recordId))
        return deny("STALE", 409);
      return result(
        {
          policy:
            "An inert editable form intent only. Actual photo, values and effects must be reviewed and confirmed locally.",
        },
        [],
        null,
        {
          kind: "operation",
          operation: args.operation,
          targetId: args.recordId,
          prefill: args.prefill ?? { title: null, category: null, note: null },
        },
      );
    }
    case "prepareScenarioSwitch": {
      if (!args.scenario) return deny("INVALID_INPUT", 400);
      return result(
        {
          policy:
            "Prepare a reviewed activity/stock replacement; no records have changed.",
        },
        [],
        null,
        { kind: "scenario", preset: args.scenario },
      );
    }
  }
}
export function assistantRecord(
  prepared: PreparedAssistantContext,
  kind: string,
  id: string,
): unknown {
  const g = prepared.graph;
  switch (kind) {
    case "order":
      return g.orders.find((r) => r.id === id);
    case "line":
      return g.orders.flatMap((o) => o.lines).find((r) => r.id === id);
    case "product":
      return g.products.find((r) => r.id === id);
    case "variant":
      return g.products.flatMap((p) => p.variants).find((r) => r.id === id);
    case "refund":
      return g.refunds.find((r) => r.id === id);
    case "return":
      return g.returns.find((r) => r.id === id);
    case "expense":
      return g.expenses.find((r) => r.id === id);
    case "movement":
      return g.movements.find((r) => r.id === id);
    case "writeoff":
      return g.writeoffs.find((r) => r.id === id);
    case "cancellation":
      return g.cancellations.find((r) => r.id === id);
    case "traffic":
      return g.traffic.find((r) => r.id === id);
    case "buyer":
      return g.buyers.find((r) => r.id === id);
    case "feedback":
      return g.feedback.find((r) => r.id === id);
    default:
      return undefined;
  }
}
