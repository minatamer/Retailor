# RTL-008 — Deliver Tailor-led styling and owner design overrides

Status: **Locally implemented — physical device/keyboard, zoom and owner visual acceptance tracked in RTL-019**\
Planning date: **11 October 2026**\
Milestone: **Signature setup**\
Depends on: [RTL-005](RTL-005-build-one-page-workspace-review-and-recovery.md), [RTL-007](RTL-007-deliver-three-complete-clothing-store-templates.md)\
Blocks directly: [RTL-010](RTL-010-connect-shopping-bag-and-simulated-orders.md), [RTL-013](RTL-013-deliver-grounded-tailor-conversation-tools-and-tours.md), [RTL-015](RTL-015-deliver-optional-three-logo-generation.md), [RTL-017](RTL-017-build-vibrant-storefront-runway-landing.md)\
Suggested commit: `RTL-008: deliver Tailor-led styling and owner design overrides`\
Parent authority: [Retailor blueprint](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md)\
Queue and execution rules: [Ticket index](README.md)

## Outcome and standalone context

Build the signature creator flow as a conversation with Tailor, not a manual design toolbar beside a chatbot. After catalogue review, the actual store renderer appears and Tailor’s lower-right welcome introduces template → colour → typography → optional brand details → optional logo offer → Enter my store. Native CTA cards inside the chat let visitors finish without typing.

This adopts Retrosum’s contextual shortcuts, compact messages, editable inline forms and progressive disclosure. The store must visibly change in real time as choices are explored, with home/collection/detail preview tabs. Manual styling belongs in the owner dashboard after setup. Authored welcome/cards/tours are local actions; a text model is not required for choosing a finite preset.

## Dependency evidence and entry conditions

RTL-005’s sole session controller/recovery and RTL-007’s actual three-family renderer are locally proven. Use RTL-002 primitives and accepted preset IDs. Inspect current Retrosum conversation/shortcut/guidance code for patterns without inheriting its product-specific assistant position or financial forms. RTL-013 adds grounded typed conversation to this same shell later.

Dependency completion means required local behavior, owning contracts and checks actually exist. A planned checkbox or ticket-named commit alone is insufficient. Verified local dependencies may support local follow-on work while separately recorded live, owner-visual or hosted evidence remains pending. Never turn a fake pass into live acceptance.

## Files and responsibility boundaries

| Area                                             | Responsibility owned here                                         |
| ------------------------------------------------ | ----------------------------------------------------------------- |
| `apps/frontend/src/features/assistants`          | Tailor shell, creator microsteps, inline cards and finite actions |
| `apps/frontend/src/features/store-design`        | Accepted/preview design, confirmation and brand fields            |
| `apps/frontend/src/features/demo and operations` | Style integration and owner manual Design panel                   |
| `docs/engineering/TAILOR-SETUP.md`               | Microstep, confirmation, focus and recovery contract              |

Paths describe future ownership. Create modules/directories only with real behavior; reuse contracts, commands, assets and session state rather than a parallel authority.

## Implementation plan

1. **Mount one persistent Tailor surface.** Create a lower-right launcher/conversation with bounded expand/collapse and predictable mobile sheet behavior. It remains one assistant across creator/shopper/owner roles. The store stays visible enough to judge; do not create duplicate chat implementations per page.

2. **Introduce the emerging store.** Use a brief local friendly welcome and optional soft blur. Let’s style it clears blur before comparison. Dismiss collapses welcome but leaves Continue styling with Tailor and preserves progress; it does not silently accept design choices.

3. **Make template choices visual and conversational.** Show three authored cards inside the message surface with recognizably different page bundles and short descriptions. Selection previews the actual products immediately; Use this template confirms and advances. All native button semantics/focus/selected labels work.

4. **Guide colour then typography.** Present named multi-swatch themes and actual heading/body/price specimens in chat. Show/preview and Use/confirm are distinct. Only one main task expands; prior choices become concise recap bubbles with Change. Type and colour confirm flags cannot be inferred merely from rendering defaults.

5. **Offer the fast default path.** Use this look explicitly accepts the recommended complete design without typing. It must remain excellent. Home/Collection/Product preview tabs preserve context throughout; rapid changes settle to the latest selection without timer accumulation.

6. **Refine optional brand details.** Provide bounded plain-text name/headline and accepted-photo hero selection/upload through the existing pipeline. Keep suggested details avoids typing. Text wordmark uses actual chosen fonts and readable fallback. No arbitrary logo upload/page editor is added.

7. **Gate the optional logo offer.** Reveal Keep my wordmark / Generate 3 logos only after explicit colour and type confirmation. The generation action is a separate finite prepared intent; RTL-015 wires paid execution. Showing an offer, selecting a preset or confirming a look never dispatches a provider.

8. **Finish and preserve the result.** Summarize complete chosen design and Enter my store accepts it. Keep draft preview distinct from accepted design on later revisits. Restore only eligible confirmed microsteps/design; pending executable actions remain inert.

9. **Deliver owner manual overrides.** Add owner Design controls for the same complete template/theme/type/name/headline/hero and selected mark. Apply look commits the preview; Cancel restores accepted state. These controls complement Tailor, not become the primary onboarding flow. Changing style never reseeds orders or alters money.

10. **Protect typing, focus and continuity.** Button selection does not steal focus unnecessarily, async suggestion/prefill cannot overwrite dirty brand fields and reset/navigation cancels owned motion. Keyboard, tap, small-height/virtual keyboard and back/change paths get equivalent feedback. Invalid stored preset falls back explicitly to an accepted default.

## Acceptance criteria — required local outcome

- [x] Primary styling controls live inside Tailor’s conversation.
- [x] A visitor completes setup without a free-text prompt or model call.
- [x] Actual products update instantly across all three preview surfaces.
- [x] Template/colour/type use explicit confirmations and compact recap/change controls.
- [x] Brief introduction never leaves the comparison preview blurred.
- [x] Optional name/headline/hero and excellent text wordmark are supported.
- [x] Logo offer appears only after confirmed colour and type; reveal causes zero dispatch.
- [x] Owner manual Design uses the same presets/commands with Apply/Cancel.
- [x] Style changes preserve bag, stock, IDs and scenario.
- [x] Restore, rapid selection, dirty fields and phone keyboard remain safe.

## Focused verification and evidence

| Case                         | Required observable evidence                                           |
| ---------------------------- | ---------------------------------------------------------------------- |
| No-typing full setup         | Native cards/CTAs reach accepted storefront with zero provider count   |
| Logo gate                    | Defaults/type-only do not unlock; colour plus type confirmation does   |
| Preview identity             | Same current product on home/list/detail before and after style change |
| Rapid/back/change selection  | Latest look settles and recap accurately reflects confirmation state   |
| Owner override/cancel        | Same registry and accepted/preview distinction                         |
| Collapse/blur/phone keyboard | Visible preview, useful resume launcher and no focus theft             |
| Refresh/reset                | No stale executable logo/choice action or regenerated catalogue        |

Run meaningful focused tests during iteration. At the settled implementation snapshot run the applicable root gates established by RTL-001: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm check:boundaries`, `pnpm test:unit` and `pnpm build`. Record actual commands/results and revision. UI acceptance needs real browser observations where available; DOM simulations or animation declarations alone do not prove appearance/movement. Do not add tests that merely mirror CSS or static labels.

## External evidence and scope limits

No paid or hosted acceptance belongs to this packet. Record visual/device checks not actually performed separately.

No separate manual onboarding tray, freeform colour/font/page controls, required interview, animation setting or model-written CSS. Do not claim Retrosum already supplies photo-upload chat cards. Logo generation belongs to RTL-015; the local offer remains truthful about availability until that capability exists. No paid action on hover or card reveal.

## Precision references

- [5. Canonical visitor journey](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#5-canonical-visitor-journey)
- [6. Routes, shell and navigation](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#6-routes-shell-and-navigation)
- [9. Storefront and product experience](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#9-storefront-and-product-experience)
- [11. Owner workspace](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#11-owner-workspace)
- [14. Commands, revision control and proposals](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#14-commands-revision-control-and-proposals)
- [15. AI capabilities and assistant behavior](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#15-ai-capabilities-and-assistant-behavior)
- [16. Guest state, recovery and cleanup](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#16-guest-state-recovery-and-cleanup)
- [24. Visual system, motion and accessibility](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#24-visual-system-motion-and-accessibility)
- [25. Verification and evidence](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#25-verification-and-evidence)

## Completion handoff and commit boundary

Keep this outcome under `RTL-008:`; adjacent cohesive commits may be planned when useful. At execution write file allocations under `docs/commit-plans/RTL-008.md` and actual check/review evidence under `docs/validation/RTL-008.md`. These are future records, not fabricated by this planning pass.

Report files, delivered behavior, settled checks, browser/device observations, deviations and every deferred external check with its prerequisite. Update owning documentation and queue status together. The local criteria above are backed by [execution and validation evidence](../validation/RTL-008.md) and [Tailor setup contract](../engineering/TAILOR-SETUP.md). Physical virtual-keyboard/touch, native zoom, full design matrix and owner visual acceptance remain explicitly pending in RTL-019. Live conversation/tours and actual logo generation retain RTL-013/015 scope. Two read-only validation passes ended with no actionable findings after independently verified fixes; all settled gates passed with 176 tests. The owner has authorized the recorded file allocation and three ticket-prefixed commits; no paid call, push or cloud publication occurred.
