# RTL-020 — Evaluate live AI and audit release acceptance

Status: **Planned — not started**\
Planning date: **11 October 2026**\
Milestone: **Live acceptance**\
Depends on: [RTL-006](RTL-006-deliver-live-catalogue-recognition-and-admission.md), [RTL-009](RTL-009-deliver-automatic-usd-eur-storefront-pricing.md), [RTL-013](RTL-013-deliver-grounded-tailor-conversation-tools-and-tours.md), [RTL-014](RTL-014-deliver-tailor-inline-photo-crud-and-confirmation.md), [RTL-015](RTL-015-deliver-optional-three-logo-generation.md), [RTL-018](RTL-018-harden-privacy-abuse-spend-and-runtime-boundaries.md), [RTL-019](RTL-019-verify-polish-responsive-motion-and-design-matrix.md)\
Blocks directly: [RTL-022](RTL-022-deploy-verify-hosted-demo-and-record-rollback.md)\
Suggested commit: `RTL-020: evaluate live AI and audit release acceptance`\
Parent authority: [Retailor blueprint](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md)\
Queue and execution rules: [Ticket index](README.md)

## Outcome and standalone context

Establish whether the completed implementation really delivers the accepted AI demo and is ready for a controlled release. A deterministic local fixture can prove validators, commands and presentation, but cannot prove current OpenAI account capability, garment recognition, useful Tailor behavior, logo output, real exchange-rate availability or the public provider latency/cost envelope. Conversely, one pleasing live response cannot prove atomic stock handling, safe retries or isolation of owner/shopper tools.

This packet combines a focused release audit with an explicitly authorized, bounded live evaluation. The required sample is fifteen prepared clothing photos processed anew through the same live drafting path used for uploaded photos. Tailor must act on current catalogue and dashboard facts, including reviewed inline photo creation, rather than improvise records. Optional logo evaluation must preserve the wordmark fallback and post-style admission. USD remains canonical while EUR uses a validated dated quote. Prepare every unpaid harness, fixture, evaluation case, result schema and proposed call budget before asking for a paid run. Ticket creation itself supplies no paid budget or provider authorization; if those prerequisites are unavailable, report local acceptance and named external checks still pending.

## Dependency evidence and entry conditions

Require the connected features, security controls and visual fixes from the listed dependencies at a settled revision. Actual licensed sample assets must exist, rather than only the planning manifest. Prepare an evaluation plan naming the configured model candidates, operation counts, token/image bounds, retry policy, estimated cost basis and stop conditions. Check provider credentials/capability through normal environment configuration without printing secrets. Confirm the owner's authorization covers the actual paid calls and data handling before executing them; do not treat approval of tickets as approval of evaluation spend.

Dependency completion means required local behavior, owning contracts and checks actually exist. A planned checkbox or ticket-named commit alone is insufficient. Verified local dependencies may support local follow-on work while separately recorded live, owner-visual or hosted evidence remains pending. Never turn a fake pass into live acceptance.

## Files and responsibility boundaries

| Area | Responsibility owned here |
| --- | --- |
| `scripts/evaluate/` | Explicitly invoked bounded evaluation harnesses; never part of default paid-off CI. |
| `apps/backend/src/providers/` | Focused corrections to provider contracts, validation and failure handling. |
| `apps/frontend/src/features/` | Focused end-to-end integration fixes within owning features. |
| `packages/contracts/ and packages/commerce/` | Only evidence-driven corrections to shared authority. |
| `docs/validation/RTL-020.md` | Unpaid audit results, live evidence metadata, costs and deferred acceptance. |
| `docs/RETAILOR_DEMO_SOURCE_OF_TRUTH.md` | Verified model/rate/runtime decisions and remaining release prerequisites. |

Paths describe future ownership. Create modules/directories only with real behavior; reuse contracts, commands, assets and session state rather than a parallel authority.

## Implementation plan

1. **Freeze an auditable candidate.** Record revision, actual sample/photo/font manifest, dependency lock, model configuration, feature capability flags and relevant limits. Identify incomplete dependency evidence. Audit the final connected flow rather than unrelated repository history. Keep work on unpaid audit and evaluation preparation moving when account or budget evidence is pending.

2. **Prepare safe evaluation tooling.** Make evaluation an explicit command with paid-disabled default, bounded operation inventory and network-denied fixture tests. Use the production validators, grants, image bytes and tool orchestration instead of an unrestricted provider test client. Produce content-free counts, request IDs, durations, outcome categories and cost/usage metadata. Do not commit visitor uploads, chat bodies, raw provider output or secrets.

3. **Review the exact paid plan.** Define concrete cases and a maximum call count per capability within the existing workspace limits, including the optional logo batch. Account for retries and stop on unauthorized model, exceeded budget, unexpected provider behavior or unsupported retention settings. Estimate from current official model/account evidence at execution. Obtain any missing authorization only after this plan and harness are reviewable; avoid importing a sibling demo's numeric quota or paid permission.

4. **Evaluate real catalogue drafting.** Run an authorized live sample batch and a materially different real uploaded-clothing case where the approved budget allows. Submit real decoded bytes, not filenames or a completed sample catalogue. Inspect garment categories, descriptive claims, price draft clarity, variants and photo associations. Include ambiguous clothing and missing/unreliable details; user review must remain necessary and useful. Record failures and whether hard validators correctly reject them.

5. **Evaluate useful grounded Tailor.** Exercise shopper filtering, an EUR budget request, a catalogue summary, owner profit/loss explanation and a contextual tour. Check tool arguments and the final text against canonical facts and visible state. Include vague requests, unsupported actions and product text containing adversarial instructions. Confirm shopper role cannot execute owner commands and a dashboard summary names its selected scenario/period and synthetic basis.

6. **Evaluate reviewed operations.** Create a clothing product through the real inline upload/form path, edit a field before a delayed model result, propose an order or expense and test a destructive ambiguous request. Verify mandatory photo bytes, stable identity, current revisions, explicit confirmation and shared receipt handling. Paid output may propose a typed draft; it cannot bypass the same command validators used by manual controls.

7. **Evaluate optional logos within scope.** If explicitly included in the authorized run, confirm palette/type/name revision gating, one three-candidate batch, safe output decoding and cache limits. Inspect legibility with the chosen fonts and actual storefront sizes. Verify wordmark behavior on skip/failure and no automatic regeneration after edits. A configured provider or a fixture PNG does not count as real generated-logo acceptance.

8. **Verify the real EUR source.** Confirm the selected official API endpoint, current response schema, provider identification and licensing/attribution requirements. Execute a bounded request through the backend quote adapter. Check source date, base/direction, freshness and exact rational conversion against a known amount. Record rate-service failure and USD fallback separately from paid AI evaluations; never fabricate a current quote.

9. **Audit release boundaries and repair findings.** Review request admission order, grants, exact image association, stream/body caps, logging redaction, public live/fake separation, command invariants, negative dashboard calculations and lifecycle cleanup. Inspect tests for meaningful failure coverage and stale assumptions. Apply scoped fixes, rerun affected focused checks, then settled root gates; repeat paid cases only when a change, failure or unresolved concern justifies it and authorization still covers the repeat.

10. **Issue a truthful release verdict.** Separate passed local behavior, actual live catalogue/text/logo evidence, actual FX evidence and hosted prerequisites. Record configured models, dates, durations, usage, cost calculation basis and limitations without sensitive payloads. A required live capability stays unavailable and the public release remains unaccepted while its evidence is pending or failing. Hand RTL-022 an exact candidate and known constraints, not a fabricated Complete status.

## Acceptance criteria — required local outcome

- [ ] An explicit bounded evaluation plan and harness exist before any paid operation; default checks remain network-denied and paid-off.
- [ ] The release audit covers connected domain, UI, provider, privacy and lifecycle boundaries with scoped findings and fixes.
- [ ] Actual sample photos and provenance are present; the public sample path demonstrably submits those photos for fresh recognition.
- [ ] Live catalogue and Tailor case evidence is recorded when authorized; unavailable external checks are individually marked pending.
- [ ] Reviewed photo CRUD and owner/shopper permissions remain enforced during real or fixture-delayed provider output.
- [ ] Optional logo generation has separate actual evidence or is explicitly unavailable/pending with a usable wordmark path.
- [ ] The real rate endpoint/schema/source date are verified or EUR remains unavailable; canonical USD behavior is complete.
- [ ] Timing, usage and spend evidence distinguishes measured results from estimates and does not expose private content.
- [ ] Every discovered blocking release issue is fixed and checked or blocks the public release verdict.
- [ ] A candidate revision, settled root checks and precise live/hosted prerequisite handoff are recorded without false completion.

## Focused verification and evidence

| Case | Required observable evidence |
| --- | --- |
| Paid-off safety | Ordinary unit/root checks make zero paid requests; explicit evaluation stops without valid authorization/configuration. |
| Fresh sample | Actual fifteen-photo bytes and request metadata demonstrate recognition rather than loading a canned catalogue. |
| Recognition uncertainty | Ambiguous garments and unsupported claims remain reviewable or are rejected without silent invention. |
| Grounded conversation | Catalogue/filter/summary/tour tool results match visible facts and role scopes, including EUR budgets. |
| Inline operations | Real photo requirement, dirty-field preservation, stale-revision rejection and confirmation survive delayed replies. |
| Logo optionality | Actual authorized three-candidate output or an explicit pending capability; skip/error keeps the wordmark. |
| Rate verification | Official current endpoint/schema and dated quote evidence, exact conversion and unavailable-source fallback. |
| Audit and verdict | Focused repairs, settled checks, content-free usage/cost metadata and independently listed external acceptance. |

Run meaningful focused tests during iteration. At the settled implementation snapshot run the applicable root gates established by RTL-001: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm check:boundaries`, `pnpm test:unit` and `pnpm build`. Record actual commands/results and revision. UI acceptance needs real browser observations where available; DOM simulations or animation declarations alone do not prove appearance/movement. Do not add tests that merely mirror CSS or static labels.

## External evidence and scope limits

Paid catalogue, Tailor and optional image generation require current account capability, validated environment credentials, a concrete owner-authorized operation budget and accepted data-handling configuration. Complete unpaid preparation and audit first. Live evidence may be deferred with exact prerequisites, but deferred checks cannot be reported as passed or silently replaced with fixtures. External FX verification requires the actual public source; hosted behavior belongs to RTL-022.

Do not add recurring paid evaluations, make a broad model benchmark, relax admission to collect better results, store provider transcripts in Git or invent a universal accuracy score from a few cases. Retention/account settings are evidence to verify, not assumptions or promises. Git staging/committing, cloud deployment and domain changes are outside this packet unless separately included in the user's actual execution authorization. RTL-021 can prepare packaging before this live gate; RTL-022 cannot claim release acceptance without the required live evidence.

## Precision references

- [7. Photo selection, preview and handling](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#7-photo-selection-preview-and-handling)
- [8. Catalogue recognition and review](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#8-catalogue-recognition-and-review)
- [9. Storefront and product experience](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#9-storefront-and-product-experience)
- [13. Commerce domain and exact calculations](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#13-commerce-domain-and-exact-calculations)
- [15. AI capabilities and assistant behavior](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#15-ai-capabilities-and-assistant-behavior)
- [19. Data contracts and API](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#19-data-contracts-and-api)
- [20. Provider integration and evaluation](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#20-provider-integration-and-evaluation)
- [22. Security, admission and privacy](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#22-security-admission-and-privacy)
- [23. Resource limits and cost control](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#23-resource-limits-and-cost-control)
- [25. Verification and evidence](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#25-verification-and-evidence)
- [29. Decisions to settle during implementation](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#29-decisions-to-settle-during-implementation)
- [30. Definition of complete](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#30-definition-of-complete)

## Completion handoff and commit boundary

Keep this outcome under `RTL-020:`; adjacent cohesive commits may be planned when useful. At execution write file allocations under `docs/commit-plans/RTL-020.md` and actual check/review evidence under `docs/validation/RTL-020.md`. These are future records, not fabricated by this planning pass.

Report files, delivered behavior, settled checks, browser/device observations, deviations and every deferred external check with its prerequisite. Update owning documentation and queue status together. All boxes are currently unchecked. Ticket creation does not implement the feature, authorize Git mutations, start services, call paid runtime providers or publish cloud resources. Follow the user’s actual execution authorization when work starts.
