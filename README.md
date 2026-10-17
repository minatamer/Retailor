<div align="center">

# Retailor

**Your clothing. A beautiful storefront. An insightful dashboard.**

Personalize it with Tailor beside you.

[The experience](#the-experience) · [Run locally](#run-locally) · [Project guide](#project-guide)

<img src="docs/assets/retailor-overview.png" width="1200" alt="Retailor editorial artwork: navy and lime typography reading Bring your products. Leave the rest to us., with blue jeans, an ivory shirt, fashion photo prints, the Tailor star and an illustrative dashboard chart." />

</div>

A few clothing photos. A brand that feels like yours. A place to see how it all comes together.

Retailor is an interactive clothing ecommerce demo that takes your garments from photos to a reviewable catalogue, a personalized storefront and a connected owner dashboard. Tailor stays beside you through the experience: shaping the design, helping shoppers explore products and making the numbers easier to understand.

## The experience

| Start with           | Make it yours                                                                                                                                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Your clothes**     | Upload garment photos or explore the supplied sample collection. Review drafted names, descriptions and colours, then adjust size, price and stock defaults before including products in your store.               |
| **Your style**       | Mix Home, Collection and Product layouts from three design families. Choose from five palettes and three typography families, name your store and keep a wordmark or explore three optional local logo directions. |
| **Your storefront**  | Browse the collection, open products, choose options and build a bag. Garment cards in Tailor chat include small photos and open the referenced product.                                                           |
| **Your perspective** | Move into the owner dashboard for connected garments, orders, returns, refunds and expenses. Hover over chart points for values and open the records behind a day or figure.                                       |

The same workspace connects the shopping experience and the business view. A verified sandbox checkout return places a local demo order once and updates its bag, stock and owner records.

## Tailor, beside you

Ask for a different colour palette. Find jeans within a budget. Understand the day's operating profit. Prepare an expense for review.

Tailor works with the current store and the role you are using. Supported requests can open products, filter the collection, preview a design or prepare a reviewed action. Source cards connect replies to the relevant garments and records, so you can keep exploring from the conversation.

Every product needs an available, validated photo. Catalogue drafts and prepared changes stay reviewable; the assistant is part of the workflow, with the actual limited live results documented in the [walkthrough evidence](docs/validation/RTL-138.md).

## Run locally

Use **Node 24.19.0** and **pnpm 11.25.0**.

```sh
pnpm install --frozen-lockfile
```

Start the backend and frontend in separate terminals:

```sh
pnpm dev:backend
```

```sh
pnpm dev:frontend
```

Open [Retailor on port 4310](http://127.0.0.1:4310). Backend liveness is available at [port 4311 /v1/health](http://127.0.0.1:4311/v1/health).

Development starts with fake AI and paid operations off; no API key or environment file is required. The launchers enforce these defaults and check the dedicated ports before starting. They refuse occupied ports instead of selecting replacements or stopping another service.

Optional app-local configuration loads from ignored `apps/frontend/.env.local` and `apps/backend/.env.local` files. Committed `.env.example` files contain safe defaults and blank secrets. For live recognition/chat and checkout prerequisites, use the [backend guide](apps/backend/README.md), [provider guide](docs/operations/PROVIDERS.md) and [sandbox checkout guide](docs/operations/CHECKOUT-STORAGE.md).

Stop the owning terminal with **Ctrl+C** and verify its listener/process tree before restarting. Never stop another app by executable name or port alone.

### Quality checks and production builds

```sh
pnpm check
```

This runs formatting, lint, strict app/test types, import boundaries, isolated unpaid unit tests and both production builds. `pnpm build` compiles the public workspace packages before the apps. Development output in `.next-dev` stays separate from production `.next`.

After building, `pnpm start:backend` and `pnpm start:frontend` run in separate terminals with normal explicit configuration. Stop existing owned listeners first. Production rejects fake AI; live availability depends on the paid master and required credentials. See [provider operations](docs/operations/PROVIDERS.md) for configuration and admission limits.

For frontend hot reload with an already-running live backend, use `pnpm dev:frontend:live`. This explicit mode preserves app-local configuration and uses the live workspace on [4310](http://127.0.0.1:4310); it does not force paid mode on or change backend settings. It binds to loopback and keeps development output in `.next-dev`. Ordinary `pnpm dev:frontend` retains its fake/paid-off defaults.

## Inside the demo

- **Photos:** twenty supplied sample images have recorded provenance. Each deliberate public sample draft requires fresh live recognition; fake development uses explicit fixtures. Photo recognition can need grouping corrections during review.
- **Branding:** a wordmark is the default. Optional logos use bundled fonts and three authored local compositions in every app mode, with spelling review and all-page preview before selection. See the [logo policy](docs/engineering/LOGOS.md).
- **Commerce:** business activity is fictional. Stripe sandbox checkout makes no real charge or shipment; its selected photo sharing, storage and return behavior are documented in the [checkout guide](docs/operations/CHECKOUT-STORAGE.md).
- **Workspace:** storefront and dashboard share one bounded browser session with restore, export, reset and expiry. English/USD is the baseline; optional dated EUR conversion changes storefront display while owner finances remain USD. See the [workspace lifecycle](docs/engineering/LIFECYCLE.md).
- **Artwork:** the README hero is generated editorial artwork. Actual interface behavior and provider results are recorded separately in validation.

## Built with

| Layer                            | Responsibility                                                                                                                                  |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Next.js + React**              | Storefront, owner dashboard and one bounded session controller. Fixed server bridge operations keep backend identity and configuration private. |
| **Express**                      | Explicit startup, validated operation routes and injected providers. Live-provider failure remains distinct from development fixtures.          |
| **`packages/contracts`**         | Narrow browser-safe public schemas shared across the workspace.                                                                                 |
| **`packages/commerce`**          | Pure, exact domain and financial rules behind the connected records and charts.                                                                 |
| **pnpm + strict ESM TypeScript** | Workspace builds, public package boundaries and shared quality gates.                                                                           |

## Project guide

| Read                                                                                                                                                               | For                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| [Frontend](apps/frontend/README.md) · [Backend](apps/backend/README.md)                                                                                            | App setup, commands and configuration.                                                                     |
| [Documentation map](docs/README.md) · [Product blueprint](docs/RETAILOR_DEMO_SOURCE_OF_TRUTH.md) · [Visual overview](docs/RETAILOR_OVERVIEW.html)                  | Product scope, architecture and the original design story. Later ticket decisions govern revised behavior. |
| [Foundation](docs/engineering/FOUNDATION.md) · [Security](docs/engineering/SECURITY.md)                                                                            | Boundaries, runtime design and retained controls.                                                          |
| [Recognition](docs/engineering/RECOGNITION.md) · [Image concurrency](docs/engineering/IMAGE-CONCURRENCY.md)                                                        | Photo processing, grouping and bounded work.                                                               |
| [Tickets](docs/tickets/README.md) · [Validation records](docs/validation)                                                                                          | Implementation decisions, actual checks and remaining limitations.                                         |
| [Release status](docs/operations/RELEASE-STATUS.md) · [Hosted verification](docs/operations/HOSTED-VERIFICATION.md) · [Release packet](docs/operations/RELEASE.md) | Operator evidence, deployment prerequisites and rollback preparation.                                      |
| [Provider operations](docs/operations/PROVIDERS.md) · [Evaluation worksheet](docs/operations/EVALUATION.md)                                                        | Live configuration and provider evaluation.                                                                |

The current application passes all six local quality gates, including **671 unit tests**. The owner reports **full manual testing passes** after the RTL-144–153 revisions; the [17 October signoff](docs/validation/MANUAL-2026-10-17.md) records acceptance and the remaining manually correctable F19 colourway link. The final live run accepts the blue jeans front/back and white/black tee pairs, with [actual results](docs/validation/RTL-153.md) retained alongside earlier failures. Current public/paid release acceptance, refreshed Linux/image/scanner evidence, hosted ingress/account-cost enforcement and physical-device acceptance remain unverified. Local results do not imply deployment approval.
