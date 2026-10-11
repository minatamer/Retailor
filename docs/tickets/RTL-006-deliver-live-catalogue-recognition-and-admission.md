# RTL-006 — Deliver live catalogue recognition and action-bound admission

Status: **Planned — not started**\
Planning date: **11 October 2026**\
Milestone: **Live drafting**\
Depends on: [RTL-003](RTL-003-prepare-fifteen-clothing-photos-and-upload-pipeline.md), [RTL-005](RTL-005-build-one-page-workspace-review-and-recovery.md)\
Blocks directly: [RTL-013](RTL-013-deliver-grounded-tailor-conversation-tools-and-tours.md), [RTL-015](RTL-015-deliver-optional-three-logo-generation.md), [RTL-018](RTL-018-harden-privacy-abuse-spend-and-runtime-boundaries.md), [RTL-020](RTL-020-evaluate-live-ai-and-audit-release-acceptance.md)\
Suggested commit: `RTL-006: deliver live catalogue recognition and action-bound admission`\
Parent authority: [Retailor blueprint](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md)\
Queue and execution rules: [Ticket index](README.md)

## Outcome and standalone context

Replace the development drafting port with live OpenAI catalogue interpretation for both sample and uploaded clothing photos. The 15-item sample is an actual image input set; every deliberate new draft/rebuild performs fresh live processing. Refreshing an already completed catalogue does not charge again. Live failure preserves photos and offers deliberate retry/change selection, never a canned public catalogue.

Basic admission, privacy and spend boundaries must be complete before a real dispatch exists. RTL-018 later hardens the entire application; it is not permission to expose an unprotected early vision route. The language model drafts names/grouping/categories/description and preserves uncertainty; code validates catalogue relationships and owns money/stock.

## Dependency evidence and entry conditions

RTL-003’s inspected manifests and decoder plus RTL-005’s review/controller must be locally proven. RTL-001 supplies parsed runtime/provider ports and private transport. Build and verify the live adapter with injected clients first; actual provider/account testing remains RTL-020 unless separately authorized. Check current official OpenAI docs for supported image input/strict output options when implementing.

Dependency completion means required local behavior, owning contracts and checks actually exist. A planned checkbox or ticket-named commit alone is insufficient. Verified local dependencies may support local follow-on work while separately recorded live, owner-visual or hosted evidence remains pending. Never turn a fake pass into live acceptance.

## Files and responsibility boundaries

| Area | Responsibility owned here |
| --- | --- |
| `apps/backend/src/catalogue` | Inspection, prompt, use case, output/source reconciliation |
| `apps/backend/src/providers` | Narrow OpenAI Responses adapter and deterministic failures |
| `apps/backend/src/security` | Action-bound challenge/grant/replay/capacity baseline |
| `apps/frontend/src/features/catalogue and server` | Approved request lifecycle and fixed bridge mapping |
| `packages/contracts/src` | Recognition manifest/draft/error/admission shapes |
| `docs/engineering/RECOGNITION.md` | Handling, evaluation and model/cost policy |

Paths describe future ownership. Create modules/directories only with real behavior; reuse contracts, commands, assets and session state rather than a parallel authority.

## Implementation plan

1. **Verify an evaluated provider policy.** Select an image-capable current model provisionally from official docs and measured objectives; isolate model/detail/output settings backend-side. Set store false for Responses, avoid durable conversations/files/background work and configure automatic SDK retries to zero.

2. **Bind the approved action.** Explain derivative transfer before Draft my catalogue. Request a short-lived one-use grant tied to workspace/operation/manifest hash, image count/size/mode and disclosure version. Verify challenge hostname/action server-side; opening previews performs no admission or provider call.

3. **Inspect independently before dispatch.** Stream bounded multipart and compare actual hashes, named parts and metadata. Limit derivatives to 18 MiB and transport to 19 MiB. Re-decode/reencode safely with serial workers and owned deadlines; browser claims/Content-Length are not authority.

4. **Dispatch once within limits.** One model call per approved batch; at most two catalogue attempts/workspace including explicit retry. Use 120-second backend total with proposed 95-second provider subdeadline and 12,000 output-token cap. Enforce one paid operation/workspace and two/process, releasing the correct lease on all terminal paths.

5. **Draft with honest provenance.** Treat embedded image/label/filename text as untrusted source, not policy. Require strict output, source coverage and finite garment categories. Visual grouping/material/fit ambiguity stays reviewable; photo appearance does not reveal unit cost, actual size range or sales history.

6. **Reconcile against actual input.** Reject invented source IDs, duplicate/dangling product IDs, missing photos, non-clothing certainty and unsupported claims. Require complete disposition per accepted input. Handle refusal, incomplete/truncated output and schema error explicitly; never repair via a hidden second paid call.

7. **Integrate continuous feedback.** Checking photos, Drafting products, Validating catalogue and Preparing preview reflect real transitions. Preserve selection on failure/cancel. Respect current controller identity/input revision and prevent a late response overwriting user edits or entering a replacement workspace.

8. **Keep live and fake truth separate.** The public live sample routes through this same adapter. Test fixtures are isolated declared development data and cannot be selected on failure. A successful completed store retains local operations during a later outage; unavailable vision blocks only new drafting.

9. **Sanitize errors and counters.** Map safe categories without raw provider payload/messages or billing details in the UI/log. Hold conservative reservation after unknown timeout/cancel. Replay IDs never dispatch again; a new approved retry uses a new identity and remains within cap.

10. **Provide a real evaluation seam.** Prepare independent actual-image expectations for grouping/source coverage, ambiguity and unsupported facts. Record injected contract/timeout/replay evidence now; RTL-020 measures actual quality/latency/cost rather than marking it passed because fake output parses.

## Acceptance criteria — required local outcome

- [ ] Sample and uploads use one production live-recognition path.
- [ ] Protected paid dispatch occurs only after validated action-bound admission.
- [ ] Actual derivative hashes/bytes/counts and multipart caps are independently enforced.
- [ ] Every attempt makes at most one model call with zero automatic retries.
- [ ] Output/source relationships and mandatory product photos are reconciled before review.
- [ ] Unknown/unsupported facts and non-clothing inputs are handled honestly.
- [ ] Failures retain usable photos without generic or prepared public success.
- [ ] Stale/reset/cancel outcomes cannot apply and replay cannot charge twice.
- [ ] Capabilities/log/errors expose only safe truthful information.

## Focused verification and evidence

| Case | Required observable evidence |
| --- | --- |
| Sample/upload adapter parity | Same use case receives actual inspected derivative manifests |
| Pre-dispatch rejection matrix | Bad challenge/host/action/hash/count/grant yields zero provider calls |
| Output coverage | Invented sources, missing products and truncated/refused schema rejected |
| Timeout/duplicate/cancel | One dispatch at most, conservative unknown outcome, stale result fenced |
| Live unavailable | Photos stay; no fixture adapter or public precomputed fallback |
| Embedded instruction attack | Source remains data; no policy/action authority |
| Worst-case batch | 15 and 24-photo inputs fit measured transport/output/deadline envelope |

Run meaningful focused tests during iteration. At the settled implementation snapshot run the applicable root gates established by RTL-001: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm check:boundaries`, `pnpm test:unit` and `pnpm build`. Record actual commands/results and revision. UI acceptance needs real browser observations where available; DOM simulations or animation declarations alone do not prove appearance/movement. Do not add tests that merely mirror CSS or static labels.

## External evidence and scope limits

Injected tests complete local adapter/admission behavior. Actual image quality, account capability, retention settings, token/latency/usage and approved spend are separate RTL-020 evidence. Do not run paid calls merely because this ticket has been written or because a key happens to exist.

No file library, server upload cache, automatic repair/retry, model-generated executable code or fallback provider. A new product can be saved manually with a validated photo; optional description assistance uses this bounded attempt budget, not a hidden route. Any measured cap change must update owning contracts/blueprint before release.

## Precision references

- [5. Canonical visitor journey](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#5-canonical-visitor-journey)
- [7. Photo selection, preview and handling](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#7-photo-selection-preview-and-handling)
- [8. Catalogue recognition and review](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#8-catalogue-recognition-and-review)
- [15. AI capabilities and assistant behavior](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#15-ai-capabilities-and-assistant-behavior)
- [19. Data contracts and API](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#19-data-contracts-and-api)
- [20. Provider integration and evaluation](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#20-provider-integration-and-evaluation)
- [21. Configuration and local operation](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#21-configuration-and-local-operation)
- [22. Security, admission and privacy](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#22-security-admission-and-privacy)
- [23. Resource limits and cost control](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#23-resource-limits-and-cost-control)
- [25. Verification and evidence](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#25-verification-and-evidence)

## Completion handoff and commit boundary

Keep this outcome under `RTL-006:`; adjacent cohesive commits may be planned when useful. At execution write file allocations under `docs/commit-plans/RTL-006.md` and actual check/review evidence under `docs/validation/RTL-006.md`. These are future records, not fabricated by this planning pass.

Report files, delivered behavior, settled checks, browser/device observations, deviations and every deferred external check with its prerequisite. Update owning documentation and queue status together. All boxes are currently unchecked. Ticket creation does not implement the feature, authorize Git mutations, start services, call paid runtime providers or publish cloud resources. Follow the user’s actual execution authorization when work starts.
