import type { AssistantProvider } from "./provider.js";
import type {
  AssistantNavigation,
  AssistantProposal,
  AssistantReference,
} from "@retailor/contracts/assistant";
import { CategorySchema } from "@retailor/contracts/product";
import { executeAssistantTool } from "./tools.js";
import { AssistantToolArgumentsSchema } from "@retailor/contracts/assistant";
/** Development examples are a finite grammar over current evidence, never a live failure fallback. */
export function fixtureAssistant(): AssistantProvider {
  return {
    begin(prepared) {
      return {
        async next(_outputs, _finalOnly, signal) {
          signal.throwIfAborted();
          const c = prepared.payload.context,
            prompt = prepared.payload.prompt.toLowerCase();
          let text =
            "Development example: try the contextual shortcuts, a tour, a catalogue category or a business summary. This simulation supports those examples only.";
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
          if (/tour|show me around/.test(prompt)) {
            text =
              "Development example: let us walk through the controls on this page.";
            navigation = { kind: "tour", role: c.role };
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
          } else if (
            c.role === "owner" &&
            /create|new|add/.test(prompt) &&
            /product|jeans|hoodie|shirt/.test(prompt)
          ) {
            text =
              "Development example: open an editable product draft. A validated available photo and reviewed options are required before creation.";
            proposal = {
              kind: "operation",
              operation: "createProduct",
              targetId: null,
              prefill: { title: null, category: null, note: null },
            };
          } else if (c.role === "creator") {
            text =
              "Development example: each template pairs its home, collection and product pages. Try the visual choices here, then choose a palette and typography. Logo generation is optional after those choices.";
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
