# RTL-186 — Responsive dashboard tabs and a simpler trend panel

11 November 2026. Owner requests removing the pictured trend title/subtitle and fixing delayed data when switching tabs. Owner clarified that the lag is in dashboard 7-day/28-day/All time and Net sales/Operating profit controls, not landing-page layout tabs. Preserve all previous WIP and HEAD `e44423059932d7c6b9584381e529fa36aa92e78e`; no staging/commit, new dependency/service/port or paid/external action.

## Acceptance

1. Remove the visible trend heading, subtitle and its decorative heading arrow, while retaining a meaningful accessible chart identity, controls, exact values/table/evidence, zero reference, curves and motion. Keep other chart panels' headings.
2. Measure and identify synchronous work delaying dashboard period/series changes. Fix its actual cause without reducing data coverage, removing validation/security/limits, changing financial authority, moving waits into fake loaders or suppressing animations.
3. Keep immutable graph/revision/scenario and restore/reset fences sound. Any validation reuse may trust only a module-owned fully validated and deeply immutable result, never a user label/shape, shallow freeze or external object identity. New/mutated/restored inputs still receive full validation. Any projection reuse must invalidate for actual graph changes and retain finite/weak ownership.
4. Preserve the 7/28/All time exact reconciliation, currency/stock/cost semantics, data bounds, evidence and existing directional number/curve transitions. Verify quick reversals/series changes and changed graph data; compare actual local timing before/after and label measurement limits.
5. Run meaningful domain/cache/invalidation regressions, actual Codex in-app desktop/phone checks, six root gates and settled read-only review. Record actual performance evidence and pending external limits. No landing-page changes are required after the owner's clarification.

Precision: root/frontend instructions and installed Next use-client guidance; RTL-181/182/183 motion/history; RTL-023 quality/security preservation; pure commerce graph validation/facts and dashboard/session persistence ownership.

Status: locally implemented and reviewed. Focused32/32 and five root code/build gates pass; desktop/390px/320px controls, animation, reversal, restore and exact evidence checked in Codex's in-app browser. Full suite887/893 retains six timeout-only failures; five repeat in isolated one-worker diagnostics under the original limits. Strict suite timing acceptance remains pending. [Actual validation and measurement limits](../validation/RTL-186.md). Nothing staged or committed.
