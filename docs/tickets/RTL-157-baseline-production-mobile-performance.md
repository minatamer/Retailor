# RTL-157 — establish the production-build mobile baseline

Status: **Planned — awaiting owner review and later execution instruction.**\
Planning date: **19 October 2026**\
Depends on: [RTL-156 plan](RTL-156-plan-demo-improvements.md) accepted; current RTL-155 source\
Blocks: RTL-158 and the measured RTL-160 comparison

## Outcome and entry conditions

Establish reproducible local production-build mobile lab evidence before the planned routing/GA4 changes. Investigate actual timing/byte/interaction bottlenecks; source size alone does not identify their impact. No application optimization belongs in this ticket. Read [the complete performance protocol](../engineering/DEMO-IMPROVEMENTS-PLAN.md#3-measure-first-then-make-focused-performance-changes) and the current launch/build instructions.

Before any startup inspect configuration, listeners and PID/command ownership for Retailor 4310/4311. Refuse unrelated ownership; never stop Roomedy, change its ports or inspect its files/secrets. Use normal repo launchers and explicit paid-off overrides. Create `docs/commit-plans/RTL-157.md` before substantive work, including any strictly necessary local measurement helper; no dependency/service platform is assumed.

## File ownership

- `docs/validation/RTL-157.md`: actual versions, commands, build/source identity, paid-off environment description, results, trace conclusions and limitations.
- Ignored `artifacts/local/RTL-157/`: raw Lighthouse reports and Performance traces containing synthetic inputs only.
- Existing `package.json`, `scripts/frontend.mjs`, `scripts/development-mode.mjs`, frontend production build and dev-preview gate are references, not files to rewrite to make the baseline pass.
- Update this ticket/index from actual evidence. Application source changes are out of scope; a discovered functional blocker is documented, not silently repaired here.

## Acceptance and meaningful verification

1. Build the unchanged candidate with `pnpm build`; record commit/actual input identity, build ID, OS/hardware, Node/pnpm, Chrome/Lighthouse and exact configuration. Separate local Windows, any actual Linux and actual GitHub evidence.
2. Run five cold **Mobile / Navigation / Performance** Lighthouse audits each for `/` and empty `/demo` against the production bundle. Save actual throttling/viewport settings. Report median and min/max LCP/CLS/FCP/TBT/Speed Index, resource bytes and request count. Warm runs are separate.
3. Trace actual landing scrolling/CTA. Capture collection/product/variant/cart/owner interactions only with a repeatable test-only local fixture of that production bundle and provider/network denial. Never submit the public sample to AI for a performance run, expose a public fixture shortcut or weaken production fake-mode rejection. Label any development-environment composition; if unavailable, list that evidence as pending with the precise blocker.
4. Identify the actual LCP element, media/font scheduling, JS/hydration/long-task causes and layout shifts. Investigate the existing 2,576,593-byte film and 159,340-byte all-font preload without assuming either is the leading bottleneck. Rank fixes only from traces.
5. Record interaction latency as lab evidence; do not call TBT real-user INP. No claimed visitor p75, score improvement, rankings or conversion gain. Raw reports must exclude visitor photos, secrets and provider/checkout URLs.
6. Document a rerunnable recipe and comparable table schema for RTL-160. Include denied/accepted analytics conditions as future comparison dimensions; GA4 does not yet exist at this baseline.

## Gates and completion

Run `pnpm build` for the baseline plus scoped documentation/helper checks. Apply additional repo gates only if actual source/helper changes justify them; do not run meaningless app tests for unchanged documentation. Review the settled evidence read-only against this complete ticket. A clean build is not a performance result; absent measurement cannot be filled with guessed numbers. Keep missing populated/physical/hosted evidence explicit. No account changes, paid calls, staging/commit/push or deployment is authorized by the planning request.
