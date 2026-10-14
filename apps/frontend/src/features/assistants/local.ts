import type {
  AssistantContext,
  ModelAssistantReply,
} from "@retailor/contracts/assistant";
export type LocalShortcut = "summary" | "tour" | "help" | "sources";
export function localReply(
  context: AssistantContext,
  shortcut: LocalShortcut,
): ModelAssistantReply {
  const role = context.role;
  if (shortcut === "tour")
    return {
      text: "Let’s walk through the controls on this page. You can go back or finish whenever you like.",
      references: [],
      claims: [],
      navigation: { kind: "tour", role },
      proposal: null,
    };
  if (role === "owner" && (shortcut === "summary" || shortcut === "sources"))
    return {
      text: "Here is the current business picture for your selected period and chart day. Open a fact to inspect its exact formula, records and exclusions. Demo traffic and buyers are synthetic; your products and operations stay connected.",
      references: [
        "net_sales",
        "included_orders",
        "aov",
        "operating_result",
      ].map((factId) => ({
        kind: "fact" as const,
        factId: factId as
          "net_sales" | "included_orders" | "aov" | "operating_result",
        day: context.selectedDay,
        productId: null,
      })),
      claims: [],
      navigation: null,
      proposal: null,
    };
  if (role === "shopper" && (shortcut === "summary" || shortcut === "sources"))
    return {
      text: "Browse these actual clothes and named demo size options. Reviewed details live on each product page; unknown material stays unknown. Your bag keeps quantities, prices and simulated orders visible before confirmation.",
      references: context.graph.products
        .filter((p) => !p.archived)
        .slice(0, 4)
        .map((p) => ({ kind: "product" as const, productId: p.id })),
      claims: [],
      navigation: null,
      proposal: null,
    };
  if (role === "creator")
    return {
      text: "Choose one look for the whole store, or mix layouts by page using the optional visual controls. Colours, type and clothes stay shared. Preview your choices, then confirm your look. A logo batch is optional.",
      references: [],
      claims: [],
      navigation: null,
      proposal: null,
    };
  return {
    text:
      role === "owner"
        ? "Ask for a business summary, inspect chart evidence or open an editable product draft. Every consequential change still needs its native review. Manual registers keep working when AI is unavailable."
        : "Try a category and a displayed-price budget, or inspect a product’s reviewed details. Choose EUR first for euro budgets. Browsing is immediate and reversible; bag changes stay reviewable.",
    references: [],
    claims: [],
    navigation: null,
    proposal: null,
  };
}
