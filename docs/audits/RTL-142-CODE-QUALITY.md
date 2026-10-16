# RTL-142 — current code quality and behavior audit

16 October2026. Clean baseline `b9a48d0d3a5e7be29db3a097db11e47c301dcb30`. This repeats RTL-023 after the photo, design, dashboard, checkout, native-logo and chat revisions. The owner authorizes focused fixes/commits while requiring preserved functionality and demo-sized complexity. STRIDE follows this settled batch separately.

## Method and coverage

The tracked TypeScript AST/import/export/function inventory covers359 implementation/test/tool/CSS files and74,427 lines. Boundary validation covers206 production TypeScript modules. These numbers describe automated coverage, **not manual review of every line**. Source inspection follows ownership and observable failure paths, particularly changes since RTL-023. Current tests/builds complement inspection without establishing hosted/provider quality.

| Area                    | Current source review and preserved behavior                                                                                                                                                                                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Contracts/imports       | Strict public schemas, package subpaths and actual boundary traversal. Single-mention public types and framework exports are intentional, not dead declarations.                                                                                                                           |
| Commerce                | Integer allocation/aggregation, quote reconciliation, graph/command validation and atomic controller order settlement. Existing tests cover immutable snapshots, refund/return distinctions, replay, stale witnesses and rounding. No second financial authority.                          |
| Session/recovery/export | Construction, restore, serialization allow-list, processing completion, dispatch mode, reset/expiry, repair, hero upload and report projection. Confirmed mode defect below. Restore stays inert; reset removes retiring projection before cache cleanup; stale generations cannot attach. |
| Photos/cache            | Header/size/pixel checks, terminable workers, decode capacity, cache lease/fence/budget, atomic logo replacement and exact-original repair. Native work and object URLs retain explicit owners.                                                                                            |
| Catalogue/design        | Processor identity/photo/revision checks, publication, safe editor validation and shared presets. Three layouts/five palettes/three types, native logos, hero choices and clothing/photo requirements preserved. Sample selection does not interpret.                                      |
| Checkout                | Shared quote, saved pending attempt, projection persistence before navigation, actual photo/variant binding, return witness, atomic order placement and duplicate-return mapping. Backend ownership/cleanup also feeds the security review. No external request made.                      |
| Tailor/UI               | Typed current-context references/proposals, safe API errors, bounded conversation, native review handoff, composer effects, bag outside-click cleanup, evidence focus/scroll ownership and chart listener cleanup. No raw provider HTML or technical browser logging.                      |
| Presentation            | Preset-derived count-up has scoped frame/observer cleanup. Dense dashboard layout, connected photo views, tours and motion preserved. Actual recovered logo/commerce checked at desktop/phone widths.                                                                                      |
| Backend/providers       | Inert factories, startup-owned environment/listening/diagnostics, fixed Responses URL, no redirects, bounded reads, injected providers and safe codes. Existing private logs retained.                                                                                                     |
| CI/packaging            | Actual unpaid workflow, six-gate scripts, byte-based snapshot, positive build inventory, pinned Docker definitions and font packaging reviewed. Test network restrictions and strict source-proof regression retained. Fresh Linux/scanner evidence belongs to the next security batch.    |

## Confirmed defect and remedy

**CQA-142-01 — restored mode disagrees with active composition. Medium functional impact; high confidence.** `restoreProjection` accepted a live projection in development but retained `fixture:false`. Logo requests used that saved field, while chat used current composition. New fixture drafts could retain live-labelled report metadata. The prior manual walkthrough recovered by resetting; this audit independently reproduced the defect with a failing regression.

After validating and rejecting inadmissible public saves, restore now derives the mode marker from current composition. Workspace identity, graph, photo bytes/descriptors, designs, expiry and inert messages remain. A live collection used in development becomes conservatively marked development before fixture work. Public mode still rejects fixture projections/drafts/logos/currency. No live failure chooses fake mode; restore dispatches nothing.

The regression opens a live-labelled controller with a cached test photo, restores in development without dispatch, explicitly processes/publishes/generates, and requires fake request mode plus three candidates. Persisted mode becomes development; public restore starts a separate workspace without dispatch. The old implementation fails (`false` versus expected `true`); the correction and existing reset/export/restore/logo tests pass.

## Retained structure

- The4,367-line controller coordinates one bounded transactional session, revision fences and resources. No repeated behavior with real independent consumers justifies splitting it to meet a line-count target.
- Exact named-function duplication finds only one284-character catalogue helper shared by two independent tests. No production extraction/dependency is warranted.
- Framework entries, public types, worker URLs, fonts and dynamic CSS remain. The older landing runway/illustration/choreography has no current landing import, but retains authored illustration/motion reference and tests. No speculative CSS/module purge or runtime-size saving is claimed.
- No broad rewrite, package churn, logger removal, motion suppression or relaxed validation/resource cap is used as a quality fix.

## Outcome and limits

[Validation](../validation/RTL-142.md):647 tests/102 files,206 boundaries, formatting/lint/types and both production builds pass. A running-backend Windows font lock blocked the first build; a verified scoped stop/rebuild/normal restart resolved it without source changes. Browser recovery retains15 garments,14 orders,$1,519.20 net sales/$685.80 operating profit; all three logos decode at390px without horizontal overflow, and design Cancel preserves the accepted look.

Cross-mode behavior is proven by the regression, not environment/browser-storage edits. Current browser checks establish recovery/responsive behavior, not new live recognition, payment, physical-device, Linux or hosted acceptance. RTL-138 provider evidence keeps its original limits. The following STRIDE ticket owns current dependency/image/release evidence.
