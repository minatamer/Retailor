# RTL-027 — fix reset and sample lifecycle

Owner request, 14 October 2026: investigate Reset demo thoroughly and fix the case where loading the 15-photo sample after reset reports “These exact photo bytes are already here. Kept one copy.” The supplied screenshot is evidence of the reported symptom, not proof of its cause.

Preserve the pending RTL-026 visual changes and all other work. No staging/commits, paid providers, cloud actions, new dependencies or delegation are authorized.

## Required behavior

- Confirmed Reset returns to an empty, usable photo-selection workspace with a fresh identity and fixed lifetime, no prior catalogue/design/commerce/assistant/logo/currency state and no stale selection notices.
- Loading the same sample after a successful reset accepts each of its 15 photos exactly once, without stale duplicate warnings. Repeated reset/sample cycles and refresh after reset remain correct.
- Reset during sample loading, decoding, cache persistence, catalogue processing or recovery cancels/fences retiring work. Late completion cannot mutate the new workspace, replace its resources or leave the UI stuck.
- Photo/logo cache cleanup and object URL/timer/lease cleanup stay scoped to the owning workspace. Preserve other tabs, public sample assets, real duplicate detection within a workspace, all byte/count/work limits and honest cleanup-failure reporting.
- The actual confirmation and cancel paths work with keyboard input and at desktop/mobile widths. Existing error/operator logging and the one canonical session controller remain intact.

## Precision references

- Owner screenshot and current `apps/frontend/src/features/demo/workspace.tsx` reset dialog.
- `apps/frontend/src/features/session/controller.ts`, `context.tsx` and existing controller/projection/export tests.
- `apps/frontend/src/features/photos/controller.ts`, `cache.ts`, `sample.ts` and existing controller/cache/capacity tests.
- [Lifecycle resource inventory](../engineering/LIFECYCLE.md), especially scoped cleanup, fixed expiry and late-result fencing; [RTL-016 lifecycle outcome](RTL-016-complete-export-reset-expiry-and-session-lifecycle.md), required reset/recovery behavior and local verification.
- [RTL-023 quality dispositions](../audits/RTL-023-CODE-QUALITY.md) and [approved security dispositions](../audits/RTL-023-SECURITY.md): preserve the executed session/cache/worker/error/privacy controls; no paid/ingress/admission policy changes.
- Repository and frontend `AGENTS.md`, plus installed framework documentation for any changed React/Next UI convention.

## Verification and status

Reproduce the actual UI path before fixing; add meaningful regression coverage for each confirmed cause and check real cache/URL/identity outcomes. Run focused lifecycle tests during iteration, then the six applicable root gates and a settled read-only complete-ticket review. Keep the already-known exact-source Linux/scanner proof gap explicit; never weaken that check or claim old images prove new bytes. Record actual browser observations separately from injected unit tests.

Status: reset interruption and repeated-sample fixes implemented; eight new regression cases, 89 focused lifecycle tests and actual responsive browser paths pass. Format, lint, typecheck, boundaries and build pass. Full unit suite: 388/389 pass; only the pre-existing strict current-source/Linux-proof mismatch fails. Current-source Linux/scanner refresh remains pending, so this is no all-green release-candidate claim. No staging or commit. [File allocation](../commit-plans/RTL-027.md); [actual validation](../validation/RTL-027.md).

Initial actual browser findings: confirmed reset clears 15 selected photos and all duplicate notices, and the next sample load succeeds with 15 photos. Repeating sample selection without reset produces exactly the 15 duplicate notices in the owner's screenshot. Make deliberate sample reuse idempotent while retaining genuine duplicate warnings for manual uploads. Source inspection also finds projection invalidation occurs only after asynchronous cache clearing; regression coverage must check a document interrupted during that window cannot restore the retiring collection.

Confirmed dispositions: the interruption regression fails before the fix by restoring the old workspace identity, then passes after synchronous projection invalidation moves before cleanup's first await. Sample reuse skips already selected/available verified sample hashes and reuses other available cached matches through bounded intake, without replacing visitor photos or hiding manual duplicate/unavailable-photo warnings. Cleanup failure notices are retained even if saving the replacement projection also fails. Existing cancellation, lease/cache namespaces, URL/worker cleanup, fixed expiry and provider gates remain intact.
