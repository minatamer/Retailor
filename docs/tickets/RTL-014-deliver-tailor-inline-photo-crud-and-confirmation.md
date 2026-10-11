# RTL-014 — Deliver Tailor inline photo CRUD and reviewed operations

Status: **Planned — not started**\
Planning date: **11 October 2026**\
Milestone: **Copilot operations**\
Depends on: [RTL-003](RTL-003-prepare-fifteen-clothing-photos-and-upload-pipeline.md), [RTL-011](RTL-011-deliver-three-scenarios-and-owner-operations.md), [RTL-013](RTL-013-deliver-grounded-tailor-conversation-tools-and-tours.md)\
Blocks directly: [RTL-016](RTL-016-complete-export-reset-expiry-and-session-lifecycle.md), [RTL-019](RTL-019-verify-polish-responsive-motion-and-design-matrix.md), [RTL-020](RTL-020-evaluate-live-ai-and-audit-release-acceptance.md)\
Suggested commit: `RTL-014: deliver Tailor inline photo CRUD and reviewed operations`\
Parent authority: [Retailor blueprint](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md)\
Queue and execution rules: [Ticket index](README.md)

## Outcome and standalone context

Make Tailor an effective operator through real editable inline forms. “Create a black denim jacket” should produce a clothing-photo upload card in the conversation, current editable product fields, a compact effect review and one confirmation. No photo means no product. Dashboard and Tailor reuse the same draft/form/command authority.

Retrosum’s animated prefill and contextual quick actions are the inspiration, but Retailor adds image intake and commerce lifecycle. The animation presents already validated suggested fields; it must never overwrite user-edited values or stream unchecked changes into the graph. Products, order/expense drafts, refunds/returns, stock and costs use the same supported operations as the owner panel.

## Dependency evidence and entry conditions

RTL-003’s real picker/photo witness, RTL-011’s owner form APIs and RTL-013’s finite inert proposals must be proven. Confirm RTL-004 effect preview/revision/replay/Undo behavior. Do not implement a separate chat ledger, photo validator or dashboard draft. Read dirty-field and posted-history constraints before animating anything.

Dependency completion means required local behavior, owning contracts and checks actually exist. A planned checkbox or ticket-named commit alone is insufficient. Verified local dependencies may support local follow-on work while separately recorded live, owner-visual or hosted evidence remains pending. Never turn a fake pass into live acceptance.

## Files and responsibility boundaries

| Area | Responsibility owned here |
| --- | --- |
| `apps/frontend/src/features/assistants` | Inline form cards, clarification, prefill and result actions |
| `apps/frontend/src/features/operations` | Reusable shared form/draft ownership and current effect review |
| `apps/backend/src/assistants` | Supported bounded preparation tools and clarification output |
| `packages/contracts/src` | Only necessary cross-boundary proposal fields |
| `docs/engineering/TAILOR-OPERATIONS.md` | Photo/prefill/review/replay acceptance |

Paths describe future ownership. Create modules/directories only with real behavior; reuse contracts, commands, assets and session state rather than a parallel authority.

## Implementation plan

1. **Map every supported owner intent.** Prepare product create/update/removal, unplaced order/expense drafts, placement/lifecycle, stock adjustment/writeoff, return/refund and future cost changes. Return an authored finite form key plus exact IDs/fields. Missing or ambiguous entities require concise grouped clarification and useful CTA choices.

2. **Require photo intake in chat.** Creation card includes a labelled native picker, accepted thumbnail, replace/remove and field-level errors. Existing accepted photos can be selected deliberately. Empty/broken/unsupported/placeholder/logo input cannot unlock Create product. Photo selection is local; optional description help is an explicit bounded catalogue-recognition action using the same two-attempt workspace budget from RTL-006, not a new route or allowance.

3. **Use one real draft.** The same form values/effect engine power dashboard and chat. Open full form moves/focuses the shared draft rather than cloning it. Required fields are bounded title, clothing category, USD price, finite options/stock and validated photo; unsupported material/measurements remain unknown.

4. **Animate only validated suggestions.** Stage a finite set of supported field values before filling. Mark dirty fields on user input and skip them in later animation steps. Keep normal edit/cancel available, preserve focus and cancel owned timers/outlines on navigation/reset. Actual current field values are revalidated at confirmation.

5. **Make financial/physical effects explicit.** Preview exact before/after money, stock, snapshots and preserved history. Refund never implies restock; placement never edits a draft invisibly; linked product removal explains archival. Do not render a natural-language promise as the final computed effect.

6. **Confirm once without inference.** One compact inline Confirm/Edit/Cancel applies the pure command with proposal ID, current revision and expiry. Confirmation is local and makes zero additional model requests. Double confirmation returns the existing result or safe conflict, not a second deduction/refund.

7. **Show useful results and limited Undo.** Link to the actual product/order/record and resulting stock/fact changes. Expose latest eligible Undo only for reversible drafts/copy/bag actions. Posted orders/refunds/cancellations/movements use permitted domain transitions; old chat buttons cannot erase history.

8. **Respect scope changes and restores.** Manual graph edits, scenario switch, photo replacement, changed target and expiry invalidate relevant executable proposals. Preserve finalized chat as inert display. Refresh may restore completed records and eligible receipts, never automatically replay model prefill or confirmation.

9. **Cover all operation families coherently.** Use the same card primitives and clarification/error states across product/order/expense/stock/return/refund work. Avoid giant configurable catch-all forms. Scenario-switch preparation uses the existing explicit replacement review and preserves product/design/photo facts.

10. **Verify real browser choreography.** Exercise no-photo creation, photo attach, edit during animated fill, compact confirmation, duplicate click, archive and posted operation cases. Measure whether chat remains readable beside the store/dashboard on phone and desktop; a valid tool JSON alone does not prove usable UI.

## Acceptance criteria — required local outcome

- [ ] Tailor renders real editable owner operation forms inside chat.
- [ ] Every product create includes a required validated photo picker.
- [ ] Dashboard/chat share one draft/form/effect/command authority.
- [ ] Missing/ambiguous core fields use concise grouped clarification.
- [ ] Animated fill remains interruptible and preserves dirty fields/focus.
- [ ] Confirmation recomputes current effect and adds zero model calls.
- [ ] Duplicate/stale/expired proposals cannot mutate twice.
- [ ] Posted history and archive/return/refund distinctions remain accurate.
- [ ] Results link to actual records and only eligible latest Undo is enabled.
- [ ] Reset/refresh/navigation clears executable choreography safely.

## Focused verification and evidence

| Case | Required observable evidence |
| --- | --- |
| Create with no photo | Clear required state; zero graph mutation |
| Attach photo and confirm garment | Actual available raster, exact current form values and storefront item |
| Edit during fill | Human value survives and final validation uses it |
| Two matching black jackets | Exact target choice, no first-match deletion |
| Refund without return | Correct financial effect and no automatic stock restoration |
| Double/stale confirm | One effect or typed conflict, no duplicate inference |
| Old reply Undo/refresh | Inert old action; eligible latest domain receipt only |
| Phone keyboard/cancel | Useful layout and all timers/outlines cleaned |

Run meaningful focused tests during iteration. At the settled implementation snapshot run the applicable root gates established by RTL-001: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm check:boundaries`, `pnpm test:unit` and `pnpm build`. Record actual commands/results and revision. UI acceptance needs real browser observations where available; DOM simulations or animation declarations alone do not prove appearance/movement. Do not add tests that merely mirror CSS or static labels.

## External evidence and scope limits

Live proposal accuracy and owner/physical keyboard/touch feedback are separate from local form/command correctness. All typed model work follows RTL-013 admission/caps; inline upload and confirmation are local actions.

No photo-free product, invented image URL, generated product-photo substitute, generic posted-history Undo or hidden provider repair call. Do not change the accepted primary setup to a manual settings flow. Live natural-language breadth remains RTL-020 evidence; finite fake scenarios must use the same actual forms.

## Precision references

- [7. Photo selection, preview and handling](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#7-photo-selection-preview-and-handling)
- [11. Owner workspace](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#11-owner-workspace)
- [13. Commerce domain and exact calculations](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#13-commerce-domain-and-exact-calculations)
- [14. Commands, revision control and proposals](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#14-commands-revision-control-and-proposals)
- [15. AI capabilities and assistant behavior](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#15-ai-capabilities-and-assistant-behavior)
- [16. Guest state, recovery and cleanup](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#16-guest-state-recovery-and-cleanup)
- [23. Resource limits and cost control](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#23-resource-limits-and-cost-control)
- [24. Visual system, motion and accessibility](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#24-visual-system-motion-and-accessibility)
- [25. Verification and evidence](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#25-verification-and-evidence)

## Completion handoff and commit boundary

Keep this outcome under `RTL-014:`; adjacent cohesive commits may be planned when useful. At execution write file allocations under `docs/commit-plans/RTL-014.md` and actual check/review evidence under `docs/validation/RTL-014.md`. These are future records, not fabricated by this planning pass.

Report files, delivered behavior, settled checks, browser/device observations, deviations and every deferred external check with its prerequisite. Update owning documentation and queue status together. All boxes are currently unchecked. Ticket creation does not implement the feature, authorize Git mutations, start services, call paid runtime providers or publish cloud resources. Follow the user’s actual execution authorization when work starts.
