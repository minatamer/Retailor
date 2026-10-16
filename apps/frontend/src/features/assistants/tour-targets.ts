import type { AssistantRole } from "@retailor/contracts/assistant";
import type { StorePage } from "@retailor/contracts/design";
import { TourTargetSchema } from "@retailor/contracts/assistant";
export type TourTarget = typeof TourTargetSchema._output;
export const TOUR_STEPS: Record<
  AssistantRole,
  readonly {
    target: TourTarget;
    title: string;
    text: string;
    page?: StorePage;
  }[]
> = {
  creator: [
    {
      target: "store-pages",
      title: "One store. Three pages.",
      text: "Your processed clothes now have a real preview. Home introduces your brand, Collection lets people browse, and Product shows one garment in detail. Let’s visit each, then find personalization and your dashboard.",
      page: "home",
    },
    {
      target: "store-home",
      title: "Your clothes, in their new home",
      text: "Home is your shop window: a headline, hero photos and a way into the collection. These are your clothes. Later, Brand in Tailor lets you choose each hero photo to match your chosen layout.",
      page: "home",
    },
    {
      target: "store-collection",
      title: "A collection that belongs together",
      text: "Collection brings every garment together. Shoppers can search by name, filter by category, size or price, and sort the results. Opening a garment takes them to its Product page.",
      page: "collection",
    },
    {
      target: "store-product",
      title: "Details that matter",
      text: "Product keeps the garment’s photos, description, colours, sizes and reviews together. Shoppers choose a colour and size before adding to their bag once you enter the store. Your reviewed options stay attached to this garment.",
      page: "product",
    },
    {
      target: "tailor-panel",
      title: "Personalize your store",
      text: "Open Tailor here to choose a layout for each page, colours and type. Brand controls your store name, headline and hero photos; Wordmark controls your logo. Each choice updates this preview before you keep it.",
      page: "home",
    },
    {
      target: "store-owner",
      title: "The dashboard comes next",
      text: "This is still your setup preview, so this link returns to garment review. After you finish Tailor and choose Enter my store, it becomes Owner workspace. That is how you reach products, orders, returns, inventory, expenses and feedback. We’ll point it out when your store opens.",
    },
    {
      target: "demo-reset",
      title: "Start fresh whenever you need",
      text: "Reset demo opens a confirmation before clearing this temporary collection, its look and demo activity. Cancel keeps your work. In the finished store and dashboard, Reset demo lives in the footer.",
    },
    {
      target: "tailor-panel",
      title: "Ready to make it yours?",
      text: "Choose Done to reopen Tailor. Work through the choices, or keep the preview’s look, then keep your wordmark or choose a logo and Enter my store. You can revisit Personalize later. To replay this guide, open Tailor and choose Take a tour.",
    },
  ],
  shopper: [
    {
      target: "store-pages",
      title: "Your three store pages",
      text: "Home, Collection and Product share the same clothes, branding and bag. Use these links to switch pages. This guide visits each one, then shows the owner controls in the footer.",
      page: "home",
    },
    {
      target: "store-home",
      title: "Welcome to your collection",
      text: "Home introduces your brand with your headline and chosen hero photos. Shop the collection opens all your clothes; a featured garment opens its Product page.",
      page: "home",
    },
    {
      target: "store-collection",
      title: "Find your kind of clothing",
      text: "Search, filter and inspect actual items. A price budget uses the storefront’s selected currency.",
      page: "collection",
    },
    {
      target: "store-product",
      title: "Meet the exact garment",
      text: "Check the photos and description, then select a colour and available size before adding to your bag. Product reviews connect to Feedback in the dashboard. Photographs do not confirm fabric or personal fit.",
      page: "product",
    },
    {
      target: "store-bag",
      title: "A reviewable demo bag",
      text: "Your bag keeps selected sizes, colours, quantities and exact totals. You can try the promo code and the available demo checkout. Sandbox payments use test details; this demo makes no real charge or shipment.",
    },
    {
      target: "store-owner",
      title: "Your dashboard is right here",
      text: "Owner workspace opens the dashboard for this same collection: garments, orders, returns, inventory and costs, expenses and feedback. The dashboard’s View storefront link brings you back. No separate login or second collection is needed in this demo.",
    },
    {
      target: "demo-personalize",
      title: "Keep shaping your store",
      text: "Personalize reopens Tailor for layouts, colours, type, store name, hero photos and logo. You can also use Personalize in the dashboard, where Store currency controls USD or EUR. Preview and confirm your changes before keeping them.",
    },
    {
      target: "demo-reset",
      title: "A fresh demo, with confirmation",
      text: "Reset demo clears the collection, look and activity only after you confirm. It is also in the dashboard footer. Choose Done to explore; open Tailor and Take a tour whenever you want this guide again.",
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
      text: "Open a headline for its formula, included records and exclusions. Operating profit includes costs, expenses and losses.",
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
      root.defaultView?.getComputedStyle(node).visibility !== "hidden" &&
      !node.closest("[hidden],dialog:not([open])")
    )
      targets.set(parsed.data, node);
  }
  return targets;
}
