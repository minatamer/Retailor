# RTL-007 — Deliver three complete clothing-store template families

Status: **Locally complete — final matrix, physical/zoom and owner visual acceptance pending**\
Planning date: **11 October 2026**\
Milestone: **Storefront showcase**\
Depends on: [RTL-002](RTL-002-prove-brand-design-system-and-storefront-direction.md), [RTL-003](RTL-003-prepare-fifteen-clothing-photos-and-upload-pipeline.md), [RTL-005](RTL-005-build-one-page-workspace-review-and-recovery.md)\
Blocks directly: [RTL-008](RTL-008-deliver-tailor-chat-led-styling-and-owner-overrides.md), [RTL-009](RTL-009-deliver-automatic-usd-eur-storefront-pricing.md), [RTL-010](RTL-010-connect-shopping-bag-and-simulated-orders.md), [RTL-017](RTL-017-build-vibrant-storefront-runway-landing.md)\
Suggested commit: `RTL-007: deliver three complete clothing-store template families`\
Parent authority: [Retailor blueprint](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md)\
Queue and execution rules: [Ticket index](README.md)

## Outcome and standalone context

Deliver Studio, Pulse and Gallery as three genuinely distinct complete clothing-store families. Each owns a home/landing, collection/listing and product detail layout; the creator cannot mix page families independently. The same photo-backed catalogue, variant availability, prices and selected brand flow through every renderer. This is the central product promise, not late polish after a generic shop.

Studio balances editorial copy and photos; Pulse uses a bold campaign composition and denser scanning; Gallery gives imagery generous space and restrained detail. Shared shopping capability must remain equally strong. The library has four semantic colour themes and three type presets, producing 36 looks and 108 page compositions per viewport. All choices must be excellent; exposing an inferior option to pad the count is unacceptable.

## Dependency evidence and entry conditions

RTL-002 supplies real visual tokens/font specimens, RTL-003 accepted raster photos and RTL-005 published-catalogue/session interfaces. Use the current graph and shared availability selectors from RTL-004. A verified local draft supports renderer work before actual live evaluation; do not create a parallel fixture-only storefront. Read the complete home/collection/detail contract and 2026 research interpretation.

Dependency completion means required local behavior, owning contracts and checks actually exist. A planned checkbox or ticket-named commit alone is insufficient. Verified local dependencies may support local follow-on work while separately recorded live, owner-visual or hosted evidence remains pending. Never turn a fake pass into live acceptance.

## Files and responsibility boundaries

| Area                                      | Responsibility owned here                                                  |
| ----------------------------------------- | -------------------------------------------------------------------------- |
| `apps/frontend/src/features/storefront`   | Three family renderers, shared shopping surfaces and product selectors     |
| `apps/frontend/src/features/store-design` | Finite bundle/theme/type mapping                                           |
| `apps/frontend/src/components/ui`         | Stable gallery, option, card and empty-state primitives where truly shared |
| `docs/design/STOREFRONT-LIBRARY.md`       | Family rationale, capability matrix and actual visual evidence             |

Paths describe future ownership. Create modules/directories only with real behavior; reuse contracts, commands, assets and session state rather than a parallel authority.

## Implementation plan

1. **Define renderer input once.** Render catalogue, accepted/preview design, brand, current availability and selected product from one typed interface. Do not keep template-local inventory or prices. A layout change does not replace product IDs, reseed history or reset bag.

2. **Complete Studio.** Build editorial split home, balanced responsive collection and image/purchase detail. Product imagery leads, text hierarchy stays clear, available sizes are exposed and galleries include only actual supplied views. Verify store-name and product-title pressure.

3. **Complete Pulse.** Build a campaign-led home, tighter listing and compact/sticky purchase region. Bold scale cannot overwhelm controls or hide filters; sticky regions must respect Tailor/chat and phone keyboards. Use no copied Nike campaign assets or identity.

4. **Complete Gallery.** Build spacious photo-led home, airy listing and large-detail gallery with calm buying column. Whitespace should feel deliberate while price, options, stock and actions remain readily visible. Do not create a less useful purchasing experience for the premium mood.

5. **Share browsing semantics.** Implement search/category/colour/size/price filter projection, sorting, applied chips, real result counts and clear/reset. Only known supported attributes satisfy filters. Keep all finite categories clothing-only and preserve garment-specific sizing labels.

6. **Make cards and variants trustworthy.** Cards display current actual product photo/title/price/stock. Detail exposes size/colour selection and availability without invented fit/material facts. Exactly one photo is valid, not an implied second view. Archive/missing-photo states cannot appear purchasable.

7. **Build gallery and zoom access.** Reserve image geometry, use template-specific crops, provide actual alternate thumbnails and useful zoom. Keyboard/touch equivalents, focus return and no fabricated alternate are required. Product selection remains stable when moving preview page or changing theme.

8. **Apply full semantic presets.** Use four complete themes and three type pairs, including hover/focus/error/disabled state. All controls and EUR amounts use the preset hierarchy; a theme is not merely recolouring the CTA. Keep user-supplied branding bounded plain text.

9. **Handle empty and pressure states.** No products, no filter matches, archived item, missing image, long names and all variants sold out have polished useful paths. Owner create/repair actions remain reachable. Never substitute an unrelated sample item to avoid an empty page.

10. **Demonstrate the family matrix.** Inspect representative desktop/phone combinations now, including dark/light colourful garments. Record deficiencies and refine shared tokens before later customizations amplify them. RTL-019 performs final full 36 × 3-page visual acceptance, rather than declaring it passed on registry existence.

## Acceptance criteria — required local outcome

- [x] Three coherent families each implement home, collection and detail.
- [x] Actual current products/photos/variants drive every surface.
- [x] All families have equal search/filter/detail/bag integration capability.
- [x] Four themes and three actual type presets apply semantic states consistently.
- [x] Price/stock/size and unknown facts stay clear and truthful.
- [x] Galleries/zoom support keyboard/touch and never invent alternate photos.
- [x] Archive/missing-photo/empty/sold-out/no-match states have useful polished paths.
- [x] Changing look preserves product context, catalogue and commerce state.
- [x] Actual representative visual evidence is recorded and inferior combinations are corrected.

## Focused verification and evidence

| Case                          | Required observable evidence                                         |
| ----------------------------- | -------------------------------------------------------------------- |
| Same item across all families | Identical product ID, price, photo and availability                  |
| 36-look registry              | Finite IDs and actual presets render without arbitrary styles        |
| Image/option edge             | One photo, long label, sold-out size and missing bytes remain honest |
| Filter comparison             | Applied chips/counts match known current catalogue                   |
| Responsive detail             | Sticky purchase region and chat do not obscure each other            |
| Gallery/zoom                  | Keyboard/touch opening, navigation and focus restoration             |
| Empty store                   | Clear create/repair route instead of unrelated sample content        |

Run meaningful focused tests during iteration. At the settled implementation snapshot run the applicable root gates established by RTL-001: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm check:boundaries`, `pnpm test:unit` and `pnpm build`. Record actual commands/results and revision. UI acceptance needs real browser observations where available; DOM simulations or animation declarations alone do not prove appearance/movement. Do not add tests that merely mirror CSS or static labels.

## External evidence and scope limits

Actual browser/owner review is required to judge aesthetics. A registry snapshot is not evidence that all combinations are beautiful; the complete visual matrix remains RTL-019. No paid service is needed to switch a template or render a completed catalogue.

No independent page mixing, freeform builder, uploaded fonts, runtime CSS generation, copied brand assets or generated product photography. RTL-010 owns exact bag/order effects; RTL-009 supplies currency projection. Basic renderers should accept those interfaces without inventing them. Always-on motion and useful controls coexist.

## Precision references

- [3. Decisions and scope](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#3-decisions-and-scope)
- [8. Catalogue recognition and review](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#8-catalogue-recognition-and-review)
- [9. Storefront and product experience](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#9-storefront-and-product-experience)
- [10. Bag and simulated checkout](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#10-bag-and-simulated-checkout)
- [24. Visual system, motion and accessibility](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#24-visual-system-motion-and-accessibility)
- [25. Verification and evidence](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#25-verification-and-evidence)
- [29. Decisions to settle during implementation](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#29-decisions-to-settle-during-implementation)

## Completion handoff and commit boundary

Keep this outcome under `RTL-007:`; adjacent cohesive commits may be planned when useful. At execution write file allocations under `docs/commit-plans/RTL-007.md` and actual check/review evidence under `docs/validation/RTL-007.md`. These are future records, not fabricated by this planning pass.

Report files, delivered behavior, settled checks, browser/device observations, deviations and every deferred external check with its prerequisite. Update owning documentation and queue status together. All boxes are currently unchecked. Ticket creation does not implement the feature, authorize Git mutations, start services, call paid runtime providers or publish cloud resources. Follow the user’s actual execution authorization when work starts.

## Execution evidence — 11 October 2026

All required local criteria are implemented and read-only validation pass 2 reports no actionable findings. See [the library](../design/STOREFRONT-LIBRARY.md), [validation record](../validation/RTL-007.md) and [file allocation](../commit-plans/RTL-007.md). Actual browser evidence covers 63 view/width combinations, gallery focus/navigation, filtering/recovery and the corrected owner/deep-card paths. This is local development evidence with real image bytes; paid recognition, owner aesthetics, physical/zoom and full 36-look final acceptance remain explicitly pending with their owning tickets. Bag/currency callbacks are ready for RTL-010/009 and create no fake financial effects.
