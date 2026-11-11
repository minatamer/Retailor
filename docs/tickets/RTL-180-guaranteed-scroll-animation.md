# RTL-180 — Animate sample scrolling explicitly

11 November 2026. Owner reports RTL-179 jumps immediately and explicitly requires visible animation, with no setting that disables motion. Preserve the56 prior changed paths, empty index and HEAD `e44423059932d7c6b9584381e529fa36aa92e78e`.

## Acceptance

1. Replace the sample's browser-native-only smooth request with an explicit800ms eased frame animation. Keep the24px destination clearance, accepted-sample/loading/cancel/stage fences and no automatic AI action.
2. Reuse the landing page's existing bounded frame-animation approach through one shared UI primitive with real landing/sample consumers. Preserve the landing's authored450–900ms duration, link/hash/focus behavior and input interruption. At most one animation/frame per owner; replacement, wheel/touch/pointer/key navigation and unmount cancel safely. Late callbacks must not resume cancelled work. Clamp duration to a finite positive range; no zero-duration/off setting or OS-preference branch.
3. Inspect app source/config for motion-disabling flags or reduced-motion overrides; remove any global suppression actually found. Do not invent a removed setting or change machine-wide preferences. Keep the permanent repository no-disable rule and require intermediate-frame evidence for guaranteed scrolling.
4. Meaningful frame/timing/cancellation tests and actual in-app desktop/phone motion evidence with multiple intermediate scroll positions, not only endpoint screenshots. Exercise repeat/cancel/restore and landing reuse where locally possible. All six gates, settled read-only review and actual evidence in `docs/validation/RTL-180.md`.

Precision: root/frontend AGENTS.md; existing `landing/section-navigation.tsx` explicit animation; RTL-179 scoped sample intent/ref and snapshot guards; current Next use-client guidance. No controller/API/credential/dependency change, animation-off flag, paid call, publication, staging or commit.

Status: implemented and locally validated. Actual desktop/narrow pointer and keyboard traces show intermediate animated positions, plus input cancellation, loading cancellation, restore and landing focus checks. Nine new timing/cancellation tests and all six gates pass:865/865 tests across125 files. Permanent no-disable rule strengthened in `AGENTS.md`. [Actual evidence](../validation/RTL-180.md). RTL-179 endpoint checks are not inherited as proof of animated movement. Nothing staged or committed.
