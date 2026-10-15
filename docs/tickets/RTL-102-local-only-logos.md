# RTL-102 — remove AI logo generation

Status: **Locally implemented and validated.** Owner explicitly chooses the existing polished local generator as the only logo generator in fake mode and deployed real mode. [Evidence](../validation/RTL-102.md): five passing code/build gates,616/617units with only the existing strict Linux source-proof mismatch, local production-mode signed HTTP/challenge tests, real browser generation/selection/restore and no reachable AI-image adapter. Actual hosted challenge, Linux/image/scanner and external release acceptance remain pending.

Acceptance:

1. Remove the OpenAI logo adapter, model prompt/image transport and all reachable runtime/evaluation enable paths. Catalogue recognition and Tailor chat keep their current AI providers and paid/key/challenge protection.
2. The same local font/mark generator works in fake/live/production without AI credentials or paid enablement. Keep the existing production Turnstile/signing prerequisites, strict raster/context/response bounds, signed exact-context admission with server-issued cookie/boot/expiry checks, finite rates/attempts/operation counts and shared concurrency. No client workspace label substitutes for trusted identity.
3. One deliberate Generate3 action requires no AI provider consent; production retains its existing anti-bot verification. Keep spelling review, actual preview/selection, optional wordmark, two batches and all lifecycle/revision/cache/reset/restore protections. AI operator outages cannot disable local logos. No automatic generation or network model call.
4. Update active docs/evaluation claims and meaningful tests, review the complete settled diff without editing, run six gates and verify real app UI plus local production-mode request paths. Preserve earlier unstaged work and RTL-101 footer. No staging/commit, delegation, paid/cloud/deployment action.

Precision: [allocation](../commit-plans/RTL-102.md), [logo architecture](../engineering/LOGOS.md), RTL-015 retained raster/lifecycle controls, RTL-023 approved security dispositions, RTL-024 paid catalogue/chat policy, [RTL-100 font evidence](../validation/RTL-100.md). Latest owner instruction deliberately supersedes earlier AI-logo/live-only requirements; it does not enable catalogue/chat fixtures in production.
