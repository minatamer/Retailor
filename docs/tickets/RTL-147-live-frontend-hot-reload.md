# RTL-147 — frontend hot reload with live configuration

17 October 2026. Status: implemented and running locally; scoped read-only review has no actionable findings. Next dev is active, the existing browser reports HMR connected, and the config bridge still reports live/paid-enabled. Tests remain deferred. The owner explicitly requests frontend hot reload while preserving paid mode and skipping tests for now.

Acceptance:

1. Add a documented `pnpm dev:frontend:live` command that runs Next's development server with the existing app-local environment, preserving APP_ENV and paid/fake configuration. Leave the ordinary fake/paid-off development defaults unchanged.
2. Keep the live workspace/requesters and existing safeguards in the new mode. Do not select development fixtures or expose design references just because Next development compilation is active. Use `.next-dev` for development output and retain `.next` for production.
3. Retain dedicated port checks, bind the development server to loopback and preserve the existing production startup behavior. Switch only the verified local frontend to the new command, leaving the current paid backend and browser data intact. Verify non-metered startup/config readiness without paid operations.
4. Preserve RTL-144–146 work, record a scoped read-only review and actual operational evidence, and defer tests/gates as requested. No secret inspection/configuration change, paid API call, deployment, staging, commit or delegation.

Precision: [allocation](../commit-plans/RTL-147.md), [validation](../validation/RTL-147.md), owner request/test deferral, current launchers/manifests, frontend `design-preview.server.ts`/demo composition, root/frontend instructions, retained RTL-023 launch/provider/privacy controls and installed Next configuration-phase/Turbopack guidance.
