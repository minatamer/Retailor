# Retailor

Retailor is a planned clothing-only ecommerce demo: provide photos, review a live AI-drafted catalogue, then use Tailor’s interactive chat to create a beautiful storefront. The owner dashboard shares the same products and simulated business records.

## Project documentation

- [Detailed product, architecture and delivery blueprint](docs/RETAILOR_DEMO_SOURCE_OF_TRUTH.md)
- [Concise visual product overview](docs/RETAILOR_OVERVIEW.html)
- [22 detailed implementation tickets and dependency queue](docs/tickets/README.md)
- [Documentation navigation](docs/README.md)
- [Archived original concept](docs/retailor.md) and [archived concept preview](docs/retailor.html), retained as historical references

The accepted flow is clothing photos → fresh live AI draft → review → Tailor’s template/theme/type cards → optional brand details and three AI logo choices → storefront ↔ owner dashboard. The library contains three complete three-page templates, four colour themes and three typography presets. Every product requires a photo, including products created through Tailor’s inline upload form. A text wordmark is the default; logo generation is offered only after colour and typography confirmation.

The planned sample provides fifteen clothing photo assets and goes through live recognition on every deliberate new draft. AI-generated original photos are preferred; licensed stock is a researched alternative. Final photo production/acceptance is still pending. Healthy-profit, near-break-even and heavy-loss scenarios use the actual catalogue. English and USD are the baseline, with optional automatic EUR storefront display from a dated reference quote; owner finances remain USD.

One temporary browser workspace supports product CRUD, orders, stock, returns, refunds, costs and expenses without a database. Next.js/React, Express, strict TypeScript, pnpm, Docker and the sibling two-service Cloud Run infrastructure remain the intended backbone. Development uses declared fixtures with paid calls disabled. The 22 implementation tickets are planned and linked above. Application implementation and deployment have not started. [RTL-001](docs/tickets/RTL-001-initialize-workspace-contracts-and-safe-runtime.md) is the first eligible packet once implementation is authorized.
