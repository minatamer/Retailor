# RTL-016 — Complete export, reset, expiry and session recovery

Status: **Planned — not started**\
Planning date: **11 October 2026**\
Milestone: **Lifecycle completion**\
Depends on: [RTL-009](RTL-009-deliver-automatic-usd-eur-storefront-pricing.md), [RTL-011](RTL-011-deliver-three-scenarios-and-owner-operations.md), [RTL-014](RTL-014-deliver-tailor-inline-photo-crud-and-confirmation.md), [RTL-015](RTL-015-deliver-optional-three-logo-generation.md)\
Blocks directly: [RTL-018](RTL-018-harden-privacy-abuse-spend-and-runtime-boundaries.md), [RTL-019](RTL-019-verify-polish-responsive-motion-and-design-matrix.md), [RTL-021](RTL-021-package-linux-services-and-manual-release-runbook.md)\
Suggested commit: `RTL-016: complete export, reset, expiry and session recovery`\
Parent authority: [Retailor blueprint](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md)\
Queue and execution rules: [Ticket index](README.md)

## Outcome and standalone context

Close the full guest lifecycle across photos, catalogue, design, logo, currency, shopping, owner operations and Tailor. The workspace belongs to one browser tab and lasts a fixed two hours from creation. Refresh should recover completed products and imagery without repeating live recognition, logo generation, placement or a chat confirmation. Reset should clear owned local work and fence every late result.

RTL-005 introduced recovery early; this packet integrates all later resources rather than postponing basic cleanup until the end. Deliver a bounded JSON export of structured demo records/facts and accepted design/currency metadata. No hosted store, durable chat library or cross-device account is added. Honest wording distinguishes local cleanup from recalled provider processing or physical erasure guarantees.

## Dependency evidence and entry conditions

RTL-009 supplies FX snapshot, RTL-011 all records/scenario replacement, RTL-014 inline proposals/forms and RTL-015 logo cache. Confirm every feature’s owned controller/timer/URL/cache/receipt behavior. RTL-005’s initial allow-list and tab lease must remain the only recovery authority; do not replace it with serializing the full runtime state.

Dependency completion means required local behavior, owning contracts and checks actually exist. A planned checkbox or ticket-named commit alone is insufficient. Verified local dependencies may support local follow-on work while separately recorded live, owner-visual or hosted evidence remains pending. Never turn a fake pass into live acceptance.

## Files and responsibility boundaries

| Area | Responsibility owned here |
| --- | --- |
| `apps/frontend/src/features/session` | Complete projection/restore/reset/expiry/lease coordination |
| `apps/frontend/src/features/photos and store-design` | Garment/hero/logo byte recovery and fallback |
| `apps/frontend/src/features/assistants and operations` | Finalized histories and inert restored proposal forms |
| `apps/frontend/src/features/demo` | Export/reset/expired UI and truthful handling text |
| `docs/engineering/LIFECYCLE.md` | Resource inventory, cleanup and recovery evidence |

Paths describe future ownership. Create modules/directories only with real behavior; reuse contracts, commands, assets and session state rather than a parallel authority.

## Implementation plan

1. **Inventory every owned resource.** List image decoder workers/bitmaps, object URLs, Blob cache entries, active provider/challenge/FX requests, guidance/animation timers, lease coordination and downloads. Identify one owner and cleanup event for each; neither generic global cleanup nor unrelated-origin deletion is allowed.

2. **Complete the recovery projection.** Keep normalized graph/design/scenario, source metadata, eligible finalized messages, bounded bag/preferences and FX snapshot in strict 2 MiB sessionStorage. Commerce graph stays within 512 KiB. Exclude bytes/Base64, secrets, tokens, controllers, raw provider output and executable pending actions.

3. **Recover garment and logo bytes.** Use owned IndexedDB entries within 40 MiB originals, 24 MiB garment derivatives and 3 MiB logo candidates, with 80 MiB total origin envelope/headroom. Recreate object URLs. Missing garment bytes disable affected purchases and offer repair; missing logo returns to wordmark.

4. **Preserve fixed expiry.** Capture creation time once and check expiry before restore/mutation/dispatch and on suspended-tab return. Refresh never resets the clock. Expired work cannot finish into a new workspace. Validate future timestamps and unsupported versions rather than coercing them.

5. **Fence duplicate writers.** Use atomic lease/runtime tab identity and bounded coordination. Duplicate tab can start fresh or fork an eligible snapshot with new ownership, within cache bounds. Never steal an active lease or sweep another tab’s valid bytes to admit a new workspace.

6. **Implement complete Reset.** Abort/cancel owned operations, invalidate generation, clear local projection and owned photo/logo/currency state, revoke URLs/timers and return to clean selection. Recheck stale callback application after every asynchronous boundary. Provider-dispatched work and downloaded exports cannot be recalled.

7. **Make restore interruption explicit.** Keep completed draft/store/order/accepted look and finalized chat when valid. Pending provider calls, animated field fill, tours and confirmations do not auto-run. Explain an interrupted unknown provider outcome; a new paid attempt requires deliberate action and existing budget.

8. **Deliver useful bounded export.** Download one JSON snapshot with schema/version, catalogue/provenance, exact USD records, scenario origin, accepted design/brand metadata, selected scope/fact definitions and dated currency metadata. Exclude image bytes, full chat by default, grants/tokens, secret config and pending executable proposals.

9. **Handle corrupt/quota/cache limits.** Validate relationships and size before write/restore; failed writes preserve live in-memory work with useful notice. Sweep expired owned remnant cache lazily at startup/admission without clearing retained public sample assets or active other-tab data. No promise of immediate physical deletion on browser close.

10. **Verify lifecycle across full flows.** Refresh selection/review/style/store/dashboard/success, then interrupt processing/logo/chat/tour/form/checkout/reset/scenario replacement. Inspect actual browser storage and leaks plus deterministic fake-clock tests. Record missing physical browser-close evidence honestly.

## Acceptance criteria — required local outcome

- [ ] One strict bounded projection recovers all eligible completed state.
- [ ] Fixed two-hour expiry survives refresh and suspended-tab return correctly.
- [ ] No refresh automatically repeats paid calls, orders or executable proposals.
- [ ] Photos/logos recover or use the required honest repair/wordmark paths.
- [ ] Reset cleans owned resources and late results cannot enter new identity.
- [ ] Duplicate-tab/cache admission preserves other active owners.
- [ ] Quota/corrupt/version failures keep safe usable work and useful notices.
- [ ] Export contains correct structured facts/design/currency and excludes forbidden data.
- [ ] Handling copy accurately describes local/provider/download boundaries.

## Focused verification and evidence

| Case | Required observable evidence |
| --- | --- |
| Refresh matrix | Each completed stage recovers with zero automatic dispatch |
| Reset during each async feature | No leaked callback, URL, timer or new-session mutation |
| Missing photo versus logo | Purchase repair versus wordmark fallback, never photo-free creation |
| Fake clock expiry | Fixed deadline before restore/mutation/send and after suspension |
| Two tabs at cache limit | No lease theft or deletion of active other-tab bytes |
| Corrupt/oversized/quota projection | Safe notice, no unsafe coercion or hidden truncation |
| Export inspection | Exact records and selected metadata; no images/secrets/grants/raw chats |

Run meaningful focused tests during iteration. At the settled implementation snapshot run the applicable root gates established by RTL-001: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm check:boundaries`, `pnpm test:unit` and `pnpm build`. Record actual commands/results and revision. UI acceptance needs real browser observations where available; DOM simulations or animation declarations alone do not prove appearance/movement. Do not add tests that merely mirror CSS or static labels.

## External evidence and scope limits

Browser/device quota and close behavior varies; record actual tested environments. Physical memory erasure and deletion of provider copies are not acceptance promises. Live interrupted outcomes are measured only under an authorized provider window.

No account/localStorage merchant library, server session/bucket, ZIP asset export, cross-device restore or generic import editor. Do not call provider cancellation proof of zero billing. No deleted cache is claimed to be physically unrecoverable. Keep public sample assets separate from disposable guest ownership.

## Precision references

- [6. Routes, shell and navigation](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#6-routes-shell-and-navigation)
- [14. Commands, revision control and proposals](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#14-commands-revision-control-and-proposals)
- [15. AI capabilities and assistant behavior](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#15-ai-capabilities-and-assistant-behavior)
- [16. Guest state, recovery and cleanup](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#16-guest-state-recovery-and-cleanup)
- [19. Data contracts and API](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#19-data-contracts-and-api)
- [22. Security, admission and privacy](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#22-security-admission-and-privacy)
- [23. Resource limits and cost control](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#23-resource-limits-and-cost-control)
- [25. Verification and evidence](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#25-verification-and-evidence)

## Completion handoff and commit boundary

Keep this outcome under `RTL-016:`; adjacent cohesive commits may be planned when useful. At execution write file allocations under `docs/commit-plans/RTL-016.md` and actual check/review evidence under `docs/validation/RTL-016.md`. These are future records, not fabricated by this planning pass.

Report files, delivered behavior, settled checks, browser/device observations, deviations and every deferred external check with its prerequisite. Update owning documentation and queue status together. All boxes are currently unchecked. Ticket creation does not implement the feature, authorize Git mutations, start services, call paid runtime providers or publish cloud resources. Follow the user’s actual execution authorization when work starts.
