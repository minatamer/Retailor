# RTL-095 — improve the demo tour

Status: **Implemented and locally validated. Existing strict Linux source-proof failure/external acceptance remain pending.**

Latest owner feedback: blur everything outside the selected rectangle; make the guide detailed enough to teach Home, Collection, Product, dashboard access, personalization and reset; start automatically on the first preview after processing; draw the rectangle only once scrolling reaches the intended part.

Acceptance:

1. The initial accepted catalogue preview automatically starts a useful, skippable multi-page orientation. It visits the actual Home, Collection and Product pages instead of silently dropping unmounted steps.
2. Explain how Tailor personalizes layouts, colour, type, branding and hero photos, and how to finish setup. Explain dashboard availability honestly during preview; a first accepted-store continuation highlights the real dashboard link, Personalize and Reset controls.
3. Outside-only blur, readable responsive guide, visible progress, Back/Next/Skip/Done, keyboard focus and Escape, with manual replay. Smooth scrolling retains designed motion, with no rectangle while moving or offscreen.
4. One session owns navigation and tour state; first-run markers restore without repeatedly interrupting and reset with the demo. Keep graph/design/photo/commerce and existing async fences intact. Finite authored targets, cleaned-up observers/frames/timers, no provider-defined selectors.
5. Meaningful lifecycle/geometry regressions, actual laptop/phone and template checks, settled read-only review and all six repository gates. Preserve earlier unstaged work; no staging, commits or external actions.

Precision: [file allocation](../commit-plans/RTL-095.md), existing session controller/projection, assistant tour/targets/layout, shared Storefront and WorkspaceFlow. RTL-023 quality/security dispositions remain binding; the current strict Linux source-proof mismatch remains an explicit validation limitation.

[Actual validation](../validation/RTL-095.md): fresh automatic phone preview, eight-step preview/four-step first-store continuation, actual three-page targets across all three templates at laptop/phone, dashboard route, replay/restore, keyboard/resize and retained owner tour. Settled read-only review has no actionable findings. Focused20/20, five code/build gates pass;594/595 full units retain only the existing source-proof mismatch. Earlier unstaged work remains preserved; no staging, commits or external actions.
