# RTL-017 — Build the vibrant storefront-runway landing

Status: **Planned — not started**\
Planning date: **11 October 2026**\
Milestone: **Public story**\
Depends on: [RTL-002](RTL-002-prove-brand-design-system-and-storefront-direction.md), [RTL-003](RTL-003-prepare-fifteen-clothing-photos-and-upload-pipeline.md), [RTL-007](RTL-007-deliver-three-complete-clothing-store-templates.md), [RTL-008](RTL-008-deliver-tailor-chat-led-styling-and-owner-overrides.md)\
Blocks directly: [RTL-019](RTL-019-verify-polish-responsive-motion-and-design-matrix.md)\
Suggested commit: `RTL-017: build the vibrant storefront-runway landing`\
Parent authority: [Retailor blueprint](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md)\
Queue and execution rules: [Ticket index](README.md)

## Outcome and standalone context

Build the public landing for new clothing founders who want confidence that Retailor can make a superb store from their products. The first screen should be vibrant, modern and result-first. Try the accepted storefront-runway direction: one convincing store viewport transforms the same clothing collection through complete layouts, colour moods and typography, then briefly reveals the matching collection/detail and owner value.

This is a new eye-catcher relative to ScreenPilot’s hovering cards, ClipBuilder’s motion graphics and Retrosum’s office background. Keep the lookbook-to-store reveal and before/after asset-to-store alternatives documented for later visual feedback, rather than implementing three competing hero systems. The landing starts a demo; it must not masquerade as a clothing merchant selling FORME stock.

## Dependency evidence and entry conditions

RTL-002 provides Retailor identity, RTL-003 actual accepted sample photos and RTL-007/008 real template/design components. Use the current design references and owner-approved direction to produce a concrete running page. The hero can use openly illustrative authored merchandising data; it cannot become the public sample interpretation shortcut or imply AI has run for this visitor.

Dependency completion means required local behavior, owning contracts and checks actually exist. A planned checkbox or ticket-named commit alone is insufficient. Verified local dependencies may support local follow-on work while separately recorded live, owner-visual or hosted evidence remains pending. Never turn a fake pass into live acceptance.

## Files and responsibility boundaries

| Area | Responsibility owned here |
| --- | --- |
| `apps/frontend/src/features/landing` | Hero, transformation choreography, story sections and FAQ |
| `apps/frontend/src/app` | Thin landing composition/metadata |
| `apps/frontend/src/features/storefront` | Reuse only appropriate actual template components |
| `docs/design/LANDING.md` | Storyboard, alternative ideas and actual responsive feedback |

Paths describe future ownership. Create modules/directories only with real behavior; reuse contracts, commands, assets and session state rather than a parallel authority.

## Implementation plan

1. **Lead with the actual promise.** Use Bring your products. See your store. and concise founder-friendly copy about clothing photos becoming a beautiful storefront. Keep one obvious Build my demo store CTA. Explain Tailor/AI depth below rather than clutter the headline with infrastructure or prototype controls.

2. **Storyboard one viewport.** Plan source photos → Store look 1 → looks 2/3 → collection/detail glimpse. Every hold is readable and visually convincing. One main composition beats tiny overlapping app windows; the stable CTA never moves while assets/fonts load.

3. **Reuse actual components and photos.** Prefer production template renderer pieces with the accepted sample imagery and finite style IDs. A local illustrative hero is clearly a demonstration of the result; no visit workspace, model call, fake processing progress or seeded owner activity starts on autoplay.

4. **Make motion expressive and comfortable.** Use coordinated layout/colour/type transitions and quiet readable holds. Keep visible intended animation in all local preference states, with no render-off/animation-off control or OS suppression. Avoid flashing, high-amplitude endless drift and expensive stacked timers.

5. **Provide optional local scene choice.** If scene chips improve appreciation, they choose only an authored hero scene and preserve loop state cleanly. They do not operate the real user store or invoke Tailor/provider work. Keep labels editorial/bold/gallery understandable.

6. **Build the story hierarchy.** How it works: photos→review→Tailor look→store. Follow with complete family examples, storefront usefulness, connected owner evidence, Meet Tailor and plain temporary/synthetic/no-payment FAQ. Do not invent testimonials, company logos, sales results or conversion promises.

7. **Connect the real entry.** CTA routes to the canonical `/demo` selection, where sample photos/upload and live approval occur. Returning home does not silently reset a valid store; define appropriate return/resume behavior through the session authority. Header anchors target actual sections.

8. **Fit the first-screen experience.** Inspect phone/tablet/small laptop/large desktop and short heights. On phone, show one legible store composition and headline rather than shrink the whole desktop screenshot. Reserve image/wordmark geometry and keep controls reachable.

9. **Retain alternative concepts without parallel implementations.** Document when a lookbook reveal or before/after comparison might be better and keep their art notes for later feedback. Do not reopen the owner’s scope or build all alternatives without an explicit preference change.

10. **Measure and refine actual rendering.** Check load/bundle/image/font behavior, anchor navigation, real on-screen motion and failure fallbacks. Record owner feedback on the concrete page; no dependency is justified solely by a flashy screenshot. RTL-019 verifies integration and final device coverage.

## Acceptance criteria — required local outcome

- [ ] Landing instantly communicates clothing photos becoming a beautiful store.
- [ ] One vibrant runway composition shows complete coherent style transformations.
- [ ] Actual accepted photos/components underpin the result illustration.
- [ ] CTA/header actions enter the real one-page demo and preserve valid resume behavior.
- [ ] Tailor, owner value and temporary/synthetic boundaries are clear in concise PM copy.
- [ ] No fake testimonials/results or hidden live processing occurs on load.
- [ ] Phone/short-height/large layouts remain legible and stable.
- [ ] Visible animation has no suppressing setting or conditional OS gate.
- [ ] Two alternative concepts remain documented for later visual feedback.

## Focused verification and evidence

| Case | Required observable evidence |
| --- | --- |
| Ten-second story | A first-time viewer can identify promise and next action |
| Hero load/loop | Stable geometry, clear holds and no provider/workspace creation |
| Actual motion | Observed on-screen transitions rather than configured CSS only |
| Phone/short-height composition | One readable store preview and reachable CTA |
| Navigation/resume | Real semantic anchors and canonical demo entry |
| Asset/font failure | Useful reserved fallback without false product availability |
| Feedback record | Concrete owner response only if received |

Run meaningful focused tests during iteration. At the settled implementation snapshot run the applicable root gates established by RTL-001: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm check:boundaries`, `pnpm test:unit` and `pnpm build`. Record actual commands/results and revision. UI acceptance needs real browser observations where available; DOM simulations or animation declarations alone do not prove appearance/movement. Do not add tests that merely mirror CSS or static labels.

## External evidence and scope limits

No paid or hosted acceptance belongs to this packet. Record visual/device checks not actually performed separately.

No full video-rendering service, borrowed protected brand composition, merchant-store purchase CTA on platform landing, animation toggle or repeated privacy wall. Keep technical implementation details out of founder-facing copy. Hero fixture rendering is permitted illustration, not an authored public recognition response.

## Precision references

- [2. Product contract and audience](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#2-product-contract-and-audience)
- [4. Landing page specification](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#4-landing-page-specification)
- [5. Canonical visitor journey](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#5-canonical-visitor-journey)
- [6. Routes, shell and navigation](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#6-routes-shell-and-navigation)
- [9. Storefront and product experience](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#9-storefront-and-product-experience)
- [24. Visual system, motion and accessibility](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#24-visual-system-motion-and-accessibility)
- [25. Verification and evidence](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#25-verification-and-evidence)
- [29. Decisions to settle during implementation](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#29-decisions-to-settle-during-implementation)

## Completion handoff and commit boundary

Keep this outcome under `RTL-017:`; adjacent cohesive commits may be planned when useful. At execution write file allocations under `docs/commit-plans/RTL-017.md` and actual check/review evidence under `docs/validation/RTL-017.md`. These are future records, not fabricated by this planning pass.

Report files, delivered behavior, settled checks, browser/device observations, deviations and every deferred external check with its prerequisite. Update owning documentation and queue status together. All boxes are currently unchecked. Ticket creation does not implement the feature, authorize Git mutations, start services, call paid runtime providers or publish cloud resources. Follow the user’s actual execution authorization when work starts.
