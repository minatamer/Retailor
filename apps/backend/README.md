# Retailor backend

Express application factory and bounded runtime. Imports of config/runtime/factory modules never load secrets, listen or contact external services. `src/server.ts` is the explicit listening entry point.

From repository root run `pnpm dev:backend` after installation; use a separate terminal for the frontend. Port 4311 is dedicated to Retailor; startup refuses occupied ports. `pnpm start:backend` runs the compiled build. `.env.local` loads only at startup; committed `.env.example` has safe defaults and blank credentials. No env file or key is required for fake development.

GET `/v1/health` is process liveness; `/v1/ready` describes the selected runtime; `/v1/config` exposes only safe capabilities. The foundation is ready in fake mode, with individual unimplemented features unavailable. Live mode lacking accepted implementations/prerequisites is unavailable and never falls back to a fake. Production rejects fake mode and non-HTTPS frontend origin. No order/catalogue CRUD database exists.

Run focused injected HTTP tests via `pnpm exec vitest run apps/backend/src/http/app.test.ts`. All root checks are unpaid. Hosted IAM and provider verification remain separate external evidence. Shutdown closes the owned server only; never terminate another repo's process.

Normal `dev` launchers explicitly select development/fake/paid-off even if the shell inherited live flags; the parent environment is untouched. `start` preserves normal configuration for separately authorized live/production operation.
