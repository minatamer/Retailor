import type { AssistantRole } from "@retailor/contracts/assistant";
import { TourTargetSchema } from "@retailor/contracts/assistant";
export type TourTarget = typeof TourTargetSchema._output;
export const TOUR_STEPS: Record<
  AssistantRole,
  readonly { target: TourTarget; title: string; text: string }[]
> = {
  creator: [
    {
      target: "store-home",
      title: "Your clothes, in their new home",
      text: "Preview your actual catalogue while you personalize page layouts, colours, type and branding.",
    },
    {
      target: "store-collection",
      title: "A collection that belongs together",
      text: "The template gives your catalogue its own clear rhythm and navigation.",
    },
    {
      target: "store-product",
      title: "Details that matter",
      text: "Your photos, reviewed attributes and named demo options stay attached to this product.",
    },
    {
      target: "tailor-choices",
      title: "Personalize your store",
      text: "Choose layouts, colours and type here. Preview each change, then confirm the look you want to keep.",
    },
  ],
  shopper: [
    {
      target: "store-home",
      title: "Welcome to your collection",
      text: "Explore the home, then choose a category or browse every garment.",
    },
    {
      target: "store-collection",
      title: "Find your kind of clothing",
      text: "Search, filter and inspect actual items. A price budget uses the storefront’s selected currency.",
    },
    {
      target: "store-product",
      title: "Meet the exact garment",
      text: "Check its photo, reviewed details, colour and size. Unconfirmed material and personal fit remain unknown.",
    },
    {
      target: "store-bag",
      title: "A reviewable demo bag",
      text: "Your bag shows quantities and exact prices. Orders are simulated; there is no real payment or shipment.",
    },
  ],
  owner: [
    {
      target: "owner-scope",
      title: "Choose the story’s time window",
      text: "Each chart and headline follows this selected period. Demo scenarios use the actual catalogue.",
    },
    {
      target: "owner-kpis",
      title: "Exact numbers with their working",
      text: "Open a headline for its formula, included records and exclusions. Operating result includes costs, expenses and losses.",
    },
    {
      target: "owner-trend",
      title: "Explore a day, then its evidence",
      text: "Hover or focus a day, pin it, and inspect its actual records. Tailor can summarize that selected day.",
    },
    {
      target: "owner-records",
      title: "Keep products and activity connected",
      text: "These registers own editable products, orders, returns, inventory and expenses. Changes need a review before confirmation.",
    },
  ],
};
/** Only registered, mounted, visible authored targets; provider strings never become selectors. */
export function mountedTourTargets(root: Document) {
  const targets = new Map<TourTarget, HTMLElement>();
  for (const node of root.querySelectorAll<HTMLElement>(
    "[data-tailor-target]",
  )) {
    const parsed = TourTargetSchema.safeParse(node.dataset.tailorTarget),
      rect = node.getBoundingClientRect();
    if (
      parsed.success &&
      rect.width > 0 &&
      rect.height > 0 &&
      !node.closest("[hidden],dialog:not([open])")
    )
      targets.set(parsed.data, node);
  }
  return targets;
}
