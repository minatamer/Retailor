# Retailor

Retailor is a clothing-only ecommerce demo: upload photos, review the AI-drafted catalogue, then let Tailor guide template, colour, typography and optional logo choices with a live preview. Three coherent three-page templates, four themes and three typography families produce 36 curated looks. Storefront and owner dashboard share one bounded browser workspace with product CRUD, bag/stock, simulated orders, returns/refunds, expenses, scenarios, exact chart evidence, export/reset and expiry. No database, checkout or shipping provider is involved.

The fifteen shipped sample photos are original AI-generated clothing assets with a checked manifest/provenance. Every deliberate new public sample draft requires fresh live recognition; development output is visibly a fixture. Every product needs a validated available photo, including Tailor-created products. A wordmark is the default; optional three-logo generation follows confirmed colour/typography. English/USD are the baseline; optional dated EUR conversion applies to storefront display while owner finances stay USD.

The local demo is implemented in fake/paid-off mode. Actual paid-provider/account/billing/retention, owner/physical and hosted acceptance remain pending. Production rejects fake mode and safely disables paid operations without accepted prerequisites. Local Linux images and release files do not imply publication. See the [ticket queue](docs/tickets/README.md) for actual evidence.

## Run locally

Use Node **24.19.0** and pinned pnpm **11.25.0**. Run `pnpm install --frozen-lockfile`, then `pnpm dev:backend` and `pnpm dev:frontend` in separate terminals. Open [Retailor on 4310](http://127.0.0.1:4310); backend liveness is [4311 /v1/health](http://127.0.0.1:4311/v1/health). These dedicated ports avoid sibling apps on 3000/4000. Launchers check ownership/listeners and refuse occupied ports; they never select another port or stop an existing service.

No key/env file is required for fake development. Optional ignored `apps/frontend/.env.local` and `apps/backend/.env.local` load through normal app startup; committed `.env.example` files have safe defaults/blank secrets. Dev launchers force fake/paid-off inherited flags without changing the parent environment. Do not read sibling env files. Stop the **owning terminal** with Ctrl+C and verify its listener/process tree; never kill by executable name or port alone.

`pnpm check` runs format, lint, strict app/test types, executable boundaries, isolated unpaid tests and both production builds. `pnpm build` compiles public workspace packages before apps. Development `.next-dev` stays separate from production `.next`. After a build, `pnpm start:backend` and `pnpm start:frontend` preserve normal explicit configuration in separate terminals; stop existing owned listeners first. Publication is separately authorized, never a build/test side effect.

## Documentation and release preparation

- [Detailed blueprint](docs/RETAILOR_DEMO_SOURCE_OF_TRUTH.md) and [visual PM overview](docs/RETAILOR_OVERVIEW.html)
- [Documentation navigation](docs/README.md), [22 tickets](docs/tickets/README.md) and actual [validation](docs/validation)
- [Frontend guide](apps/frontend/README.md), [backend guide](apps/backend/README.md), [foundation](docs/engineering/FOUNDATION.md) and [security](docs/engineering/SECURITY.md)
- [Image concurrency research/evidence](docs/engineering/IMAGE-CONCURRENCY.md)
- [Provider prerequisites](docs/operations/PROVIDERS.md), [evaluation worksheet](docs/operations/EVALUATION.md) and [manual Linux release/rollback packet](docs/operations/RELEASE.md)

The backbone is strict ESM TypeScript, Next/React and Express in a pnpm workspace. `packages/contracts` owns narrow public schemas; `packages/commerce` owns pure exact domain/financial rules. Next's fixed server bridge keeps backend identity/configuration private. Explicit backend startup alone loads environment and listens. Intended hosting is Cloud Run, Artifact Registry, Secret Manager and Cloudflare with an IAM-private backend; resource/domain ownership is unconfirmed. Docker helpers use isolated uniquely owned local containers, no host ports and no provider access. They are explicit manual commands outside ordinary checks. Archived [concept](docs/retailor.md) and [HTML](docs/retailor.html) remain historical references.
