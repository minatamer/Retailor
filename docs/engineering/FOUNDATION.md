# Retailor foundation

RTL-001 introduces an ESM pnpm workspace, strict TypeScript, Next/React, Express and browser-safe Zod contracts. Pure money parses decimal strings into integer USD cents without floating-point multiplication. Public package subpath exports build before consumers; no aliases reach into another package source.

Pinned direct runtime dependencies: Next 16.4.0, React/React DOM 19.3.0, Express 5.3.0, Zod 4.6.5. Installed Node is 24.19.0 and pnpm 11.25.0. TypeScript 6.0.3 is selected because verified TypeScript ESLint 8.71.1 supports `<6.1.0`; the currently advertised TypeScript 7 is outside that supported range. Exact lockfile/strict peer and engine checks preserve compatibility. Only esbuild and Sharp native build scripts are allow-listed. Package metadata was verified against the official npm registry during execution.

Compatibility references: [Next installation](https://nextjs.org/docs/app/getting-started/installation), [Express 5 migration](https://expressjs.com/en/guide/migrating-5/), [Node releases](https://github.com/nodejs/Release). The fixed metadata identity flow follows [Cloud Run service-to-service authentication](https://docs.cloud.google.com/run/docs/authenticating/service-to-service); it is prepared locally and not verified against a deployed service.

## Local ownership

Existing 127.0.0.1 ports 3000 and 4000 belong to other local services. The owner's latest instruction requires avoiding them, so Retailor uses frontend 4310 and backend 4311. No unrelated process was stopped. Configuration changes must update both canonical frontend origin and fixed backend destination. Launchers refuse occupied ports; they do not search for another port silently.

Root commands: `pnpm install --frozen-lockfile`, `pnpm dev:backend`, `pnpm dev:frontend`, `pnpm start:backend`, `pnpm start:frontend`; settled gates `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm check:boundaries`, `pnpm test:unit`, `pnpm build`, aggregated `pnpm check`. Formatting covers implementation/configuration files; retained concept/research documents are maintained separately. Development and production Next output directories are independent.

## Capability and evidence

Fake mode and paid-off are committed defaults. Foundation readiness means the selected safe runtime can serve health/config, not that later features are implemented. Vision/Tailor/logos/EUR remain individually unavailable until their owning tickets connect them. Production fake mode is rejected; live missing prerequisites fails closed. Public config contains no keys, private destination, audience or identity. Tests override inherited paid flags before imports and deny external HTTP/HTTPS/fetch.

Actual check and validation evidence is in `docs/validation/RTL-001.md`. Current work is local; CI hosting, provider quality, production metadata identity and Linux/cloud artifacts require their own actual checks. No database, queue, upload bucket, third worker or provider client is introduced by foundation imports.

Normal `dev` launchers explicitly select development/fake/paid-off even if the shell inherited live flags; the parent environment is untouched. `start` preserves normal configuration for separately authorized live/production operation.
