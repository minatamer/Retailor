# Retailor repository instructions

Read the selected ticket fully and its precision references. Latest owner instructions outrank historical source documents and sibling rules. Current execution authorization covers all 22 tickets in an execute/validate loop, fake-mode implementation, local release preparation and ticket-prefixed staging/commits after validation. It supplies no API keys, paid-provider budget or cloud publication authorization.

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
