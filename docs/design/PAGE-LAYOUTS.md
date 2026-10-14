# Page layout mixing

14 October2026 owner-authorized plan and execution under [RTL-049](../tickets/RTL-049-mix-storefront-page-layouts.md).

## Product choice

Use a hybrid: native deterministic controls for each finite page layout, with optional Tailor suggestions leading to a visible preview and existing acceptance. Manual layout selection dispatches no AI request. This fits the current chat-native setup rather than adding another editor/state owner.

Primary reference: [Shopify templates](https://shopify.dev/docs/storefronts/themes/architecture/templates) assigns templates by content/page type and supports multiple versions. [Sidekick review model](https://help.shopify.com/en/manual/ai-powered-tools/sidekick/set-up) presents changes for review/approval. These support separate page composition and human review; the particular Retailor controls/normalization below are our design judgment, not a claim to copy Shopify or a universal SOTA ranking.

## Experience and semantics

Main Studio/Pulse/Gallery cards remain the fast path: choose one complete look for Home, Collection and Product. Beneath them, an optional **Mix layouts by page** disclosure contains three rows. Each row shows its current family, three finite choices and Preview Home/Collection/Product. Changing one row updates that page's actual preview immediately; other page assignments stay intact. Name, colour, typography, photos, filters, cart and business data stay shared. A return-to-one-look action clears page overrides. If all three page choices become identical, normalize to that one family.

Tailor briefly mentions the option during layout selection. It can answer a supported fake request such as “Studio home, Pulse collection, Gallery product” or “Use Gallery for the product page.” Reply cards list proposed assignments and remain inert until Preview; final acceptance remains the current creator/owner action. Live tools carry the same strict mapping and current design context, without adding a request to the manual path. A family-only AI proposal applies everywhere; a colour/type-only proposal preserves page choices. Unsupported/ambiguous fake prompts explain the supported controls rather than pretending to understand an unrestricted model request.

## State and compatibility

Existing Design.template remains the base/default family; optional pageTemplates is a strict full Home/Collection/Product map. Missing mapping means all pages use the base. One shared resolver is used at renderer boundaries and by assignment summaries/fences. The existing controller owns preview and accepted designs; setup remembers the exact confirmed mapping. Page-only edits invalidate previous confirmation and stale assistant actions. Restore, owner Cancel/Apply, creator acceptance and reset retain their current contracts. Existing obsolete-ID recovery may repair only obsolete string template IDs; malformed/missing/unknown page keys remain rejected.

## Verification

Test all27 combinations, exact unchanged defaults, invalid maps, confirmation/owner lifecycle and restoration, page-only action fences, fake page grammar/whole-family reset/palette preservation, creator/owner permissions and shopper rejection. Simulate the actual local fake sample, controls and typed proposal Preview, three mixed accepted pages, responsive choices, refresh and cart/order retention. Run required settled gates and scoped read-only review. Do not infer paid/live/hosted or physical-device acceptance from local tests; preserve the existing strict Linux-source-proof mismatch.

Status: implemented and reviewed locally under the owner's direct execute request. Shared native controls are mounted below the main template cards in creator and owner design flows. Explicit Preview uncovers the real creator storefront; Product preview targets the current or first active garment. Expanded owner controls use normal flow so Apply/Cancel remain reachable. Exact mixed confirmation is restored by Cancel as well as refresh. [Actual tests, screenshots and limitations](../validation/RTL-049.md) cover the final source; live-provider quality and external/physical/owner visual acceptance remain pending.
