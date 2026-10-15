# RTL-107 — welcome and paced tour transitions

Status: **Locally implemented and reviewed.** [Validation](../validation/RTL-107.md) records actual fresh welcomes, Skip/Start/replay, responsive synchronized movement, all creator/owner steps and deferred dashboard navigation. Focused25/25, five code/build gates pass and629/630units pass with only the existing strict Linux source-proof mismatch. Same-location decision and stalled readiness have unit/source evidence; physical/hosted acceptance remains pending. Prior unstaged work is preserved; nothing staged/committed or externally invoked.

Acceptance:

1. On the first tour offer, let the page's document/images/fonts settle and wait another1000ms before showing a centered welcome. Use the tour's existing styling and clear Start tour / Skip tour actions. Skip retains manual replay and existing first-run persistence; Start begins actual step navigation.
2. Show each guided card, outside blur and target rectangle together only after its actual target arrives and geometry settles. Keep a bounded unavailable-target escape instead of trapping the visitor; no visible waiting card at a stale location.
3. For a moved card/rectangle, fade the old presentation away to a clear page before navigation/scroll, then reveal the new presentation after settling. When both placements match, change text without re-blurring/restarting entrance motion.
4. Preserve authored page/dashboard/personalization/reset guidance, session-owned navigation, focus containment/restoration, keyboard/touch use, designed motion, responsive placement, cancellation/cleanup and all unrelated app behavior.
5. Meaningful readiness/navigation/geometry checks, actual fresh welcome/Skip/Start and responsive transitions, settled read-only review and six repository gates with current exact-byte evidence. No staging/commit or external action; strict Linux source-proof and external acceptance stay honest.

Precision: [allocation](../commit-plans/RTL-107.md), [existing guide](RTL-095-demo-tour.md), current assistant tour/layout and session controller, RTL-023 quality/security dispositions, installed Next client/CSS guidance. No persistent schema or provider behavior change is intended.
