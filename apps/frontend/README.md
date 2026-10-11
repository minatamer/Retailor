# Retailor frontend

Next App Router/React application. From repository root run `pnpm dev:frontend` in a separate terminal after the backend is healthy on port 4311. The launcher verifies dedicated frontend port 4310 is free and refuses an occupied port; it never auto-selects a port or terminates another process. Normal `.env.local` configuration is app-local and ignored; `.env.example` documents safe values. `pnpm start:frontend` runs the production build.

Development uses `.next-dev`; `pnpm build` writes `.next`, so release builds do not overwrite an active dev server. Browser URLs are relative `/api/retailor/v1/...`; private backend origin/audience and identity live only in server modules. The bridge allows known routes/methods, bounds actual request/response bytes, validates write origins, strips client cookies/auth and applies request deadlines. Hosted identity uses the fixed Cloud Run metadata endpoint with the same abort signal, no downloaded service-account key.

The initial `/` and `/demo` pages are foundation views, not completed product acceptance. Future feature tickets own the storefront, setup, copilot and dashboard. Run injected bridge checks through `pnpm exec vitest run apps/frontend/src/server/bridge.test.ts`; no metadata or provider request occurs in unpaid tests. Hosted invocation requires separate actual IAM evidence.

Normal `dev` launchers explicitly select development/fake/paid-off even if the shell inherited live flags; the parent environment is untouched. `start` preserves normal configuration for separately authorized live/production operation.
