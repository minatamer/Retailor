# RTL-019 — Verify polish, responsiveness, motion and the design matrix

Status: **Planned — not started**\
Planning date: **11 October 2026**\
Milestone: **Whole product quality**\
Depends on: [RTL-012](RTL-012-build-animated-dashboard-and-record-drilldown.md), [RTL-014](RTL-014-deliver-tailor-inline-photo-crud-and-confirmation.md), [RTL-015](RTL-015-deliver-optional-three-logo-generation.md), [RTL-016](RTL-016-complete-export-reset-expiry-and-session-lifecycle.md), [RTL-017](RTL-017-build-vibrant-storefront-runway-landing.md), [RTL-018](RTL-018-harden-privacy-abuse-spend-and-runtime-boundaries.md)\
Blocks directly: [RTL-020](RTL-020-evaluate-live-ai-and-audit-release-acceptance.md), [RTL-021](RTL-021-package-linux-services-and-manual-release-runbook.md)\
Suggested commit: `RTL-019: verify polish, responsiveness, motion and the design matrix`\
Parent authority: [Retailor blueprint](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md)\
Queue and execution rules: [Ticket index](README.md)

## Outcome and standalone context

Deliver the polished, visibly animated product that the owner can judge as one coherent experience. Retailor promises an exceptionally smooth clothing storefront built from the visitor's photos. That promise applies to Studio, Pulse and Gallery across their storefront landing, product listing and product detail page, with all four approved colour themes and all three typography presets. There are 36 complete looks and 108 page compositions per viewport, not a single attractive default with unfinished alternatives.

Earlier packets own the actual components, commerce commands, Tailor interactions and lifecycle. This packet verifies and fixes their combined visual behavior: the public runway, one-page upload/review journey, chat-led styling, optional logos, shopping, owner operations, scenario charts and recovery. It owns polish and integration defects rather than a replacement design system or duplicate domain state. The owner explicitly wants motion preserved and has rejected animation-off settings. Accessibility here means usable keyboard/touch interactions, readable content, stable focus and clear information while the designed motion remains visible. Record the limits of actual observations; a DOM test or stylesheet declaration cannot prove that the experience looks good or moves smoothly.

## Dependency evidence and entry conditions

Required dependencies must expose the complete connected workflow, validated image assets, chat forms and all three scenarios. Use the actual approved clothing photos from RTL-003 and the real template/theme/type registry, including logo and EUR states. If an external provider acceptance is pending, execute an explicitly labeled local fixture path to inspect UI; keep public live capability unavailable. Have a runnable local environment and an inventory of available browser/device surfaces before claiming visual coverage.

Dependency completion means required local behavior, owning contracts and checks actually exist. A planned checkbox or ticket-named commit alone is insufficient. Verified local dependencies may support local follow-on work while separately recorded live, owner-visual or hosted evidence remains pending. Never turn a fake pass into live acceptance.

## Files and responsibility boundaries

| Area | Responsibility owned here |
| --- | --- |
| `apps/frontend/src/components/` | Shared motion, focus, overlay, responsive and feedback fixes. |
| `apps/frontend/src/features/{landing,workspace,storefront,tailor,dashboard}/` | Polish within each owning feature; no alternate commerce authority. |
| `apps/frontend/src/styles/` | Approved visual tokens, typography loading and responsive adjustments. |
| `apps/frontend/tests/` | Meaningful interaction and regression coverage where a real defect warrants it. |
| `docs/validation/RTL-019.md` | Observed design matrix, actual viewport evidence and remaining limits. |

Paths describe future ownership. Create modules/directories only with real behavior; reuse contracts, commands, assets and session state rather than a parallel authority.

## Implementation plan

1. **Build a finite observation matrix.** Inventory every template/theme/type combination for all three page types, plus public landing, draft review, Tailor styling, shopper tools, owner forms and dashboard. Distinguish the 36-look composition matrix from interaction cases so counts cannot hide untested controls. Record routes, state, revision and asset set for reproducible observations.

2. **Check widths and heights.** Inspect representative 320, 390, 768, 1280, 1440, 1920 and 2560 CSS-pixel widths, intermediate resizing and a short-height viewport. Exercise 200% zoom and long English names. Observe all looks at representative compact and wide viewports and sample intermediate layouts for each family; explicitly record any matrix cells not observed instead of claiming exhaustive coverage.

3. **Verify the real design promise.** Judge actual clothing imagery, crops, gallery behavior, price legibility, stock states, filter controls, navigation and purchase actions. Check every palette against every type family. Resolve washed-out borders, illegible accents, inconsistent spacing, accidental mixed template layouts and mobile hierarchy problems within approved tokens. Share concrete visual evidence for decisions that materially change the chosen direction.

4. **Inspect motion in use.** Observe entry, upload progress, transitions, chat cards, styling previews, charts and runway scenes in a real browser. Keep motion intentional and present under ordinary and OS reduced-motion preferences; do not introduce a product animation switch or a suppression branch. Prevent flashing, clipped animated text, trapped focus and a permanently blocking intro. Check repeated navigation for duplicate animation loops and stale overlays.

5. **Complete keyboard and touch paths.** Navigate setup, inline uploads, choice cards, product gallery, bag, owner forms and chart drilldowns without a mouse. Check visible focus, coherent tab order, dialog focus restoration, Escape behavior and native upload activation. Pair hover interactions with focus/tap and provide exact dashboard tables. Ensure chat scroll and visual previews do not steal focus on each new message.

6. **Exercise uncomfortable real states.** Inspect long titles, absent optional metadata, one and twenty active products, sold-out variants, broken image bytes, rejected replacement photos, empty filters and a deleted/archived item. Exercise pending/error/cancel states for catalogue, text, FX and logo operations, including a late result during navigation. No error may silently swap the visitor into an authored public catalogue.

7. **Polish the dashboard honestly.** Observe all three scenarios with negative and positive operating results, zero denominators, sparse periods and more records than fit in a panel. Verify contributing-record drawers match the displayed metric and selected period. Keep donut slices non-negative; show losses in appropriate signed comparisons. Hover, focus and tap must reveal the same underlying numbers as accessible tables.

8. **Measure the main bottlenecks.** Check image decode and responsive loading, reserved image dimensions, font fallback shifts, chat growth and animation frame behavior on available hardware. Record actual observations and measurement environment. Fix avoidable work and memory churn with the current libraries; do not add a large animation or rendering dependency to mask a simple layout issue.

9. **Verify integrated recovery.** Exercise resume, reset, expiry and scenario switching while a form or preview is active. Check that expired or stale actions cannot reappear as successful updates, owned URLs are cleaned up and useful errors remain visible. Confirm design and manually edited product facts survive the scenario reset rules. Repeat only affected matrix cells when fixes change shared tokens or layout.

10. **Record a reviewable quality verdict.** Produce a matrix with observed/pass/fix/pending outcomes and links to useful local evidence. State actual device/browser coverage and unresolved owner visual feedback. Run the settled root gates after fixes. Escalate a concrete blocking design defect with a candidate correction; do not mark all choices beautiful based solely on token names or research links.

## Acceptance criteria — required local outcome

- [ ] All 36 approved complete looks resolve consistently to all three storefront page compositions; no mixed-template or unstyled option remains.
- [ ] Actual compact and wide observations exist for the design matrix, with additional widths, short height and zoom evidence recorded honestly.
- [ ] The main setup remains one progressive page with usable chat CTAs, readable previews and no mandatory typing for styling.
- [ ] Visible motion remains part of the experience; no animation-off control or OS suppression branch has been introduced.
- [ ] Keyboard/touch users can upload photos, choose styles, shop, operate owner forms and inspect chart facts with stable focus.
- [ ] The actual approved photo/font assets, optional logos and USD/EUR price lengths fit the templates.
- [ ] All three scenarios show clear signed financial results and exact contributing-record drilldowns.
- [ ] Loading, invalid-photo, provider-error, unavailable-FX, empty and expired states are designed and actionable.
- [ ] Performance findings include real observations and focused fixes; unobserved coverage is listed separately.
- [ ] Root checks pass at the recorded snapshot and owning documentation reflects any justified visual refinement.

## Focused verification and evidence

| Case | Required observable evidence |
| --- | --- |
| Design matrix | 36 looks by three pages, compact/wide observations, actual assets and recorded pending cells. |
| Responsive boundaries | 320 through 2560 widths, intermediate resize, short height and 200% zoom expose no hidden primary action. |
| Visible motion | Real observation of runway, chat preview and dashboard transitions under normal and reduced-motion OS preference. |
| Keyboard/touch | Complete setup and owner/shopper workflows with focus/tap chart access and restored dialog focus. |
| Photo and content stress | Long names, twenty products, sold-out variants, invalid replacement image and optional metadata do not break layout. |
| Scenario accuracy | Profit, near break-even and heavy loss show signed results; drilldown totals equal displayed facts. |
| Late operations | Navigation/reset while pending cannot apply obsolete AI output or reopen a stale overlay. |
| Performance and recovery | Observed loading/frame/memory evidence, bounded chat growth and no leaked owned image URLs after reset. |

Run meaningful focused tests during iteration. At the settled implementation snapshot run the applicable root gates established by RTL-001: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm check:boundaries`, `pnpm test:unit` and `pnpm build`. Record actual commands/results and revision. UI acceptance needs real browser observations where available; DOM simulations or animation declarations alone do not prove appearance/movement. Do not add tests that merely mirror CSS or static labels.

## External evidence and scope limits

Local visual QA uses declared fixtures with paid calls disabled. Public live catalogue/text/logo checks remain in RTL-020 and hosted acceptance in RTL-022. Owner visual feedback should be sought on concrete observed results where needed; do all available corrections and evidence work first. Do not claim screenshots, device checks or smoothness measurements that were not actually performed.

Do not expand the customization library, add a freeform page builder, redesign the three page families from scratch, implement payment/shipping or invent a full WCAG conformance claim. Physical assistive technology and devices not available remain explicit limits. This packet fixes the accepted experience; RTL-020 owns real provider acceptance and RTL-022 owns hosted observations.

## Precision references

- [2. Product contract and audience](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#2-product-contract-and-audience)
- [4. Landing page specification](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#4-landing-page-specification)
- [5. Canonical visitor journey](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#5-canonical-visitor-journey)
- [7. Photo selection, preview and handling](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#7-photo-selection-preview-and-handling)
- [9. Storefront and product experience](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#9-storefront-and-product-experience)
- [10. Bag and simulated checkout](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#10-bag-and-simulated-checkout)
- [11. Owner workspace](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#11-owner-workspace)
- [15. AI capabilities and assistant behavior](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#15-ai-capabilities-and-assistant-behavior)
- [16. Guest state, recovery and cleanup](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#16-guest-state-recovery-and-cleanup)
- [24. Visual system, motion and accessibility](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#24-visual-system-motion-and-accessibility)
- [25. Verification and evidence](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#25-verification-and-evidence)
- [27. Implementation sequence and ticket map](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#27-implementation-sequence-and-ticket-map)
- [30. Definition of complete](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#30-definition-of-complete)

## Completion handoff and commit boundary

Keep this outcome under `RTL-019:`; adjacent cohesive commits may be planned when useful. At execution write file allocations under `docs/commit-plans/RTL-019.md` and actual check/review evidence under `docs/validation/RTL-019.md`. These are future records, not fabricated by this planning pass.

Report files, delivered behavior, settled checks, browser/device observations, deviations and every deferred external check with its prerequisite. Update owning documentation and queue status together. All boxes are currently unchecked. Ticket creation does not implement the feature, authorize Git mutations, start services, call paid runtime providers or publish cloud resources. Follow the user’s actual execution authorization when work starts.
