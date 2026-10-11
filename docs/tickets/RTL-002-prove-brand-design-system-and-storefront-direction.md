# RTL-002 — Prove the brand system and storefront visual direction

Status: **Implemented locally; owner visual and real browser-zoom evidence pending**\
Planning date: **11 October 2026**\
Milestone: **Visual foundation**\
Depends on: [RTL-001](RTL-001-initialize-workspace-contracts-and-safe-runtime.md)\
Blocks directly: [RTL-003](RTL-003-prepare-fifteen-clothing-photos-and-upload-pipeline.md), [RTL-005](RTL-005-build-one-page-workspace-review-and-recovery.md), [RTL-007](RTL-007-deliver-three-complete-clothing-store-templates.md), [RTL-017](RTL-017-build-vibrant-storefront-runway-landing.md)\
Suggested commit: `RTL-002: prove the brand system and storefront visual direction`\
Parent authority: [Retailor blueprint](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md)\
Queue and execution rules: [Ticket index](README.md)

## Outcome and standalone context

Prove a vibrant Retailor identity and a compelling clothing storefront direction before broad frontend styling. The main showcase is the store: supplied garments should feel like a credible brand, not data cards with a theme switch. The accepted size is three complete three-page templates, four themes and three type presets—36 combinations.

Studio, Pulse and Gallery are the three template directions. Ink/Paper, Cobalt/Cloud, Oxblood/Blush and Pine/Sand are the four paired colour themes. Inter; DM Serif Display with DM Sans; and Manrope with DM Sans are the three typography presets. These are researched starting directions. They are not global popularity rankings or conversion guarantees. Current documentation drawings and system fonts do not establish final photography or design approval. Create a reviewable running frontend, with shared foundations rather than a competing standalone prototype.

## Dependency evidence and entry conditions

RTL-001 supplies the real app and public boundaries. Read current research, accepted answers and all three page contracts. Use clearly temporary imagery for initial visual work while RTL-003 obtains final assets; the owner need not supply clothing photos. Verify primary sources when revising a dated design/font assumption. Build the concrete baseline before requesting owner feedback.

Dependency completion means required local behavior, owning contracts and checks actually exist. A planned checkbox or ticket-named commit alone is insufficient. Verified local dependencies may support local follow-on work while separately recorded live, owner-visual or hosted evidence remains pending. Never turn a fake pass into live acceptance.

## Files and responsibility boundaries

| Area | Responsibility owned here |
| --- | --- |
| `apps/frontend/src/styles` | Platform and semantic storefront tokens |
| `apps/frontend/src/components/ui` | Stable reusable controls, surfaces and focus/error patterns |
| `apps/frontend/src/features/store-design` | Finite theme/type registry and representative composition |
| `apps/frontend/public/fonts` | Accepted bundled families and licence records |
| `docs/design/RTL-002-DESIGN.md` | Research decisions and actual visual evidence |

Paths describe future ownership. Create modules/directories only with real behavior; reuse contracts, commands, assets and session state rather than a parallel authority.

## Implementation plan

1. **Explain the design choices.** Record why each layout/type/colour mood fits clothing UX, with primary references and dates. Separate accepted scope from token/art refinements. Avoid claiming a universal purchase-inducing colour or most-popular font ranking.

2. **Separate platform and merchant identities.** Retailor’s public/setup surfaces may be vibrant; merchant presets can be neutral or expressive. Define spacing, type rhythm, corners, action priority and surface hierarchy. Retrosum informs pacing, not a copied green/orange brand.

3. **Complete semantic palettes.** Define canvas, surface, body/muted text, action/action text, border, focus, hover, selected and feedback roles. Pale/dark garments must stand out. Error/destructive semantics must not be confused with an oxblood brand action.

4. **Use actual licensed typography.** Self-host needed weights; record redistribution terms and stable fallbacks. Review headings, body, price numerals and controls with long names/EUR text. Typography specimens must show buying information, not only decorative display text.

5. **Prove a representative three-page family.** Render Studio home, collection and detail with real app components. Switch four palettes and three type presets immediately from finite IDs. Do not implement arbitrary CSS, independent per-page layouts or a freeform colour picker.

6. **Define distinct Pulse and Gallery directions.** Show their complete page relationships in app references: campaign/denser Pulse, spacious/photo-led Gallery. Prices, sizes, imagery, filters and bag capability remain equally clear. RTL-007 completes all working families.

7. **Prove chat and dashboard foundations.** Render a lower-right Tailor shell, inline visual CTA card, mandatory-photo form and one meaningful KPI/chart/evidence treatment. Borrow Retrosum’s concise actions and editable forms without copying its domain or launch position.

8. **Check content and device pressure.** Inspect phone/tablet/laptop/large desktop and short-height compositions. Include long store names, light/dark photos, unavailable stock, zoom and keyboard focus. Ensure chat leaves the actual preview appreciable.

9. **Keep motion intentional and visible.** Use short transform/opacity feedback and stable content geometry. Never add animation-off or OS motion suppression. Check on-screen movement, interruption and latest-selection settling rather than only configured animation names.

10. **Record a concrete baseline.** Document browser findings, chosen tokens and unresolved aesthetic refinements. Present the actual result for owner feedback when executing. Work can continue with a declared provisional baseline unless the owner explicitly rejects it; final 36-combination review is RTL-019.

## Acceptance criteria — required local outcome

- [x] Platform/store tokens and typography have explicit shared ownership.
- [x] Four themes and three bundled type presets can be judged on one three-page family.
- [x] Three template directions differ visibly without capability loss.
- [x] Chat CTA, photo form and chart surfaces look coherent and readable.
- [x] Fonts/licences and measured text/action/focus contrast are recorded.
- [x] Long text, EUR amounts, keyboard/touch and short heights remain usable.
- [x] Visible motion has no suppression settings.
- [x] Owner response and actual visual observations remain separate from proposals.

## Focused verification and evidence

| Case | Required observable evidence |
| --- | --- |
| Actual specimens | Font rendering, hierarchy and semantic contrast |
| Garment pressure | Pale/dark/saturated photos separate from every theme surface |
| Responsive composition | No page overflow or obscured actions at practical widths/heights |
| Zoom/keyboard | Named selected choices remain reachable |
| Transitions | Actual visible movement and rapid-change settling |
| Owner review | Record exact feedback only when received |

Run meaningful focused tests during iteration. At the settled implementation snapshot run the applicable root gates established by RTL-001: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm check:boundaries`, `pnpm test:unit` and `pnpm build`. Record actual commands/results and revision. UI acceptance needs real browser observations where available; DOM simulations or animation declarations alone do not prove appearance/movement. Do not add tests that merely mirror CSS or static labels.

## External evidence and scope limits

Aesthetic/device approval is distinct from local engineering completion. Obtain review of the concrete result, not an unbuilt plan, while continuing authorized reversible work. No paid or cloud capability is enabled here.

No copied competitor identity/assets, fake testimonials, arbitrary colour/font controls or conversion promises. No mandatory pause invented from sibling visual-approval histories. All final templates are completed in RTL-007 and assessed across 108 page compositions per viewport in RTL-019.

## Precision references

- [2. Product contract and audience](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#2-product-contract-and-audience)
- [4. Landing page specification](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#4-landing-page-specification)
- [9. Storefront and product experience](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#9-storefront-and-product-experience)
- [24. Visual system, motion and accessibility](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#24-visual-system-motion-and-accessibility)
- [25. Verification and evidence](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#25-verification-and-evidence)
- [29. Decisions to settle during implementation](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#29-decisions-to-settle-during-implementation)

## Completion handoff and commit boundary

Keep this outcome under `RTL-002:`; adjacent cohesive commits may be planned when useful. At execution write file allocations under `docs/commit-plans/RTL-002.md` and actual check/review evidence under `docs/validation/RTL-002.md`. These are future records, not fabricated by this planning pass.

Report files, delivered behavior, settled checks, browser/device observations, deviations and every deferred external check with its prerequisite. Update owning documentation and queue status together. Required local boxes are checked against [actual validation](../validation/RTL-002.md); owner feedback and actual browser zoom remain explicitly pending. Ticket creation does not implement the feature, authorize Git mutations, start services, call paid runtime providers or publish cloud resources. Follow the user’s actual execution authorization when work starts.
