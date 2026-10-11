# Retailor

Retailor is a clothing-only ecommerce demo in development: provide photos, review a live AI-drafted catalogue, then use Tailor’s interactive chat to create a beautiful storefront. The owner dashboard shares the same products and simulated business records.

## Project documentation

- [Detailed product, architecture and delivery blueprint](docs/RETAILOR_DEMO_SOURCE_OF_TRUTH.md)
- [Concise visual product overview](docs/RETAILOR_OVERVIEW.html)
- [22 detailed implementation tickets and dependency queue](docs/tickets/README.md)
- [Documentation navigation](docs/README.md)
- [Archived original concept](docs/retailor.md) and [archived concept preview](docs/retailor.html), retained as historical references

The accepted flow is clothing photos → fresh live AI draft → review → Tailor’s template/theme/type cards → optional brand details and three AI logo choices → storefront ↔ owner dashboard. The library contains three complete three-page templates, four colour themes and three typography presets. Every product requires a photo, including products created through Tailor’s inline upload form. A text wordmark is the default; logo generation is offered only after colour and typography confirmation.

The planned sample provides fifteen clothing photo assets and goes through live recognition on every deliberate new draft. AI-generated original photos are preferred; licensed stock is a researched alternative. Final photo production/acceptance is still pending. Healthy-profit, near-break-even and heavy-loss scenarios use the actual catalogue. English and USD are the baseline, with optional automatic EUR storefront display from a dated reference quote; owner finances remain USD.

One temporary browser workspace supports product CRUD, orders, stock, returns, refunds, costs and expenses without a database. Next.js/React, Express, strict TypeScript, pnpm, Docker and the sibling two-service Cloud Run infrastructure remain the intended backbone. Development uses declared fixtures with paid calls disabled. The 22 implementation tickets and their actual status are linked above. RTL-001 establishes the local workspace and safe runtime; the rest of the product is under implementation. Paid and hosted acceptance remain pending without owner keys/cloud configuration. See the queue for current progress.

## Local development

Use Node 24 and pinned pnpm 11.25.0. Run `pnpm install --frozen-lockfile`, then `pnpm dev:backend` and `pnpm dev:frontend` in separate terminals. Retailor uses dedicated [frontend 4310](http://127.0.0.1:4310) and backend 4311 to avoid other repos on 3000/4000. No keys or env file are required for default fake/paid-off development. Launchers refuse occupied ports and never stop other services.

`pnpm check` runs formatting, lint, strict app/test types, executable boundaries, isolated unpaid tests and both production builds. Development `.next-dev` is separate from production `.next`. Read the [foundation guide](docs/engineering/FOUNDATION.md), [frontend guide](apps/frontend/README.md) and [backend guide](apps/backend/README.md) for configuration/ownership. Individual unimplemented capabilities remain unavailable; these foundation pages are not the finished storefront.
