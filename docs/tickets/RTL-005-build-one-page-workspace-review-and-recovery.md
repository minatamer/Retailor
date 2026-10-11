# RTL-005 — Build the one-page workspace, catalogue review and recovery

Status: **Complete**\
Planning date: **11 October 2026**\
Milestone: **Core workflow**\
Depends on: [RTL-002](RTL-002-prove-brand-design-system-and-storefront-direction.md), [RTL-003](RTL-003-prepare-fifteen-clothing-photos-and-upload-pipeline.md), [RTL-004](RTL-004-build-exact-commerce-commands-and-fact-engine.md)\
Blocks directly: [RTL-006](RTL-006-deliver-live-catalogue-recognition-and-admission.md), [RTL-007](RTL-007-deliver-three-complete-clothing-store-templates.md), [RTL-008](RTL-008-deliver-tailor-chat-led-styling-and-owner-overrides.md), [RTL-009](RTL-009-deliver-automatic-usd-eur-storefront-pricing.md), [RTL-011](RTL-011-deliver-three-scenarios-and-owner-operations.md)\
Suggested commit: `RTL-005: build the one-page workspace, catalogue review and recovery`\
Parent authority: [Retailor blueprint](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md)\
Queue and execution rules: [Ticket index](README.md)

## Outcome and standalone context

Deliver the single progressive `/demo` workspace: Choose → Process → Catalogue → Style → Storefront ↔ Dashboard. Photo selection, review and the emerging preview should feel like one continuous Retrosum-inspired experience, not separate setup sites. One session controller owns workflow, products, accepted design, scenario identity and asynchronous generations.

Build compact image-backed catalogue review with honest observed/generated/default/unknown provenance. Product names and optional corrections are not a compulsory spreadsheet. Every included product has an available validated photo; uncertainty about materials/measurements stays visible. This packet also creates real allow-listed browser recovery, so a completed draft survives refresh without another paid request.

## Dependency evidence and entry conditions

RTL-002 supplies real primitives, RTL-003 accepted photo/cache interfaces and RTL-004 graph commands/facts. Read their actual local checks. A declared injected development draft can exercise the full UI until RTL-006 supplies live recognition; it cannot become the public sample fallback. RTL-011 later plugs the final three-scenario generator into the reviewed catalogue publication seam.

Dependency completion means required local behavior, owning contracts and checks actually exist. A planned checkbox or ticket-named commit alone is insufficient. Verified local dependencies may support local follow-on work while separately recorded live, owner-visual or hosted evidence remains pending. Never turn a fake pass into live acceptance.

## Files and responsibility boundaries

| Area | Responsibility owned here |
| --- | --- |
| `apps/frontend/src/features/session` | Controller, stage transitions, operation generations and persistence |
| `apps/frontend/src/features/demo` | One-page stage composition and continuity |
| `apps/frontend/src/features/catalogue` | Grouping/review/edit/exclude and publication UI |
| `apps/frontend/src/app/demo` | Thin canonical route |
| `docs/engineering/WORKSPACE.md` | Recovery schema, stage semantics and session ownership |

Paths describe future ownership. Create modules/directories only with real behavior; reuse contracts, commands, assets and session state rather than a parallel authority.

## Implementation plan

1. **Define legal transitions.** Use discriminated states and derived selectors for stage/actions/errors; components and URLs never mirror a second stage variable. `/demo` owns the journey without generated query/hash routes. Back and perspective changes preserve accepted state where valid.

2. **Keep ephemeral resources outside projection.** Separate Files/Blobs, controllers, object URLs, grants/challenge tokens, SDK clients and pending animations from serialized state. Persist only eligible graph/design/source metadata, finalized conversations, bounded preferences and workflow recovery hints.

3. **Create graceful process composition.** Morph selection into truthful stage feedback and catalogue cards. Use indeterminate waiting where actual provider progress is unknown. Cancellation returns to usable inputs; do not show fake percentages or add delays after work is ready.

4. **Build review around photos.** Lead with beautiful cards and Make it my own. Compact panels expose title/category, demo price/stock/options, supported facts and optional sources. Unknown measurements/materials remain absent or explicitly unknown; labels distinguish defaults from observed evidence.

5. **Support grouping and coverage.** Review multiple-view groups, split/merge ambiguity and variant relations using exact image IDs. Every accepted input has a linked/review/duplicate/rejected disposition. Non-clothing input is excluded; an ambiguous garment is not silently a confidently identified SKU.

6. **Publish atomically.** Validate at least one usable photo-backed product, finite options, references and limits before replacing the draft with a session catalogue. Publication constructs the scenario through its owned generator seam; design changes never reseed it. Until RTL-011, use valid declared development injection rather than a second production generator.

7. **Implement allow-listed restoration.** Cap normalized sessionStorage at 2 MiB, validate version/identity/references/expiry and keep fixed two hours from creation. Decode bytes from the owned IndexedDB cache and recreate URLs. Never serialize Base64 or extend expiry on refresh.

8. **Fence duplicate tabs and stale work.** Acquire an atomic owned cache lease with runtime tab identity; duplicate writers fork an eligible bounded snapshot or start fresh. Generation/identity/input revision fence decode/provider results. Never attach old results to a reset workspace or auto-replay a pending request after refresh.

9. **Handle missing/corrupt state honestly.** Quota denial leaves valid in-memory work usable. Missing garment bytes preserve recovery metadata but disable affected purchasing until repaired. Lost logo bytes fall back to wordmark; completed stored catalogues do not reprocess automatically. Unknown/corrupt projections offer clear reset/reselection.

10. **Record real end-to-end local evidence.** Exercise selection, fixture processing, review correction, entering style, refresh and reset through actual UI and focused transition/storage tests. Baseline reset/expiry exists now; RTL-016 integrates every later feature’s resources and export behavior.

## Acceptance criteria — required local outcome

- [x] One route/controller owns all workflow and perspective transitions.
- [x] Review is photo-first, compact and correct about provenance/unknowns.
- [x] Grouping/exclusion preserves complete input disposition and valid IDs.
- [x] Publication rejects photo-free products and incomplete references atomically.
- [x] Completed drafts/design can restore without automatic model dispatch.
- [x] Allow-listed bounded storage excludes runtime handles, bytes, grants and secrets.
- [x] Missing/cache-denied/corrupt/expired/duplicate-tab states recover safely.
- [x] Reset/input changes fence late results and release owned basic resources.
- [x] The development fixture path cannot be selected as public live fallback.

## Focused verification and evidence

| Case | Required observable evidence |
| --- | --- |
| Full fixture journey | One shell, smooth transitions and real edits without page reload |
| Grouping and bad input | Exact source disposition, no phantom item or silent photo loss |
| Refresh at each stage | Completed work returns; pending work never automatically resubmits |
| Storage inspection | 2 MiB allow-list with no bytes/Base64/tokens/controllers |
| Expired/future/corrupt projection | Safe clear/recovery and original fixed expiry |
| Missing photo/duplicate tab | Affected buy path disabled, ownership not stolen |
| Reset during pending work | Old generation cannot change the new session |

Run meaningful focused tests during iteration. At the settled implementation snapshot run the applicable root gates established by RTL-001: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm check:boundaries`, `pnpm test:unit` and `pnpm build`. Record actual commands/results and revision. UI acceptance needs real browser observations where available; DOM simulations or animation declarations alone do not prove appearance/movement. Do not add tests that merely mirror CSS or static labels.

## External evidence and scope limits

No paid or hosted acceptance belongs to this packet. Record visual/device checks not actually performed separately.

No backend session store, localStorage merchant library, forced typed onboarding, generic state framework or ready public sample catalogue. Don’t duplicate the future scenario generator, template renderer or assistant shell. Use interfaces and actual local behavior, not empty feature placeholders.

## Precision references

- [5. Canonical visitor journey](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#5-canonical-visitor-journey)
- [6. Routes, shell and navigation](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#6-routes-shell-and-navigation)
- [7. Photo selection, preview and handling](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#7-photo-selection-preview-and-handling)
- [8. Catalogue recognition and review](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#8-catalogue-recognition-and-review)
- [14. Commands, revision control and proposals](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#14-commands-revision-control-and-proposals)
- [16. Guest state, recovery and cleanup](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#16-guest-state-recovery-and-cleanup)
- [17. Architecture and framework](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#17-architecture-and-framework)
- [19. Data contracts and API](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#19-data-contracts-and-api)
- [23. Resource limits and cost control](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#23-resource-limits-and-cost-control)
- [25. Verification and evidence](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#25-verification-and-evidence)

## Completion handoff and commit boundary

Keep this outcome under `RTL-005:`; adjacent cohesive commits may be planned when useful. At execution write file allocations under `docs/commit-plans/RTL-005.md` and actual check/review evidence under `docs/validation/RTL-005.md`. These are future records, not fabricated by this planning pass.

Report files, delivered behavior, settled checks, browser/device observations, deviations and every deferred external check with its prerequisite. Update owning documentation and queue status together. Required local acceptance is verified in [RTL-005 validation](../validation/RTL-005.md), with semantics in [WORKSPACE.md](../engineering/WORKSPACE.md) and allocations in [the commit plan](../commit-plans/RTL-005.md). The owner has authorized these local commits. Physical-device, actual zoom and owner feedback remain separately tracked for RTL-019; no paid or hosted acceptance is claimed.
