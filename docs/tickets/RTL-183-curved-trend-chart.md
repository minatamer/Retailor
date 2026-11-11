# RTL-183 — Smooth dashboard trend curves

11 November 2026. Owner requests replacing the pictured sharp line/vertex graph with curves. Preserve all prior WIP, HEAD `e44423059932d7c6b9584381e529fa36aa92e78e` and empty index. No data, metric, provider, port, dependency, account, staging/commit or release change.

## Acceptance

1. Replace trend stroke and filled area with a smooth, shape-preserving cubic curve through the exact recorded coordinates. Do not introduce overshoot, false negative troughs or invented extrema. Flat/zero runs and negative operating results remain accurate. Handle the existing padded duplicate endpoints without division by zero.
2. Preserve bounded 32-point geometry and the existing 550ms entry/400ms period/series animation. Curve geometry is used on initial render and every frame; replacement/unmount must not revive stale work. Preserve exact facts, tooltips, observation controls, keyboard, period/series switching and evidence.
3. Remove the dense idle vertex dots; show only the current hover/focus/pinned observation marker when needed. Keep the existing palette/fill and straight zero-baseline reference. Remove obsolete straight-segment wording.
4. Meaningful geometric interpolation tests and actual Codex in-app desktop/phone checks for Net sales/Operating profit, 7/28/All time, flat and signed sections, motion and exact hover/evidence. Run all six gates and settled read-only validation; document actual results and external limits.

Precision: root/frontend AGENTS.md, current dashboard chart geometry/motion, RTL-181 counters and RTL-182 full-scope intervals, local Next use-client guide. Preserve pure commerce and bounded controller authority; no animation-disable or OS suppression setting.

Status: implemented; actual desktop/phone, focused geometry and five code/build gates pass. Both full unit runs are 884/888 with five-second timeout-only failures; all 16 cases in affected files pass an explicit longer-budget diagnostic. Strict default-suite timing acceptance remains pending. [Actual validation](../validation/RTL-183.md) records the review, commands and evidence. Nothing staged or committed.
