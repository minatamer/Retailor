import type { AssistantProvider } from "./provider.js";
import type {
  AssistantNavigation,
  AssistantProposal,
  AssistantReference,
} from "@retailor/contracts/assistant";
import { CategorySchema } from "@retailor/contracts/product";
import { executeAssistantTool } from "./tools.js";
import { AssistantToolArgumentsSchema } from "@retailor/contracts/assistant";
import { fixtureOperation, operationTargets } from "./operations.js";
import { resolvedTemplates } from "@retailor/contracts/design";
import type { Design, StorePage } from "@retailor/contracts/design";

/** Only explicit, unambiguous finite palette names; native preview still owns application. */
function fixtureTheme(prompt: string): Design["theme"] | null {
  if (
    /\b(?:not|never|avoid)\b|don't/u.test(prompt) ||
    !/\b(use|apply|try|switch|choose|theme|palette|colou?r)\b/u.test(prompt)
  )
    return null;
  const aliases: [Design["theme"], RegExp][] = [
    ["navy", /\b(navy|lime)\b/u],
    ["ink", /\b(ink|paper)\b/u],
    ["cobalt", /\b(cobalt|cloud)\b/u],
    ["oxblood", /\b(oxblood|blush)\b/u],
    ["pine", /\b(pine|sand)\b/u],
  ];
  const matches = aliases.filter(([, pattern]) => pattern.test(prompt));
  return matches.length === 1 ? matches[0]![0] : null;
}

/** Explicit finite examples; conflicting or negative requests never choose a layout. */
function fixtureLayout(prompt: string, design: Design) {
  if (/\b(?:not|never|avoid)\b|don't/u.test(prompt)) return null;
  const pages = resolvedTemplates(design),
    requested = new Map<StorePage, Design["template"]>();
  let conflicting = false;
  const assign = (page: StorePage, template: Design["template"]) => {
    if (requested.has(page) && requested.get(page) !== template)
      conflicting = true;
    requested.set(page, template);
  };
  for (const match of prompt.matchAll(
    /\b(?:(studio|pulse|gallery)\s+(?:for\s+)?(?:the\s+)?(home|collection|product)(?:\s+page)?|(home|collection|product)(?:\s+(?:page|layout))?\s*(?::|=|with|in|uses?|to)?\s*(studio|pulse|gallery))\b/gu,
  ))
    assign(
      (match[2] ?? match[3]) as StorePage,
      (match[1] ?? match[4]) as Design["template"],
    );
  if (conflicting) return null;
  if (
    requested.size &&
    [...prompt.matchAll(/\b(home|collection|product)\b/gu)].some(
      (match) => !requested.has(match[1] as StorePage),
    )
  )
    return null;
  if (requested.size)
    return {
      template: null,
      pageTemplates: { ...pages, ...Object.fromEntries(requested) },
    };
  const choices = [
    ...new Set(prompt.match(/\b(studio|pulse|gallery)\b/gu) ?? []),
  ];
  if (
    choices.length === 1 &&
    !/\b(home|collection|product)\b/u.test(prompt) &&
    /\b(use|apply|try|switch)\b/u.test(prompt)
  )
    return { template: choices[0] as Design["template"], pageTemplates: null };
  return null;
}
/** Development examples are a finite grammar over current evidence, never a live failure fallback. */
export function fixtureAssistant(): AssistantProvider {
  return {
    begin(prepared) {
      return {
        async next(_outputs, _finalOnly, signal) {
          signal.throwIfAborted();
          const c = prepared.payload.context,
            prompt = prepared.payload.prompt.toLowerCase();
          const layout =
            c.role !== "shopper" ? fixtureLayout(prompt, c.design) : null;
          const theme = c.role !== "shopper" ? fixtureTheme(prompt) : null;
          const help =
            c.role === "creator"
              ? "I can help personalize your store. Try ‘Use Pine / Sand’, ask about layouts, or ask for a tour. Suggestions stay previews until you choose them."
              : c.role === "owner"
                ? "I can show a business summary, explain the selected chart day, or help prepare an editable garment draft. Changes stay yours to review."
                : "I can help you explore this collection. Try ‘Show jeans’, ask about a garment’s reviewed details, or ask for a tour. You can include a budget in the store’s selected currency.";
          let text = `This demo simulates a few clothing and store requests. ${help}`;
          let references: AssistantReference[] = [],
            navigation: AssistantNavigation | null = null,
            proposal: AssistantProposal | null = null;
          const args = AssistantToolArgumentsSchema.parse(
            Object.fromEntries(
              Object.keys(AssistantToolArgumentsSchema.shape).map((key) => [
                key,
                null,
              ]),
            ),
          );
          if (
            /^(?:hi|hello|hey|good morning|good afternoon|good evening)[\s!.?]*$/u.test(
              prompt.trim(),
            )
          ) {
            text = `Hi, I’m Tailor. ${help}`;
          } else if (/tour|show me around/.test(prompt)) {
            text =
              "Development example: let us walk through the controls on this page.";
            navigation = { kind: "tour", role: c.role };
          } else if (
            c.role !== "shopper" &&
            (layout ||
              theme ||
              /\b(layout|template|mix|theme|palette|colou?r)\b/u.test(prompt))
          ) {
            if (layout || theme) {
              args.template = layout?.template ?? null;
              args.pageTemplates = layout?.pageTemplates ?? null;
              args.theme = theme;
              proposal = executeAssistantTool(
                prepared,
                "previewStoreDesign",
                args,
              ).proposal;
              text =
                "Here is a look to try. Preview it first, then keep it if it feels right. Your clothes and records stay connected.";
            } else {
              text =
                "Choose a palette or layout using the visual controls. Try ‘Use Oxblood / Blush’ or ‘Studio home, Pulse collection, Gallery product’. Every suggestion stays a preview until you choose it.";
            }
          } else if (c.role === "shopper") {
            const category = CategorySchema.options.find((cat) =>
              prompt.includes(cat.replaceAll("_", " ")),
            );
            if (/material|cotton|wool|silk|polyester|fit|size/.test(prompt)) {
              text =
                "Development example: unconfirmed material and personal fit are unknown. Choose an item to inspect its reviewed details and named demo sizing options.";
              references = prepared.graph.products
                .filter(
                  (p) => !p.archived && (!category || p.category === category),
                )
                .slice(0, 3)
                .map((p) => ({ kind: "product", productId: p.id }));
            } else if (category) {
              const budget = prompt.match(
                /(?:under|below|less than)\s*(?:[$€]|usd|eur)?\s*(\d{1,6})(?:[.,](\d{1,2}))?/u,
              );
              if (
                (prompt.includes("€") || /\beur\b/.test(prompt)) &&
                c.currency.currency !== "EUR"
              )
                text =
                  "Development example: choose EUR in the storefront before using that budget.";
              else {
                args.category = category;
                args.query = "";
                args.maximum = budget
                  ? Number(budget[1]) * 100 +
                    Number((budget[2] ?? "").padEnd(2, "0"))
                  : null;
                const found = executeAssistantTool(
                  prepared,
                  "applyCatalogueFilter",
                  args,
                );
                references = found.references;
                navigation = found.navigation;
                text = references.length
                  ? "Development example: here are current in-stock matches within your displayed-price budget. You can clear these filters anytime."
                  : "Development example: no available item matches this category and displayed-price budget. Clear the filters or widen your budget.";
              }
            } else if (/bag|add/.test(prompt) && c.selectedProductId) {
              const product = prepared.graph.products.find(
                (p) => p.id === c.selectedProductId,
              );
              const variants =
                product?.variants.filter((v) => !v.archived) ?? [];
              text =
                "Development example: choose the exact colour and size on the product page, then review its quantity and current price in your bag.";
              references = variants
                .slice(0, 6)
                .map((v) => ({ kind: "variant", variantId: v.id }));
            }
          } else if (c.role === "owner" && fixtureOperation(prompt)) {
            const intent = fixtureOperation(prompt)!;
            args.operation = intent.operation;
            args.query = intent.query;
            args.prefill = intent.prefill;
            const tokens = new Set(
              (prompt.match(/[a-z0-9_-]+/g) ?? []).filter(
                (token) => /[_-]/.test(token) && /\d/.test(token),
              ),
            );
            for (const match of prompt.matchAll(
              /\b(?:reference|ref|id)\s*[:=]?\s*([a-z0-9_-]+)/g,
            ))
              tokens.add(match[1]!);
            const named = operationTargets(
              prepared.graph,
              intent.operation,
              "",
            ).filter((row) => tokens.has(row.id.toLowerCase()));
            if (named.length === 1) args.recordId = named[0]!.id;
            const preparedOperation = executeAssistantTool(
              prepared,
              "prepareOperation",
              args,
            );
            proposal = preparedOperation.proposal;
            text =
              proposal?.kind === "operation-choices"
                ? "Development example: choose the exact current record below. If it is missing, refine your request or open its owner register. Nothing has changed."
                : "Development example: let us prepare an editable draft together. Review the required photo, current values and exact effects before confirming.";
          } else if (
            c.role === "owner" &&
            /summary|profit|loss|negative|result|sales|explain|dashboard/.test(
              prompt,
            )
          ) {
            text =
              "Development example: these exact facts reflect the selected period and chart day. Open their sources to inspect included records and exclusions; timing alone does not establish a sales cause.";
            references = prepared.focusedRegistry
              .filter((f) =>
                [
                  "net_sales",
                  "included_orders",
                  "aov",
                  "operating_result",
                ].includes(f.factId),
              )
              .map((f) => ({
                kind: "fact",
                factId: f.factId,
                day: c.selectedDay,
                productId: null,
              }));
          } else if (c.role === "creator") {
            text =
              "Choose one look for your whole store. Mixing layouts by page is optional, and the visual controls give you a real preview. Then choose your colours and type. Logo generation is optional.";
            if (/logo/.test(prompt) && c.designConfirmed)
              proposal = { kind: "logo-offer" };
          }
          return {
            kind: "reply",
            reply: { text, references, claims: [], navigation, proposal },
          };
        },
      };
    },
  };
}
