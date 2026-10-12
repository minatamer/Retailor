# RTL-015 — Deliver optional three-logo generation after styling

Status: **Locally implemented — paid/account and final device/owner evidence pending**\
Planning date: **11 October 2026**\
Milestone: **Optional identity path**\
Depends on: [RTL-006](RTL-006-deliver-live-catalogue-recognition-and-admission.md), [RTL-008](RTL-008-deliver-tailor-chat-led-styling-and-owner-overrides.md), [RTL-013](RTL-013-deliver-grounded-tailor-conversation-tools-and-tours.md)\
Blocks directly: [RTL-016](RTL-016-complete-export-reset-expiry-and-session-lifecycle.md), [RTL-018](RTL-018-harden-privacy-abuse-spend-and-runtime-boundaries.md), [RTL-019](RTL-019-verify-polish-responsive-motion-and-design-matrix.md), [RTL-020](RTL-020-evaluate-live-ai-and-audit-release-acceptance.md)\
Suggested commit: `RTL-015: deliver optional three-logo generation after styling`\
Parent authority: [Retailor blueprint](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md)\
Queue and execution rules: [Ticket index](README.md)

## Outcome and standalone context

Deliver the optional identity branch: after the creator confirms colour theme and typography, Tailor offers an excellent text wordmark or three original AI logo choices. The offer must never appear on landing/upload/review before styling, and revealing it costs no provider call. A store remains complete if the visitor skips, generation fails or candidate bytes later disappear.

The chosen colour values, typography character and exact bounded store name guide generation. Three separate validated images are required, not a collage of three marks. A raster model cannot be assumed to reproduce the chosen font or store-name spelling perfectly; review actual legibility before accepting a mark. This is the only runtime image-generation branch, separate from offline sample-photo production.

## Dependency evidence and entry conditions

RTL-008 supplies explicit palette/type confirmation state and wordmark rendering; RTL-006 admission/global paid-operation ownership and RTL-013 the shared Tailor action surface must exist. Check current official Image API output/count/transparency options and the selected model/account’s support when implementing. Use injected candidate bytes for deterministic work; actual provider acceptance belongs to RTL-020.

Dependency completion means required local behavior, owning contracts and checks actually exist. A planned checkbox or ticket-named commit alone is insufficient. Verified local dependencies may support local follow-on work while separately recorded live, owner-visual or hosted evidence remains pending. Never turn a fake pass into live acceptance.

## Files and responsibility boundaries

| Area | Responsibility owned here |
| --- | --- |
| `apps/backend/src/brand and providers` | Bounded logo use case and reviewed image-generation adapter |
| `apps/frontend/src/features/store-design and assistants` | Offer, processing, candidate preview/selection and fallback |
| `apps/frontend/src/features/photos or owned asset cache` | Separate logo candidate-byte ownership |
| `packages/contracts/src` | Brand request/candidate/error shapes and bound policies |
| `docs/engineering/LOGOS.md` | Prompt policy, candidate checks, spend and lifecycle evidence |

Paths describe future ownership. Create modules/directories only with real behavior; reuse contracts, commands, assets and session state rather than a parallel authority.

## Implementation plan

1. **Enforce prerequisite state.** Offer only after explicit accepted colour and typography values, including the fast-default confirmation path. Name/headline/hero remains optional. Opening Tailor, viewing type cards or changing preview page cannot dispatch or auto-confirm generation.

2. **Prepare one explicit approved operation.** Generate 3 logos shows sanitized name and chosen design context before action-bound admission. Bind workspace/operation, exact count three, confirmed IDs, name digest, design revision and prompt/output policy. Text-model tools only prepare this finite action; they cannot call image generation directly.

3. **Build a constrained brand prompt.** Resolve accepted palette/type descriptions server-side and request original simple clothing-brand marks with transparent raster background and small-header legibility. No arbitrary user prompt, URL, executable output or third-party brand identity. Exact typography is a direction, not a reproduction guarantee.

4. **Use one reviewed image batch.** Configure current compatible image model/quality/size and request three separate outputs. Cap one initial batch plus one explicit retry/workspace; zero SDK automatic retries. Respect one paid operation/workspace and two/process with conservative reservations for timeout/unknown outcome.

5. **Validate before presenting.** Decode actual supported raster/signature/dimensions, transparency and bytes; inspect exact name spelling/legibility. Reject partial/invalid sets without silently making extra calls. Each final candidate is at most 1 MiB, three retained candidates/3 MiB total; response Base64 envelope at most 4.2 MiB.

6. **Keep transport bounded and transient.** Strict request JSON is at most 64 KiB and accepts finite design context only. Proposed backend total is 180 seconds with 150-second provider subdeadline, bridge/browser 195 and outer hosting headroom. No output bucket/provider file library or durable result URL.

7. **Make choices clearly visual.** Show three candidate cards at useful large and small header sizes with Use this logo/Keep wordmark. Preview chosen mark across all three storefront page headers before accepting. Preserve accessible text name and alternative labels.

8. **Guard stale context.** A changed colour/type/name or relevant design revision makes pending output stale. Never attach an old palette result to the latest look. A prior selected raster may remain an explicitly old choice; offer wordmark rather than silently recolouring image bytes.

9. **Own temporary assets and fallback.** Store candidate metadata in allow-listed projection and actual bytes in browser cache, never sessionStorage Base64. Retry atomically replaces the candidate set after a valid complete result. Missing bytes/cancel/reset/expiry use wordmark and clear owned resources without claiming provider billing/copies were recalled.

10. **Evaluate the actual optional branch.** Test gate, count, response limits, malformed/partial candidates, stale design and paid-off failure with injected clients. The real logo-quality/latency/usage review uses separately approved RTL-020 evidence. Failing optional logos cannot block catalogue/storefront shopping.

## Acceptance criteria — required local outcome

- [x] Offer appears only after explicit palette/type confirmation.
- [x] Wordmark is excellent default/skip/failure/recovery behavior.
- [x] One approved action requests exactly three independent image candidates.
- [x] Only constrained finite brand context reaches the backend/provider.
- [x] Candidate format/bytes/transparency/name legibility are reviewed.
- [x] Per-workspace batch/retry/global capacity/deadline policy is enforced.
- [x] Candidate selection updates actual page headers accessibly.
- [x] Stale design/name/colour/type results never apply.
- [x] Temporary logo bytes restore or fall back safely without a hosted library.
- [x] No automatic generation on reveal/hover/style selection or hidden retry.

## Focused verification and evidence

| Case | Required observable evidence |
| --- | --- |
| Default and type-only state | No offer/call until both confirmations |
| Three-output success | Distinct valid assets and real small-header previews |
| Partial/oversized/invalid raster | Failed batch, wordmark retained, no repair dispatch |
| Change style while pending | Stale candidates discarded from accepted design |
| Double request/retry limit | Correct reservation and bounded dispatch count |
| Missing cache/reset/expiry | Wordmark and owned cleanup; no Base64 projection |
| Actual accessibility | Store name available even with decorative image mark |

Run meaningful focused tests during iteration. At the settled implementation snapshot run the applicable root gates established by RTL-001: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm check:boundaries`, `pnpm test:unit` and `pnpm build`. Record actual commands/results and revision. UI acceptance needs real browser observations where available; DOM simulations or animation declarations alone do not prove appearance/movement. Do not add tests that merely mirror CSS or static labels.

## External evidence and scope limits

Actual model/account/output availability, logo spelling/quality and measured cost/latency need authorized live evidence. Keep local injected acceptance distinct. Do not execute provider operations just because this optional ticket exists.

No unrestricted logo editor/reroll loop, runtime product-photo generation, arbitrary image upload/provider tool or exact-font promise. Planning does not pick a paid model/budget or generate final logos. The branch is optional for the visitor, but its gate and recovery are required first-demo features.

## Precision references

- [5. Canonical visitor journey](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#5-canonical-visitor-journey)
- [9. Storefront and product experience](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#9-storefront-and-product-experience)
- [14. Commands, revision control and proposals](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#14-commands-revision-control-and-proposals)
- [15. AI capabilities and assistant behavior](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#15-ai-capabilities-and-assistant-behavior)
- [16. Guest state, recovery and cleanup](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#16-guest-state-recovery-and-cleanup)
- [19. Data contracts and API](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#19-data-contracts-and-api)
- [20. Provider integration and evaluation](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#20-provider-integration-and-evaluation)
- [22. Security, admission and privacy](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#22-security-admission-and-privacy)
- [23. Resource limits and cost control](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#23-resource-limits-and-cost-control)
- [25. Verification and evidence](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#25-verification-and-evidence)
- [29. Decisions to settle during implementation](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#29-decisions-to-settle-during-implementation)

## Completion handoff and commit boundary

Local completion evidence: [RTL-015 validation](../validation/RTL-015.md), [logo policy](../engineering/LOGOS.md) and [file-level commits](../commit-plans/RTL-015.md). All ten local acceptance items are checked from connected implementation and actual local evidence. Paid/model/account/quality/usage and final physical/owner/hosted prerequisites above remain pending; no provider budget or release authorization is inferred.

Keep this outcome under `RTL-015:`; adjacent cohesive commits may be planned when useful. At execution write file allocations under `docs/commit-plans/RTL-015.md` and actual check/review evidence under `docs/validation/RTL-015.md`. These are future records, not fabricated by this planning pass.

Report files, delivered behavior, settled checks, browser/device observations, deviations and every deferred external check with its prerequisite. Update owning documentation and queue status together. All boxes are currently unchecked. Ticket creation does not implement the feature, authorize Git mutations, start services, call paid runtime providers or publish cloud resources. Follow the user’s actual execution authorization when work starts.
