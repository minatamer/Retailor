# Retailor repository instructions

Read the selected ticket fully and its precision references. Latest owner instructions outrank historical source documents and sibling rules. RTL-001–022 independent local work is recorded; external release acceptance remains pending. On 13 October the owner approved all RTL-023 documented security remedies in an execute/validate loop and ticket-prefixed commits, after the committed quality audit and manual security review. This supplies no API keys, paid-provider budget, delegation, cloud mutation or publication authorization.

## Architecture

- pnpm workspace; Node 24; strict ESM TypeScript; Next/React frontend; Express backend.
- `packages/contracts` owns narrow browser-safe public schemas. `packages/commerce` owns pure exact financial/domain rules. Apps import public package subpaths; no app-to-app imports, source aliases or catch-all utilities.
- Frontend feature state is owned by one bounded session controller. API routes forward fixed operations only; server identity/configuration stays in `server/` and `.server.ts` files.
- Backend factory imports are inert; explicit startup alone loads app-local environment and listens. Providers are injected and live failure never selects a fake provider.
- Clothing only. Every product needs a validated available photo. Public sample photos require fresh live recognition; fixture output is development-only.
- Preserve designed motion. No animation-off/render-off setting or OS-based suppression. Keep keyboard/touch/focus use clear and avoid flashing.

## Execution and validation

Implement one ticket at a time. Create a file-level allocation in `docs/commit-plans/RTL-###.md` before substantial edits. Validate the settled diff against the complete ticket without editing during the review; independently verify findings, then fix and revalidate until no new actionable findings remain. Missing-key/paid/hosted checks stay explicitly pending and do not block independent local implementation. Do not silently waive required local behavior.

Use focused meaningful tests during iteration; run applicable settled gates: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm check:boundaries`, `pnpm test:unit`, `pnpm build`. Record actual commands, environment and read-only validation pass results in `docs/validation/RTL-###.md`. Never claim browser quality, live provider results, Linux images or hosted checks from simulations alone. Update ticket/index status from actual evidence. Do not delegate or create other chats without explicit authorization.

## Local operation and privacy

Use dedicated Retailor ports: frontend 4310, backend 4311. Check ownership/listeners first; never stop an unrelated service, take its port, modify sibling files or kill processes by executable name. Normal app `.env.local` files are ignored; `.env.example` contains fake/paid-off defaults and blank secrets. Do not read sibling secrets. Health/config must dispatch no paid requests. Tests force paid-off and deny external networking. Frontend dev output `.next-dev` is separate from production `.next`.

Stage explicit ticket-owned paths only after a clean validation result; inspect staged diff for secrets and generated artifacts. Use `RTL-###: concrete change` subjects and cohesive commits per file-level plan. Do not push, deploy, buy resources or call paid APIs without applicable owner authorization. Prepare all concrete local release files while keys/cloud access are pending.

## Preserve completed audits during future edits

- Functionality and designed motion outrank reducing line count. Preserve photo requirements, exact commerce rules, session/restore/reset fences, chat-led styles, optional logos, tours, currency and connected owner/customer views. Use actual changed-path and responsive checks for manual visual revisions; do not inherit same-build acceptance after changing app inputs.
- Keep every existing backend/operator log. New diagnostic events stay private and content-free, correlated by fixed operation/code/request reference/source location. Never forward unknown exception/provider/schema text to visitor UI or add application technical browser-console logging. Helpful source-controlled validation is allowed. Do not suppress global console/framework logs or introduce public telemetry to hide faults.
- Keep narrow public contracts, pure financial authority, fixed server operations and one session state owner. Extract behavior when real consumers share it; prove runtime/import/worker/framework reachability before deletion. Retain intentional public types, development references, dynamic CSS and logs. Avoid cosmetic mass rewrites or extra dependencies.
- Preserve named byte/count/work/queue bounds, deadlines, cancellation, cleanup, late-response/revision fencing and shared concurrency. Test real boundary/failure behavior, not implementation shape. Keep factory imports inert and live failure distinct from development fixtures.
- Read RTL-023 quality and approved security dispositions before changing an affected boundary. Preserve executed/validated controls; reopen an intentional tradeoff explicitly instead of silently weakening it. The owner has authorized security-document commits after clean local validation; new remedies outside that approval still require their own applicable scope.
- Preserve HMAC/boot/expiry classification and bounded unknown/issued/per-identity arrival and active limits. A shape, role, workspace label, raw address or forwarding header is not trusted fairness identity. Keep initial-visitor/edge and cross-process/account limits explicit; no limit removal, background queue or hidden retries.
- Public origin protection belongs to the server-only seal check and trusted edge overwrite. Never expose/forward/log its secret, exempt a public health route, move 19-MiB uploads into Proxy body cloning, or add a new API/server action that bypasses the guard. Frontend guarded startup uses TCP; actual edge/origin/normal-flow checks remain required.
- Release security evidence is non-secret metadata bound to the current fingerprint/image pair and date, never independent verification or deployment permission. Keep public/paid gates closed without actual external cutoff/overlap/outstanding-cost and ingress evidence. Refresh relevant Linux/scanner proof after base/app inputs change; retain unpatched advisory applicability honestly.
